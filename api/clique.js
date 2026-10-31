// POST /api/clique · { log_id } → marca que a conversa terminou num clique para o WhatsApp.
import { marcarClique } from "./_lib/registro.js";

export default async function handler(req, res) {
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.method !== "POST") return res.status(405).end();
  let corpo = req.body;
  if (typeof corpo === "string") { try { corpo = JSON.parse(corpo); } catch { corpo = {}; } }
  await marcarClique(corpo?.log_id);
  return res.status(204).end();
}
