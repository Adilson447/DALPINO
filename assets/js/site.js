// Dalpino Clinic · v2 — catálogo (lido de data/catalogo.json), chat da Dara e detalhes da página.
(() => {
  "use strict";
  document.documentElement.classList.add("js");

  const ZAP = "https://wa.me/5511934764275";
  const LIMITE_TURNOS = 8;
  const LIMITE_CARACTERES = 500;
  const linkZap = (texto) => `${ZAP}?text=${encodeURIComponent(texto)}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normalizar = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const celular = () => window.matchMedia("(max-width: 899px)").matches;
  const poucoMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const guardar = { ler(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } }, gravar(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* navegação privada */ } } };

  // Links de WhatsApp com mensagem pronta
  document.querySelectorAll("[data-zap]").forEach((a) => { a.href = linkZap(a.dataset.zap); a.target = "_blank"; a.rel = "noopener"; });

  // ---------------- catálogo ----------------
  const elCatalogo = document.getElementById("catalogo");
  const elFiltros = document.getElementById("filtros");
  const elBusca = document.getElementById("busca-proc");
  const elStatus = document.getElementById("busca-status");
  const elVazio = document.getElementById("vazio");
  let categorias = [];
  let filtro = "todas";

  function marcar(texto, termo) {
    const t = esc(texto);
    if (!termo) return t;
    const alvo = normalizar(texto);
    const i = alvo.indexOf(termo);
    if (i < 0) return t;
    return esc(texto.slice(0, i)) + "<mark>" + esc(texto.slice(i, i + termo.length)) + "</mark>" + esc(texto.slice(i + termo.length));
  }

  function montarCatalogo() {
    elFiltros.innerHTML =
      `<button type="button" aria-pressed="true" data-filtro="todas">Todas</button>` +
      categorias.map((c, n) => `<button type="button" aria-pressed="false" data-filtro="${c.id}" style="--cor-cat: var(--cat-${n + 1})"><span class="ponto" aria-hidden="true"></span>${esc(c.nome)}</button>`).join("");

    elCatalogo.innerHTML = categorias.map((c, n) => `
      <article class="cat" id="cat-${c.id}" data-cat="${c.id}" style="--cor-cat: var(--cat-${n + 1})">
        <h3 class="cat-cab">
          <button type="button" class="cat-botao" aria-expanded="false" aria-controls="corpo-${c.id}">
            <span class="ponto" aria-hidden="true"></span>
            <span class="cat-nome">${esc(c.nome)}</span>
            <span class="cat-qtd" data-qtd>${c.itens.length} ${c.itens.length === 1 ? "procedimento" : "procedimentos"}</span>
            <svg class="ic" aria-hidden="true"><use href="#i-mais"/></svg>
          </button>
        </h3>
        <div class="cat-corpo" id="corpo-${c.id}" hidden>
          ${c.comeca_por_avaliacao ? `<p class="selo-aval">Começa por uma avaliação</p>` : ""}
          <ul class="itens">
            ${c.itens.map((i) => `
              <li class="item" data-busca="${esc(normalizar(i.nome + " " + (i.busca || "") + " " + c.nome))}">
                <div>
                  <span class="item-nome" data-nome="${esc(i.nome)}">${esc(i.nome)}</span><span class="item-dur"><span class="msg-rotulo">duração </span>${esc(i.duracao)}</span>
                  ${i.detalhe ? `<br><button type="button" class="item-mais" aria-expanded="false" aria-controls="d-${i.id}">Ver detalhe</button>` : ""}
                </div>
                <a class="item-agendar" href="${linkZap(`Olá! Vim pelo site e quero agendar: ${i.nome}.`)}" target="_blank" rel="noopener" aria-label="Agendar ${esc(i.nome)} pelo WhatsApp">Agendar <svg class="ic" aria-hidden="true"><use href="#i-seta"/></svg></a>
                ${i.detalhe ? `<p class="item-desc" id="d-${i.id}" hidden>${esc(i.detalhe)}</p>` : ""}
              </li>`).join("")}
          </ul>
        </div>
      </article>`).join("");
    elCatalogo.setAttribute("aria-busy", "false");
    abrirCategoria(elCatalogo.querySelector(".cat"), true);
  }

  function abrirCategoria(cat, abrir) {
    if (!cat) return;
    const b = cat.querySelector(".cat-botao");
    b.setAttribute("aria-expanded", String(abrir));
    cat.querySelector(".cat-corpo").hidden = !abrir;
  }

  elCatalogo.addEventListener("click", (e) => {
    const botao = e.target.closest(".cat-botao");
    if (botao) {
      const cat = botao.closest(".cat");
      const abrir = botao.getAttribute("aria-expanded") !== "true";
      if (abrir && celular() && !elBusca.value.trim()) elCatalogo.querySelectorAll(".cat").forEach((c) => c !== cat && abrirCategoria(c, false));
      abrirCategoria(cat, abrir);
      return;
    }
    const mais = e.target.closest(".item-mais");
    if (mais) {
      const desc = document.getElementById(mais.getAttribute("aria-controls"));
      const abrir = mais.getAttribute("aria-expanded") !== "true";
      mais.setAttribute("aria-expanded", String(abrir));
      mais.textContent = abrir ? "Ocultar detalhe" : "Ver detalhe";
      desc.hidden = !abrir;
    }
  });

  elFiltros.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-filtro]");
    if (!b) return;
    filtro = b.dataset.filtro;
    elFiltros.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    aplicarFiltros(true);
  });

  let espera;
  elBusca.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(() => aplicarFiltros(false), 120); });

  function aplicarFiltros(veioDoFiltro) {
    const termo = normalizar(elBusca.value);
    let total = 0;
    elCatalogo.querySelectorAll(".cat").forEach((cat) => {
      const daCategoria = filtro === "todas" || cat.dataset.cat === filtro;
      let achados = 0;
      cat.querySelectorAll(".item").forEach((item) => {
        const ok = daCategoria && (!termo || item.dataset.busca.includes(termo));
        item.hidden = !ok;
        const nome = item.querySelector(".item-nome");
        nome.innerHTML = marcar(nome.dataset.nome, termo);
        if (ok) achados++;
      });
      cat.hidden = achados === 0;
      const qtd = cat.querySelector("[data-qtd]");
      const n = termo ? achados : cat.querySelectorAll(".item").length;
      qtd.textContent = `${n} ${n === 1 ? "procedimento" : "procedimentos"}`;
      if (termo || (veioDoFiltro && filtro !== "todas")) abrirCategoria(cat, achados > 0);
      total += achados;
    });
    if (!termo && veioDoFiltro && filtro === "todas") elCatalogo.querySelectorAll(".cat").forEach((c, n) => abrirCategoria(c, n === 0));
    elVazio.hidden = total > 0;
    elStatus.textContent = termo ? (total ? `${total} ${total === 1 ? "procedimento encontrado" : "procedimentos encontrados"}` : "Nenhum procedimento encontrado") : "";
  }

  fetch("data/catalogo.json")
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((dados) => { categorias = dados.categorias; document.getElementById("prova-areas").textContent = categorias.length; montarCatalogo(); })
    .catch(() => {
      elCatalogo.setAttribute("aria-busy", "false");
      elCatalogo.innerHTML = `<div class="vazio"><p>Não conseguimos carregar o catálogo agora.</p><div class="vazio-acoes"><a class="botao botao-latao" href="${linkZap("Olá! Vim pelo site e gostaria de ver os procedimentos.")}" target="_blank" rel="noopener">Ver procedimentos no WhatsApp</a></div></div>`;
    });

  // ---------------- Dara ----------------
  const elDara = document.getElementById("dara");
  const elMsgs = document.getElementById("dara-msgs");
  const elForm = document.getElementById("dara-form");
  const elCampo = document.getElementById("dara-campo");
  const elEnviar = document.getElementById("dara-enviar");
  const elConta = document.getElementById("dara-conta");
  const elErro = document.getElementById("dara-erro");
  const elHorario = document.getElementById("dara-horario");
  const BOAS_VINDAS = "Olá! Eu sou a Dara, assistente virtual da Dalpino Clinic.\nMe conta o que te incomoda ou o que você gostaria de cuidar, e eu te ajudo a encontrar o procedimento certo.";
  const SUGESTOES = ["Tenho dor no ombro", "Quero cuidar da pele do rosto", "Minha sobrancelha é falhada"];

  let historico = guardar.ler("dara-historico") || [];   // [{role, content}] só texto
  let enviando = false;
  let quemAbriu = null;

  const turnosUsados = () => historico.filter((m) => m.role === "user").length;

  function clinicaAberta() {
    const f = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "numeric", minute: "numeric", hour12: false });
    const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
    const h = Number(p.hour) + Number(p.minute) / 60;
    const dia = normalizar(p.weekday).replace(".", "");
    if (dia.startsWith("dom")) return false;
    if (dia.startsWith("sab")) return h >= 8 && h < 15;
    return h >= 8 && h < 20;
  }

  function rolarFim() { elMsgs.scrollTop = elMsgs.scrollHeight; }

  function balao(papel, texto) {
    const d = document.createElement("div");
    d.className = `msg msg-${papel === "user" ? "voce" : "dara"}`;
    d.innerHTML = `<span class="msg-rotulo">${papel === "user" ? "Você disse:" : "Dara disse:"}</span>`;
    d.append(texto);
    elMsgs.append(d);
    rolarFim();
  }

  function chips(lista) {
    const d = document.createElement("div");
    d.className = "msg-chips";
    lista.forEach((t) => { const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.addEventListener("click", () => { d.remove(); enviar(t); }); d.append(b); });
    elMsgs.append(d);
  }

  function categoriaComAvaliacao(nomeCategoria) {
    const c = categorias.find((x) => x.nome === nomeCategoria);
    return c ? c.comeca_por_avaliacao : false;
  }

  function botaoZap(texto, logId, rotulo = "Conversar com a equipe no WhatsApp") {
    const a = document.createElement("a");
    a.className = "botao botao-latao";
    a.href = linkZap(texto);
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = rotulo;
    a.addEventListener("click", () => {
      if (logId && navigator.sendBeacon) navigator.sendBeacon("/api/clique", new Blob([JSON.stringify({ log_id: logId })], { type: "application/json" }));
    });
    return a;
  }

  function cartao(sugeridos, textoZap, logId) {
    const d = document.createElement("div");
    d.className = "cartao-proc";
    const aval = sugeridos.some((s) => categoriaComAvaliacao(s.categoria));
    d.innerHTML = `<p class="cartao-proc-rotulo">${sugeridos.length > 1 ? "Procedimentos sugeridos" : "Procedimento sugerido"}</p>
      <ul>${sugeridos.map((s) => `<li><strong>${esc(s.nome)}</strong><span>${esc(s.duracao)}</span></li>`).join("")}</ul>
      ${aval ? `<p class="selo-aval">Começa por uma avaliação</p>` : ""}`;
    d.append(botaoZap(textoZap, logId));
    elMsgs.append(d);
    rolarFim();
  }

  function aviso(texto, textoZap, rotulo) {
    const d = document.createElement("div");
    d.className = "msg-erro";
    d.append(texto);
    d.append(botaoZap(textoZap || "Olá! Vim pelo site e quero tirar uma dúvida.", null, rotulo || "Falar com a equipe no WhatsApp"));
    elMsgs.append(d);
    rolarFim();
  }

  function limiteAtingido() {
    elCampo.disabled = true;
    elEnviar.disabled = true;
    aviso("Chegamos ao limite desta conversa. Para continuar, fale com a equipe no WhatsApp.");
  }

  function iniciarConversa() {
    elMsgs.innerHTML = "";
    balao("assistant", BOAS_VINDAS);
    if (!historico.length) chips(SUGESTOES);
    historico.forEach((m) => balao(m.role, m.content));
    if (turnosUsados() >= LIMITE_TURNOS) limiteAtingido();
    if (!clinicaAberta()) {
      elHorario.hidden = false;
      elHorario.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-relogio"/></svg><span>A clínica está fechada agora. Atendimento: seg a sex 08h–20h, sábado 08h–15h. Pode conversar comigo; a equipe responde o WhatsApp no próximo horário.</span>`;
    }
  }

  function abrirDara(pergunta) {
    quemAbriu = document.activeElement;
    elDara.hidden = false;
    document.body.classList.add("dara-aberta");
    if (!elMsgs.childElementCount) iniciarConversa();
    if (pergunta) enviar(pergunta); else elCampo.focus();
  }

  function fecharDara() {
    elDara.hidden = true;
    document.body.classList.remove("dara-aberta");
    if (quemAbriu && document.contains(quemAbriu)) quemAbriu.focus();
  }

  document.addEventListener("click", (e) => {
    const abre = e.target.closest("[data-abrir-dara]");
    if (abre) { abrirDara(); return; }
    const sug = e.target.closest("[data-pergunta]");
    if (sug) { abrirDara(sug.dataset.pergunta); return; }
    if (e.target.closest("[data-fechar-dara]") || e.target === elDara) fecharDara();
  });

  elDara.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { fecharDara(); return; }
    if (e.key !== "Tab") return;
    const focaveis = [...elDara.querySelectorAll("button:not([disabled]), a[href], textarea:not([disabled])")].filter((x) => x.offsetParent !== null);
    const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });

  function ajustarCampo() {
    elCampo.style.height = "auto";
    elCampo.style.height = Math.min(elCampo.scrollHeight, 120) + "px";
    const n = elCampo.value.length;
    elConta.textContent = `${n}/${LIMITE_CARACTERES}`;
    const longo = n > LIMITE_CARACTERES;
    elCampo.setAttribute("aria-invalid", String(longo));
    elErro.textContent = longo ? "Use até 500 caracteres." : "";
  }
  elCampo.addEventListener("input", ajustarCampo);
  elCampo.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); elForm.requestSubmit(); } });
  elForm.addEventListener("submit", (e) => { e.preventDefault(); enviar(elCampo.value); });

  async function enviar(texto) {
    texto = String(texto || "").trim();
    if (enviando) return;
    if (!texto) { elErro.textContent = "Escreva sua mensagem antes de enviar."; elCampo.focus(); return; }
    if (texto.length > LIMITE_CARACTERES) { ajustarCampo(); elCampo.focus(); return; }
    if (turnosUsados() >= LIMITE_TURNOS) { limiteAtingido(); return; }

    elMsgs.querySelectorAll(".msg-chips").forEach((c) => c.remove());
    elErro.textContent = "";
    elCampo.value = "";
    ajustarCampo();
    historico.push({ role: "user", content: texto });
    balao("user", texto);

    enviando = true;
    elEnviar.disabled = true;
    elCampo.setAttribute("aria-busy", "true");
    const dig = document.createElement("div");
    dig.className = "digitando";
    dig.setAttribute("role", "status");
    dig.innerHTML = `<span class="msg-rotulo">Dara está digitando</span><i></i><i></i><i></i>`;
    elMsgs.append(dig);
    rolarFim();

    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: historico }) });
      const dados = await r.json().catch(() => ({}));
      dig.remove();
      if (r.status === 429) {
        historico.pop();
        if (dados.erro === "limite_hora") aviso("Recebi muitas mensagens em pouco tempo. Tente de novo mais tarde ou fale com a equipe no WhatsApp.");
        else limiteAtingido();
        return;
      }
      if (!r.ok || !dados.reply) throw new Error(dados.erro || r.status);
      historico.push({ role: "assistant", content: dados.reply });
      balao("assistant", dados.reply);
      if (dados.suggested && dados.suggested.length) cartao(dados.suggested, dados.whatsapp_text, dados.log_id);
      if (turnosUsados() >= LIMITE_TURNOS) limiteAtingido();
    } catch {
      dig.remove();
      historico.pop();
      aviso("Não consegui responder agora. Fale com a equipe no WhatsApp.", `Olá! Vim pelo site e queria saber sobre: ${texto.slice(0, 200)}`);
    } finally {
      guardar.gravar("dara-historico", historico);
      enviando = false;
      elEnviar.disabled = elCampo.disabled;
      elCampo.removeAttribute("aria-busy");
      if (!elCampo.disabled) elCampo.focus();
    }
  }

  // ---------------- detalhes ----------------
  if (!poucoMovimento && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".hero, .dara-faixa").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }), { threshold: 0.12 });
    document.querySelectorAll(".rv").forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll(".rv").forEach((el) => el.classList.add("on"));
  }

  // No celular, os botões flutuantes saem de cena onde a página já tem os mesmos convites
  // (o topo, com "Agendar" e a Dara; o catálogo, com um "Agendar" por item), para não cobrir botões.
  if ("IntersectionObserver" in window) {
    const visiveis = new Set();
    const recolher = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? visiveis.add(e.target) : visiveis.delete(e.target)));
      document.body.classList.toggle("flut-recolhido", visiveis.size > 0);
    });
    [".hero", "#catalogo"].forEach((s) => { const el = document.querySelector(s); if (el) recolher.observe(el); });
  }

  // Vercel Analytics (só no ar; no computador o arquivo não existe)
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.protocol === "https:") {
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    const s = document.createElement("script");
    s.defer = true;
    s.src = "/_vercel/insights/script.js";
    document.head.append(s);
  }
})();
