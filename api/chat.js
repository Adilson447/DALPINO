// POST /api/chat · { messages: [{ role, content }] } → { reply, suggested, whatsapp_text, log_id }
import { validarConversa, perguntarDara, LIMITES } from "./_lib/dara.js";
import { hashIp, dentroDoLimite, registrarConversa } from "./_lib/registro.js";

const ORIGENS = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });

  const origem = req.headers.origin;
  if (ORIGENS.length && origem && !ORIGENS.includes(origem)) return res.status(403).json({ erro: "origem" });

  let corpo = req.body;
  if (typeof corpo === "string") { try { corpo = JSON.parse(corpo); } catch { corpo = null; } }
  const { erro, mensagens } = validarConversa(corpo);
  if (erro === "limite_turnos") return res.status(429).json({ erro, limite: LIMITES.turnos });
  if (erro) return res.status(400).json({ erro, limite: LIMITES.caracteres });

  if (!(await dentroDoLimite(hashIp(req)))) return res.status(429).json({ erro: "limite_hora" });

  try {
    const r = await perguntarDara(mensagens);
    if (r.recusa) {
      return res.status(200).json({ reply: "Sou a assistente virtual da clínica e não sei falar sobre isso. Posso te ajudar a escolher um procedimento?", suggested: [], whatsapp_text: "Olá! Vim pelo site e quero agendar uma avaliação.", log_id: null });
    }
    const pergunta = mensagens[mensagens.length - 1].content;
    const log_id = await registrarConversa(pergunta, r.categoria || r.suggested[0]?.categoria);
    return res.status(200).json({ reply: r.reply, suggested: r.suggested, whatsapp_text: r.whatsapp_text, log_id });
  } catch (e) {
    console.error("dara", e?.status || "", e?.message);
    return res.status(502).json({ erro: "indisponivel" });
  }
}
