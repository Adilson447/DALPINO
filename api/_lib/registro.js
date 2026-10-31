// Limite de uso por visitante e registro anônimo das conversas (Supabase, via REST).
// Sem SUPABASE_URL/SUPABASE_SERVICE_KEY, o limite cai para a memória da função e nada é registrado.
import crypto from "node:crypto";

const URL_SB = process.env.SUPABASE_URL;
const CHAVE_SB = process.env.SUPABASE_SERVICE_KEY;
const SAL = process.env.HASH_SALT || "troque-este-sal";
export const POR_HORA = Number(process.env.CHAT_LIMITE_HORA || 20);

export function hashIp(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
  return crypto.createHash("sha256").update(SAL + ip).digest("hex").slice(0, 32);
}

async function supabase(caminho, corpo, metodo = "POST") {
  const r = await fetch(`${URL_SB}/rest/v1/${caminho}`, {
    method: metodo,
    headers: { apikey: CHAVE_SB, Authorization: `Bearer ${CHAVE_SB}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  return r.json();
}

const memoria = new Map();
// Conta a mensagem e devolve true se o visitante ainda está dentro do limite da hora.
export async function dentroDoLimite(hash) {
  const janela = new Date().toISOString().slice(0, 13);
  if (URL_SB && CHAVE_SB) {
    try {
      const total = await supabase("rpc/contar_mensagem", { p_hash: hash, p_janela: janela });
      return Number(total) <= POR_HORA;
    } catch { /* cai para a memória */ }
  }
  const chave = `${hash}:${janela}`;
  const total = (memoria.get(chave) || 0) + 1;
  memoria.set(chave, total);
  if (memoria.size > 5000) memoria.clear();
  return total <= POR_HORA;
}

// Tira telefone, e-mail e CPF do texto antes de guardar (LGPD).
export function anonimizar(texto) {
  return String(texto)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, "[cpf]")
    .replace(/(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g, "[telefone]")
    .slice(0, 500);
}

export async function registrarConversa(pergunta, procedimento) {
  if (!URL_SB || !CHAVE_SB) return null;
  try {
    const [linha] = await supabase("chat_logs", { pergunta: anonimizar(pergunta), procedimento_sugerido: procedimento || null, clicou_whatsapp: false });
    return linha?.id ?? null;
  } catch { return null; }
}

export async function marcarClique(id) {
  if (!URL_SB || !CHAVE_SB || !/^[0-9a-f-]{36}$/i.test(String(id))) return;
  await supabase(`chat_logs?id=eq.${id}`, { clicou_whatsapp: true }, "PATCH").catch(() => {});
}
