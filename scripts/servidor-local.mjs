// Servidor de teste no computador: serve os arquivos e roda as funções de /api como a Vercel faria.
// Uso: npm run dev  →  http://localhost:4321
// Sem ANTHROPIC_API_KEY, /api/chat responde com a Dara de ensaio (DARA_ENSAIO=1), só para testar a tela.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORTA = Number(process.env.PORT || 4321);
const RAIZ = process.cwd();
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "application/xml" };
const ENSAIO = !process.env.ANTHROPIC_API_KEY || process.env.DARA_ENSAIO === "1";

function respostaVercel(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); return res; };
  return res;
}

async function ensaio(req, res) {
  const { validarConversa, conferirResposta } = await import("../api/_lib/dara.js");
  const { erro, mensagens } = validarConversa(req.body);
  if (erro) return res.status(erro === "limite_turnos" ? 429 : 400).json({ erro });
  const ultima = mensagens[mensagens.length - 1].content.toLowerCase();
  await new Promise((r) => setTimeout(r, 700));
  if (ultima.includes("erro")) return res.status(502).json({ erro: "indisponivel" });
  const bruta = ultima.includes("ombro")
    ? { reply: "Entendi, dor no ombro há um tempo incomoda mesmo. A clínica tem o Tratamento para dor, que atende ombros, joelho e coluna, e tudo começa por uma avaliação integrativa com a enfermeira Débora. Quer falar com a equipe para agendar?", suggested: [{ nome: "Avaliação integrativa", duracao: "30min", contexto: "ombro" }, { nome: "Tratamento para dor", duracao: "1h", contexto: "ombro" }] }
    : { reply: "[Modo de ensaio, sem IA] Me conta um pouco mais: o que você gostaria de cuidar?", suggested: [] };
  const r = conferirResposta(bruta);
  return res.status(200).json({ ...r, log_id: null });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    let corpo = "";
    for await (const parte of req) corpo += parte;
    try { req.body = corpo ? JSON.parse(corpo) : {}; } catch { req.body = corpo; }
    respostaVercel(res);
    const nome = url.pathname.slice(5).replace(/[^a-z-]/g, "");
    if (nome === "chat" && ENSAIO) return ensaio(req, res);
    try {
      const { default: handler } = await import(`../api/${nome}.js`);
      return handler(req, res);
    } catch { res.statusCode = 404; return res.end(); }
  }
  let arquivo = path.join(RAIZ, decodeURIComponent(url.pathname));
  if (!arquivo.startsWith(RAIZ)) { res.statusCode = 403; return res.end(); }
  if (url.pathname === "/") arquivo = path.join(RAIZ, "index.html");
  else if (!path.extname(arquivo) && fs.existsSync(arquivo + ".html")) arquivo += ".html";
  fs.readFile(arquivo, (e, dados) => {
    if (e) { res.statusCode = 404; return res.end("não encontrado"); }
    res.setHeader("Content-Type", TIPOS[path.extname(arquivo)] || "application/octet-stream");
    res.end(dados);
  });
}).listen(PORTA, () => console.log(`Dalpino v2 em http://localhost:${PORTA}${ENSAIO ? "  (Dara em modo de ensaio, sem IA)" : ""}`));
