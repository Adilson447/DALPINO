// Núcleo da Dara: monta o prompt a partir do catalogo.json, chama o Claude
// e confere a resposta antes de devolver ao site. Usado por api/chat.js e pelos testes.
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const RAIZ = process.cwd();
export const MODELO = "claude-haiku-5-5";
export const WHATSAPP = "5511934764275";
export const LIMITES = { turnos: 8, caracteres: 500 };

export const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/catalogo.json"), "utf8"));

const porNome = new Map();
for (const c of catalogo.categorias) for (const i of c.itens) porNome.set(normalizar(i.nome), { ...i, categoria: c.nome });

export function normalizar(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function catalogoEmTexto() {
  return catalogo.categorias.map((c) =>
    `${c.nome}${c.comeca_por_avaliacao ? " (começa por avaliação)" : ""}:\n` +
    c.itens.map((i) => `- ${i.nome} · ${i.duracao}${i.detalhe ? " · " + i.detalhe : ""}`).join("\n")
  ).join("\n\n");
}

// Prompt estável (vai para o cache); o horário de agora fica num bloco separado depois dele.
export const PROMPT = fs.readFileSync(path.join(RAIZ, "api/system-prompt.md"), "utf8").replace("{{CATALOGO}}", catalogoEmTexto());

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "suggested", "categoria"],
  properties: {
    reply: { type: "string" },
    categoria: { type: "string" },
    suggested: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nome", "duracao", "contexto"],
        properties: { nome: { type: "string" }, duracao: { type: "string" }, contexto: { type: "string" } },
      },
    },
  },
};

export function agoraEmBraganca(data = new Date()) {
  const f = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false });
  const partes = Object.fromEntries(f.formatToParts(data).map((p) => [p.type, p.value]));
  const hora = Number(partes.hour) + Number(partes.minute) / 60;
  const dia = partes.weekday;
  const aberta = dia === "domingo" ? false : dia === "sábado" ? hora >= 8 && hora < 15 : hora >= 8 && hora < 20;
  return { texto: `${dia}, ${partes.hour}h${partes.minute}`, aberta };
}

// Valida a conversa que chega do navegador. Devolve { erro } ou { mensagens }.
export function validarConversa(corpo) {
  const msgs = corpo && Array.isArray(corpo.messages) ? corpo.messages : null;
  if (!msgs || msgs.length === 0) return { erro: "conversa_vazia" };
  const usuario = msgs.filter((m) => m && m.role === "user");
  if (usuario.length > LIMITES.turnos) return { erro: "limite_turnos" };
  const limpas = [];
  for (const m of msgs.slice(-LIMITES.turnos * 2)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return { erro: "formato" };
    const texto = m.content.trim();
    if (!texto) continue;
    if (m.role === "user" && texto.length > LIMITES.caracteres) return { erro: "mensagem_longa" };
    limpas.push({ role: m.role, content: texto.slice(0, 1200) });
  }
  if (!limpas.length || limpas[limpas.length - 1].role !== "user") return { erro: "formato" };
  if (limpas[0].role !== "user") limpas.shift();
  return { mensagens: limpas };
}

const PRECO = /R\$\s?\d|\d+\s?reais|a partir de\s+\d|\bdesconto\b|\bpromo[cç][aã]o\b/i;
const PROMESSA = /t[eê]m solu[cç][aã]o|resultado (garantido|imediato)|\bgarant(e|imos|ido)\b|\b100\s?%|\bdefinitiv[oa]\b|\bcura\b/i;
const RESPOSTA_PRECO = "Os valores a equipe passa na avaliação, porque dependem do seu caso. Posso te ajudar a escolher o procedimento?";

export function textoWhatsapp(sugeridos) {
  // A avaliação já está no "Quero agendar uma avaliação"; o nome que interessa é o do tratamento.
  const s = sugeridos.find((x) => !/^avalia/i.test(x.nome)) || sugeridos[0];
  if (!s) return "Olá! Conversei com a assistente do site e quero agendar uma avaliação.";
  const ctx = s.contexto ? ` (${s.contexto})` : "";
  return `Olá! Conversei com a assistente do site e me interessei por ${s.nome}${ctx}. Quero agendar uma avaliação.`;
}

// Confere o que o modelo devolveu: só procedimentos que existem, nada de preço, nada de link.
export function conferirResposta(bruta) {
  let reply = String(bruta.reply || "").replace(/https?:\/\/\S+/g, "").trim();
  if (!reply) reply = "Não consegui entender bem. Pode me contar com outras palavras o que te incomoda?";
  if (PRECO.test(reply)) reply = RESPOSTA_PRECO;
  // Promessa que escapa do prompt de vez em quando: corta só a frase que a contém.
  const frases = reply.match(/[^.!?]+[.!?]*\s*/g) || [reply];
  const semPromessa = frases.filter((f) => !PROMESSA.test(f)).join("").trim();
  reply = semPromessa || "Quem pode avaliar isso com segurança é a equipe da clínica. Quer falar com ela pelo WhatsApp?";
  const sugeridos = [];
  for (const s of Array.isArray(bruta.suggested) ? bruta.suggested.slice(0, 3) : []) {
    const item = porNome.get(normalizar(s.nome));
    if (!item || sugeridos.some((x) => x.nome === item.nome)) continue;
    const contexto = String(s.contexto || "").replace(/[^\p{L}\p{N} ,-]/gu, "").trim().slice(0, 30);
    sugeridos.push({ nome: item.nome, duracao: item.duracao, categoria: item.categoria, contexto });
  }
  return {
    reply,
    suggested: sugeridos.map(({ nome, duracao, categoria }) => ({ nome, duracao, categoria })),
    whatsapp_text: textoWhatsapp(sugeridos),
  };
}

let cliente;
export async function perguntarDara(mensagens, agora = agoraEmBraganca()) {
  cliente ??= new Anthropic({ maxRetries: 1, timeout: 20_000 });
  const resposta = await cliente.messages.create({
    model: MODELO,
    max_tokens: 400,
    thinking: { type: "disabled" },
    output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
    system: [
      { type: "text", text: PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: `Agora em Bragança Paulista: ${agora.texto} (clínica ${agora.aberta ? "aberta" : "fechada"}). Fora do horário, continue respondendo normalmente e lembre o horário só se fizer sentido.` },
    ],
    messages: mensagens,
  });
  if (resposta.stop_reason === "refusal") return { recusa: true, uso: resposta.usage };
  const texto = resposta.content.find((b) => b.type === "text")?.text;
  if (!texto || resposta.stop_reason === "max_tokens") throw new Error(`resposta_incompleta:${resposta.stop_reason}`);
  const conferida = conferirResposta(JSON.parse(texto));
  return { ...conferida, categoria: conferida.suggested[0]?.categoria || "", uso: resposta.usage };
}
