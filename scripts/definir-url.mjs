// Troca o endereço provisório pelo definitivo em todos os arquivos do site.
// Uso: SITE_URL=https://dalpinoclinic.com.br npm run definir-url
import fs from "node:fs";

const PROVISORIO = "https://dalpino-clinic-lp.vercel.app";
const novo = (process.env.SITE_URL || process.argv[2] || "").replace(/\/$/, "");
if (!/^https:\/\/[\w.-]+$/.test(novo)) { console.error("Informe SITE_URL=https://seu-dominio"); process.exit(1); }

for (const arquivo of ["index.html", "privacidade.html", "robots.txt", "sitemap.xml"]) {
  const antes = fs.readFileSync(arquivo, "utf8");
  const depois = antes.split(PROVISORIO).join(novo);
  fs.writeFileSync(arquivo, depois);
  console.log(`${arquivo}: ${antes.split(PROVISORIO).length - 1} troca(s)`);
}
