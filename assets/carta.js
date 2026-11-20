import { SECOES, PRATOS, porId, todos } from "/assets/data.js";
import { inicia as iniciaMinha } from "/assets/minha.js?v=5";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const calmo = matchMedia("(prefers-reduced-motion:reduce)").matches;
const sorteia = a => a[Math.floor(Math.random() * a.length)];
const sec = id => SECOES.find(s => s.id === id)?.itens || [];
const txt = i => norm(`${i.nome} ${i.desc || ""} ${(i.ing || []).join(" ")}`);

// A casca da pitanga, com seus gomos
{ let d = ""; for (let k = 0; k <= 360; k += 2) { const a = k * Math.PI / 180, r = 1 + .03 * Math.cos(10 * a); d += `${k ? "L" : "M"}${(Math.cos(a) * 80 * r).toFixed(1)} ${(8 + Math.sin(a) * 58 * r).toFixed(1)}`; } $("#casca").setAttribute("d", d + "Z"); }

// ---------- Cenas ----------
// O momento decide as cores da casa inteira. Vem do relógio de Teresina (almoço até as 16h, fim de tarde até as 18h,
// jantar depois), é reconferido a cada minuto e cede a vez quando o cliente diz para quando é a visita.
// Tema fixo (pedido do dono): sempre o salão de fim de tarde.
const relogio = () => "tarde";
let agora = relogio();
const LUZ = { almoco: "dia", tarde: "tarde", jantar: "noite" };
const COR = { almoco: "#F5EEE4", tarde: "#25101B", jantar: "#1E0605" };
const v = { momento: null, quem: null, vontade: null, nome: "" };
let cena = "abertura";
// Sistema de navegação: estante (padrão), gomos, tinta ou taças. ?sistema= escolhe um deles.
const SIS = (new URLSearchParams(location.search).get("sistema") || "").match(/^(gomos|tinta|tacas|estante)$/)?.[0] || "foto";
document.documentElement.dataset.sis = SIS;
const ESTRELA = (() => { let d = ""; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 6 : 15; d += `${k ? "L" : "M"}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`; } return d + "Z"; })();
// Fotos reais, do Instagram da casa. Só levam nome de prato quando a própria legenda da casa diz qual é.
const FOTO = {
  heroi: { almoco: "marca", tarde: "marca", jantar: "marca" },
  porta: { visita: "aperol", livro: "mar" },
  modulo: { executivo: ["pescada", "50% 45%"], comes: ["mar", "50% 50%"], bebes: ["margarita", "50% 42%"], vinhos: ["mignon", "92% 18%"] },
  item: { "ex-pescada": "pescada", "ex-bacalhau": "risoto", "ex-maria-maria": "churros", "mar-vermelho": "mar", "carne-de-sol-grelhada": "carne" },
};
// Cada foto existe em dois tamanhos; o navegador escolhe a nítida para a tela do aparelho
const src = n => (window.FOTOS_INLINE || {})[n] || `/assets/f/${n}-g.webp`;
const foto = (n, larg = "100vw") => (window.FOTOS_INLINE || {})[n] ? `src="${src(n)}"` : `src="/assets/f/${n}-g.webp" srcset="/assets/f/${n}-m.webp 720w, /assets/f/${n}-g.webp 1170w" sizes="${larg}"`;
function heroi() {
  if (SIS !== "foto") return;
  const n = (location.search.match(/[?&]hero=([\w-]+)/) || [])[1] || FOTO.heroi[agora], h = $("#heroi");
  if (h.dataset.n === n || n === "marca") return;
  if (window.__h3d) { window.__h3d.fim(); window.__h3d = null; }
  h.dataset.n = n; h.innerHTML = `<img class="ok" ${foto(n)} alt="" decoding="async" fetchpriority="high">`;
}
// Mudança de foco: o que foi tocado fica nítido e acende; todo o resto perde o foco e sai, como uma câmera que reajusta.
let foco = [];
const desfoca = (els, dur = 560) => els.forEach((el, i) => foco.push(el.animate(
  [{ opacity: 1, filter: "blur(0px)", transform: "translateY(0)" }, { opacity: 0, filter: "blur(9px)", transform: "translateY(-10px)" }],
  { duration: dur, delay: i * 45, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" })));
const refoca = () => { foco.forEach(a => a.cancel()); foco = []; window.__h3d?.desfoca(false); };
function acende(t, fim) {
  t.classList.add("abre");
  if (!t.classList.contains("vd")) foco.push(t.animate([{ transform: "scale(1)" }, { transform: "scale(1.035)" }], { duration: 700, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }));
  setTimeout(fim, 680);
}
const PORTA = [["visita", "Escrever a visita", "Três toques e a casa escreve uma carta para você"], ["livro", "Folhear a carta", "Executivo, comes, bebes, vinhos e crepes"]];
function portas() {
  const el = document.querySelector(".portas"); if (SIS === "estante") return;
  const BT = (location.search.match(/[?&]bt=(\w+)/) || [])[1] || "t";
  document.documentElement.dataset.bt = BT;
  if (SIS === "foto" && BT === "objeto") {
    // Objetos da casa: dois livrinhos de capa de tecido (livro de visitas e carta), com etiqueta colada, fita marcadora e bloco de folhas. O toque levanta a capa.
    el.innerHTML = PORTA.map(([ir, b]) => `<button class="vd ob-v ob-${ir}" data-ir="${ir}" data-porta aria-label="${b}"><span class="ob-w"><span class="ob-pg" aria-hidden="true"></span><span class="ob-fita" aria-hidden="true"><span class="ob-fi"></span></span><span class="ob-capa" aria-hidden="true"><span class="ob-lomb"></span><span class="ob-et"><span class="ob-tx">${b}</span></span></span></span></button>`).join("");
    return;
  }
  if (SIS === "foto" && BT === "fruto") {
    // Pitanga num fio: a fruta pende do fio por um cabinho; puxar o fio para o lado do rótulo a amadurece e abre o caminho. Um toque faz o mesmo percurso sozinho.
    const letras = t => [...t].map((c, k) => c === " " ? `<i class="sp"></i>` : `<i style="--k:${k}">${c}</i>`).join("");
    const folha = `M13 10.5C10.6 9.5 7.6 9.7 5.4 11.4 8.2 11.5 10.7 11.2 13 10.9Z`;
    const folha2 = `M13 10.3C11.6 8.3 9.7 6.7 7.6 6.2 8.2 8.3 10.3 9.9 13 10.7Z`;
    const fruta = k => `<svg class="fr-v" viewBox="0 0 26 34" aria-hidden="true"><defs>
      <radialGradient id="fa${k}" cx=".36" cy=".3" r=".8"><stop offset="0" style="stop-color:var(--fa1)"/><stop offset=".5" style="stop-color:var(--fa2)"/><stop offset="1" style="stop-color:var(--fa3)"/></radialGradient>
      <radialGradient id="fb${k}" cx=".36" cy=".3" r=".8"><stop offset="0" style="stop-color:var(--fb1)"/><stop offset=".5" style="stop-color:var(--fb2)"/><stop offset="1" style="stop-color:var(--fb3)"/></radialGradient>
      <radialGradient id="fs${k}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="fl${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B7D655"/><stop offset="1" stop-color="#5F8A1E"/></linearGradient></defs>
      <path class="fr-pe" d="M13 10.6C13 7 12.4 3.8 13 .6"/>
      <ellipse cx="13" cy="21.4" rx="11.2" ry="11" fill="url(#fa${k})"/>
      <ellipse class="fr-rp" cx="13" cy="21.4" rx="11.2" ry="11" fill="url(#fb${k})"/>
      <g class="fr-co"><path d="M13 10.7V31.7"/><path d="M13 10.5A8.3 10.8 0 0 1 13 31.9"/><path d="M13 10.5A8.3 10.8 0 0 0 13 31.9"/></g>
      <g class="fr-lo"><path d="M13 10.8A4.4 10.5 0 0 1 13 31.6"/><path d="M13 10.8A4.4 10.5 0 0 0 13 31.6"/></g>
      <ellipse cx="8.8" cy="16" rx="3.6" ry="2" transform="rotate(-34 8.8 16)" fill="url(#fs${k})"/>
      <g class="fr-ca" fill="url(#fl${k})"><path d="${folha}"/><path d="${folha2}"/><path d="M13 10.3C12.2 8.7 12.3 7.2 13 6.1 13.7 7.2 13.8 8.7 13 10.3Z"/><g transform="translate(26 0) scale(-1 1)"><path d="${folha}"/><path d="${folha2}"/></g></g>
      <circle class="fr-no" cx="13" cy=".7" r="1"/></svg>`;
    el.innerHTML = PORTA.map(([ir, b], k) => `<button class="vd fr-b fr-${ir}" data-ir="${ir}" data-porta aria-label="${b}"><span class="fr-t" aria-hidden="true"><i class="fr-t0"></i><i class="fr-t1"></i></span><span class="fr-l" aria-hidden="true">${letras(b)}</span><span class="fr-l fr-m" aria-hidden="true">${letras(b)}</span><span class="fr-d" aria-hidden="true"><span class="fr-f"><span class="fr-s">${fruta(k)}</span></span></span></button>`).join("");
    // gesto: arrastar para o rótulo. Passou da metade, abre; senão a fruta volta, balançando. Sem arrasto, o toque normal vale.
    const reduz = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const balanco = (s, a) => s.animate([{ transform: `rotate(${a}deg)` }, { transform: `rotate(${-a * .55}deg)`, offset: .3 }, { transform: `rotate(${a * .26}deg)`, offset: .58 }, { transform: `rotate(${-a * .09}deg)`, offset: .8 }, { transform: "rotate(0deg)" }], { duration: 1000, easing: "ease-in-out" });
    el.querySelectorAll(".fr-b").forEach(b => {
      const sv = b.querySelector(".fr-s"), tr = b.querySelector(".fr-d");
      let x0 = 0, xl = 0, tl = 0, vx = 0, len = 1, pp = 0, id = null, on = false, mov = false, nao = false;
      b.addEventListener("pointerdown", e => {
        if (reduz || (e.pointerType === "mouse" && e.button)) return;
        x0 = xl = e.clientX; tl = performance.now(); vx = 0; pp = 0; len = tr.offsetWidth || 1; id = e.pointerId; on = true; mov = false;
      });
      b.addEventListener("pointermove", e => {
        if (!on || e.pointerId !== id) return;
        const dx = e.clientX - x0;
        if (!mov) { if (Math.abs(dx) < 8) return; mov = true; b.classList.add("fr-arr"); try { b.setPointerCapture(id); } catch {} }
        pp = Math.max(0, Math.min(1, -dx / len)); b.style.setProperty("--p", pp.toFixed(4));
        const t = performance.now(), dt = Math.max(8, t - tl); vx = vx * .75 + ((e.clientX - xl) / dt) * .25; xl = e.clientX; tl = t;
        b.style.setProperty("--sw", Math.max(-15, Math.min(15, vx * 22)).toFixed(2));
      });
      const solta = e => {
        if (!on || e.pointerId !== id) return; on = false;
        if (!mov) return;
        b.classList.remove("fr-arr");
        const sw = +b.style.getPropertyValue("--sw") || 0; b.style.setProperty("--sw", 0);
        if (e.type === "pointerup" && (pp > .5 || vx < -.9)) { b.style.setProperty("--p", 1); }
        else {
          nao = true; setTimeout(() => { nao = false; }, 60);
          b.style.setProperty("--p", 0); setTimeout(() => b.style.removeProperty("--p"), 760);
        }
        if (Math.abs(sw) > 1) balanco(sv, sw);
      };
      b.addEventListener("pointerup", solta); b.addEventListener("pointercancel", solta);
      b.addEventListener("click", e => { if (nao) { e.stopPropagation(); e.preventDefault(); nao = false; } else if (!mov && !reduz) balanco(sv, -9); }, true);
    });
    return;
  }
  if (SIS === "foto" && BT === "portal") {
    // Portal: cada botão é um vão em arco abatido (moldura, soleira) com uma folha de porta entreaberta; o rótulo é a inscrição da folha.
    const letras = t => [...t].map((c, k) => c === " " ? `<i class="sp"></i>` : `<i style="--k:${k}">${c}</i>`).join("");
    el.innerHTML = PORTA.map(([ir, b], k) => `<button class="vd pt-b ${k ? "pt-r" : "pt-e"}" data-ir="${ir}" data-porta aria-label="${b}"><span class="pt-m" aria-hidden="true"></span><span class="pt-v" aria-hidden="true"><span class="pt-vista"></span><span class="pt-rev"></span><span class="pt-fol"><span class="pt-l">${letras(b)}</span><span class="pt-puxa"></span></span></span><span class="pt-s" aria-hidden="true"></span></button>`).join("");
    return;
  }
  if (SIS === "foto" && (BT === "casa" || BT === "reto")) {
    const letras = t => [...t].map((c, k) => c === " " ? `<i class="sp"></i>` : `<i style="--k:${k}">${c}</i>`).join("");
    const seta = `<svg class="bx-a" viewBox="0 0 22 10" aria-hidden="true"><path d="M0 5h21M16.5 1l4.5 4-4.5 4"/></svg>`;
    // a folha do logo, que brota do botão
    const folha = k => `<svg class="cs-folha f${k}" viewBox="0 0 16 22" aria-hidden="true"><path class="cs-fl" d="M8 21C2.5 15.5 1.5 8 8 1c6.5 7 5.5 14.5 0 20Z"/><path class="cs-nv" d="M8 20V6"/></svg>`;
    el.innerHTML = PORTA.map(([ir, b], k) => `<button class="vd bxv ${BT}" data-ir="${ir}" data-porta aria-label="${b}"><span class="bx-p"><span class="bx-fill" aria-hidden="true"></span><span class="bx-l" aria-hidden="true">${letras(BT === "reto" ? b.toUpperCase() : b)}</span>${seta}</span>${BT === "casa" ? folha(k) : ""}</button>`).join("");
  } else if (SIS === "foto" && BT === "tinta") {
    // Sem caixa: o rótulo grande, um traço de tinta que se desenha embaixo e uma seta fina.
    const letras = t => [...t].map((c, k) => c === " " ? `<i class="sp"></i>` : `<i style="--k:${k}">${c}</i>`).join("");
    el.innerHTML = PORTA.map(([ir, b]) => `<button class="vd tnv" data-ir="${ir}" data-porta aria-label="${b}"><span class="tn-r"><span class="tn-l" aria-hidden="true">${letras(b)}</span><svg class="tn-a" viewBox="0 0 26 12" aria-hidden="true"><path d="M1 6h23M18 1l6 5-6 5" pathLength="100"/></svg></span><svg class="tn-f" viewBox="0 0 300 8" preserveAspectRatio="none" aria-hidden="true"><path d="M2 5.2C52 2.2 104 7 160 4.2S262 2.6 298 4.6" pathLength="100"/></svg></button>`).join("");
  } else if (SIS === "foto" && BT !== "a") {
    // Botão-comanda: um bilhete de duas peças. O corpo traz o rótulo; o canhoto, a seta, e se solta ao toque.
    const letras = t => [...t].map((c, k) => c === " " ? `<i class="sp"></i>` : `<i style="--k:${k}">${c}</i>`).join("");
    const seta = `<svg class="tk-a" viewBox="0 0 18 10" aria-hidden="true"><path d="M0 5h17M13 1l4 4-4 4"/></svg>`;
    el.innerHTML = PORTA.map(([ir, b]) => `<button class="vd tkv" data-ir="${ir}" data-porta aria-label="${b}"><span class="tk-b"><span class="tk-l" aria-hidden="true">${letras(b)}</span></span><span class="tk-s" aria-hidden="true">${seta}${seta}</span></button>`).join("");
  } else if (SIS === "foto") el.innerHTML = PORTA.map(([ir, b]) => `<button class="vd" data-ir="${ir}" data-porta><span class="vd-pl"><i class="vd-f"></i><b>${b}</b><span class="vd-c" aria-hidden="true"><svg class="vd-s" viewBox="0 0 18 10"><path d="M0 5h17M13 1l4 4-4 4"/></svg></span></span><span class="vd-fio" aria-hidden="true"><i class="vd-p a"><s></s><u></u></i><i class="vd-p b"><s></s><u></u></i><i class="vd-d"><s></s><u></u></i></span></button>`).join("");
  if (SIS === "gomos") el.innerHTML = `<div class="ga"><svg viewBox="-150 -100 300 200" aria-hidden="true">
      <path class="deco" pathLength="1" d="M0 -8 C-26 -40 -30 -92 0 -98 C30 -92 26 -40 0 -8 Z"/><path class="deco" pathLength="1" d="M0 8 C-26 40 -30 92 0 98 C30 92 26 40 0 8 Z"/>
      <path class="lobo l" pathLength="1" d="M-8 0 C-40 -52 -136 -46 -140 0 C-136 46 -40 52 -8 0 Z"/><path class="lobo r" pathLength="1" d="M8 0 C40 -52 136 -46 140 0 C136 46 40 52 8 0 Z"/>
      <g class="nerv"><path pathLength="1" d="M-14 0 C-50 -10 -96 -10 -126 0"/><path pathLength="1" d="M14 0 C50 -10 96 -10 126 0"/></g><path class="estrela" d="${ESTRELA}"/></svg>
    ${PORTA.map(([ir, b], k) => `<button class="gb ${k ? "r" : "l"}" data-ir="${ir}" data-porta="${k ? "r" : "l"}"><small>${ROM[k]}</small>${b}</button>`).join("")}</div>`;
  if (SIS === "tinta") el.innerHTML = `<div class="ti">${PORTA.map(([ir, b, sm], k) => `<button class="il" data-ir="${ir}" data-porta><span class="n">${ROM[k].toLowerCase()}.</span><span class="tx"><b>${b}</b><small>${sm}</small></span><span class="ar"></span></button>`).join("")}</div>`;
  if (SIS === "tacas") el.innerHTML = PORTA.map(([ir, b], k) => `<button class="tb" data-ir="${ir}" data-porta style="--cor:${k ? "var(--c2)" : "var(--foil)"};--n:${k ? 30 : 36}%"><span class="liq">${k ? "" : "<i style='left:30%'></i><i style='left:62%;animation-delay:-1.2s'></i><i style='left:46%;animation-delay:-2.3s'></i>"}</span><span class="lb"><small>${ROM[k]}</small>${b.replace(" a ", "<br>a ")}</span></button>`).join("");
}
// Toque com gesto: cada sistema tem a sua forma de responder antes de abrir o caminho
function inunda(cor, x, y, fim) {
  const o = $("#inunda"); o.style.background = cor; o.style.setProperty("--x", x + "px"); o.style.setProperty("--y", y + "px");
  o.className = ""; void o.offsetWidth; o.className = "on";
  setTimeout(() => { fim(); setTimeout(() => { o.className = "sai"; setTimeout(() => { o.className = ""; }, 800); }, 650); }, 700);
}
function toca(t, e, fim) {
  if (calmo) return fim();
  if (SIS === "foto") {
    if (t.dataset.porta !== undefined) {
      desfoca([...document.querySelectorAll("#abertura>.col>.sc, #abertura .verso, #abertura .orn, #abertura .pergunta, #abertura .serv"), ...[...document.querySelectorAll(".portas .vd")].filter(x => x !== t)]);
      if (window.__h3d) window.__h3d.desfoca(true);
      const h = $("#heroi img"); if (h) foco.push(h.animate([{ filter: "blur(0px) brightness(1)" }, { filter: "blur(18px) brightness(.5)" }], { duration: 900, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }));
      return acende(t, fim);
    }
    if (t.classList.contains("sala")) { desfoca([...document.querySelectorAll("#cap-h>*, #onde"), ...[...document.querySelectorAll(".sala")].filter(x => x !== t)]); return acende(t, fim); }
    return fim();
  }
  if (SIS === "estante") { if (t.classList.contains("vol")) { t.classList.add("puxa"); return setTimeout(fim, 320); } return fim(); }
  if (SIS === "gomos") {
    const box = t.closest(".ga,.mods"); box.classList.add("esc");
    if (t.dataset.porta) box.dataset.on = t.dataset.porta;
    else { box.querySelectorAll(`[data-mod="${t.dataset.mod}"]`).forEach(x => x.classList.add("on")); const c = box.querySelector(".ros-c"); const m = MODS.find(x => x.id === t.dataset.mod); if (c && m) c.innerHTML = `<b>${m.secs.length ? (m.id === "executivo" ? 79 : total(m)) : "—"}</b><small>${m.secs.length ? (m.id === "executivo" ? "reais" : m.id === "vinhos" ? "rótulos" : "itens") : "em breve"}</small>`; }
    return setTimeout(fim, 800);
  }
  if (SIS === "tinta") {
    const b = t.querySelector("b"), r = b.getBoundingClientRect(), x = e.clientX || r.left + 30, y = e.clientY || r.top + r.height / 2;
    b.style.setProperty("--x", x - r.left + "px"); b.style.setProperty("--y", y - r.top + "px");
    const rt = t.getBoundingClientRect(); t.style.setProperty("--bx", x - rt.left + "px"); t.style.setProperty("--by", y - rt.top + "px");
    t.classList.add("tinge"); return setTimeout(fim, 700);
  }
  if (SIS === "tacas") {
    if (!t.classList.contains("tb") && !t.classList.contains("cl")) return fim();
    t.classList.add("enche"); const r = t.getBoundingClientRect();
    const cor = getComputedStyle(t.querySelector(".liq") || t).backgroundColor;
    if (/,\s*0\)$/.test(cor) || cor === "transparent") return setTimeout(fim, 300);
    return setTimeout(() => inunda(cor, e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2, fim), 380);
  }
  fim();
}
function veste() {
  const t = agora; // fixo
  document.documentElement.dataset.tema = t;
  document.querySelector('meta[name="theme-color"]').content = COR[t];
  document.body.dataset.cena = cena; heroi();
  document.body.dataset.luz = cena === "livro" && mod ? "carta" : LUZ[t];
}
setInterval(() => { const n = relogio(); if (n !== agora) { agora = n; veste(); if (cena === "visita" && aberta === "momento") baixo(); } }, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) { agora = relogio(); veste(); } });
function ir(nome) {
  cena = nome;
  document.querySelectorAll(".cena").forEach(c => c.classList.toggle("on", c.id === nome));
  document.body.classList.toggle("aberto", nome !== "abertura");
  if (nome !== "livro") document.body.classList.remove("no-livro");
  if (nome === "abertura") { refoca(); portas(); }
  veste();
  $("#ir").textContent = nome === "livro" ? "A visita" : "A carta";
  $("#ir").setAttribute("aria-label", nome === "livro" ? "Escrever a visita" : "Folhear a carta");
  $("#ir").dataset.ir = nome === "livro" ? "visita" : "livro";
  $("#" + nome).scrollTop = 0;
  if (nome === "visita") iniciaVisita();
  if (nome === "livro") livro();
}

// ---------- II · A visita numa frase ----------
const OPC = {
  momento: { rot: "Quando você vem?", antes: "Venho ", vazio: "quando?", ops: [
    ["almoco", "no almoço", "o menu executivo: entrada, prato principal e sobremesa ou café"],
    ["tarde", "ao fim da tarde", "drinks autorais e algo para começo de prosa"],
    ["jantar", "para o jantar", "a carta inteira, do começo ao doce"]] },
  quem: { rot: "Quem vem com você?", antes: "", vazio: "com quem?", ops: [
    ["so", "sozinho", "uma mesa só sua, no seu tempo"],
    ["dois", "a dois", "uma mesa para conversar sem pressa"],
    ["familia", "com a família", "pratos para pôr no centro da mesa"],
    ["amigos", "com amigos", "porções que passam de mão em mão"],
    ["trabalho", "a trabalho", "águas, sucos e o autoral sem álcool"],
    ["festa", "para comemorar", "um espumante para o brinde"]] },
  vontade: { rot: "Com vontade de…", antes: "com vontade de ", vazio: "de quê?", ops: [
    ["leve", "algo leve", "saladas, pescada e salmão"],
    ["brasa", "algo da brasa", "filé mignon, cupim e os grelhados"],
    ["mar", "algo do mar", "camarão, lagosta, pescada"],
    ["cremoso", "algo cremoso", "risotos, gnocchi e fettuccine"],
    ["surpresa", "me deixar surpreender", "a casa escolhe por você"]] },
};
const ORDEM = ["momento", "quem", "vontade"];
const rotulo = k => OPC[k].ops.find(o => o[0] === v[k])?.[1];
let aberta = null;
function escreve(el, t) { if (calmo) { el.textContent = t; return; } el.textContent = ""; let i = 0; const id = setInterval(() => { el.textContent = t.slice(0, ++i); if (i >= t.length) clearInterval(id); }, 32); }
function frase() {
  const feitas = ORDEM.filter(k => v[k]).length;
  $("#frase").innerHTML = ORDEM.map((k, n) => `<span class="lin ${n <= feitas ? "v" : ""}">${OPC[k].antes}<span style="white-space:nowrap"><button data-abre="${k}" class="${v[k] ? "" : "vazio"} ${aberta === k ? "at" : ""}">${esc(rotulo(k) || OPC[k].vazio)}</button>${n < 2 ? "," : "."}</span></span>`).join("")
    + `<span class="lin ${feitas === 3 ? "v" : ""}" style="font-size:.72em;margin-top:.7em">Pode escrever em nome de <input id="nome" maxlength="24" placeholder="seu nome" autocomplete="given-name" value="${esc(v.nome)}">.</span>`;
}
function baixo() {
  if (aberta) {
    const o = OPC[aberta];
    $("#baixo").innerHTML = `<div class="opc"><span class="sc">${o.rot}</span><ul>${o.ops.map((p, n) => `<li style="animation-delay:${.08 * n + .1}s"><button data-escolhe="${p[0]}"><b>${p[1]}${aberta === "momento" && p[0] === agora ? "<i>agora</i>" : ""}</b><small>${p[2]}</small></button></li>`).join("")}</ul></div>`;
  } else if (ORDEM.every(k => v[k])) $("#baixo").innerHTML = `<div class="fim-frase"><button class="lk ac" id="escrever">Escrever a minha carta</button></div>`;
  else $("#baixo").innerHTML = "";
}
function iniciaVisita() { aberta = ORDEM.find(k => !v[k]) || null; frase(); baixo(); }
function escolhe(val) {
  const k = aberta; v[k] = val;
  if (k === "momento") veste();
  aberta = ORDEM.find(x => !v[x]) || null;
  frase(); baixo();
  const b = document.querySelector(`[data-abre="${k}"]`); b && escreve(b, rotulo(k));
}

// ---------- III · A carta ----------
const RE = { leve: /salada|salm|pescada|peixe|tartare|folhas|carpaccio|maracuja|limao/, brasa: /mignon|file|cupim|picanha|ancho|chorizo|costela|carneiro|tomahawk|chateaubriand|suino|grelhad|carne/, mar: /camar|lagosta|pescada|peixe|salm|moqueca|bacalhau|polvo|vatapa/, cremoso: /risoto|fettuccine|gnocchi|molho branco|brie|parmes|gratinad|bechamel|queijo/, surpresa: /./ };
const filtra = (l, re) => { const f = l.filter(i => re.test(txt(i))); return f.length ? f : l; };
const UNI = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEN = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
function extenso(n) { n = Math.round(n); if (n === 100) return "cem"; if (n >= 1000) return String(n); const c = Math.floor(n / 100), r = n % 100, p = []; if (c) p.push(CEN[c]); if (r) p.push(r < 20 ? UNI[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? " e " + UNI[r % 10] : "")); return p.join(" e "); }
let versos = [];
function compoe() {
  const re = RE[v.vontade], grupo = ["familia", "amigos", "festa"].includes(v.quem), L = [];
  const taca = () => v.quem === "trabalho" ? [...sec("semalcool"), ...sec("aguas").filter(i => /suco|agua de coco/.test(txt(i)))] : v.quem === "festa" ? sec("espumantes") : sec("autorais");
  const ex = e => PRATOS.filter(p => p.etapa === e);
  if (v.momento === "almoco") {
    L.push(["Para começar", filtra(ex("entrada"), v.vontade === "leve" ? /salada|carpaccio/ : re)], ["Principal", filtra(ex("principal"), re)], ["Para terminar", ex("final")]);
  } else if (v.momento === "tarde") {
    L.push(["Na taça", taca()], ["Para beliscar", filtra(sec("prosa"), re)]);
    if (grupo) L.push(["Para o centro da mesa", filtra(sec("contos"), re)]);
  } else {
    L.push(["Para começar", filtra([...sec("prosa"), ...sec("saladas")], v.vontade === "leve" ? /salada|tartare|carpaccio/ : re)]);
    L.push(grupo ? ["Para o centro da mesa", filtra(sec("contos"), re)] : ["Principal", filtra([...sec("poesias"), ...sec("grelhados")], re)]);
    L.push(["Na taça", taca()], ["Para terminar", sec("doces")]);
  }
  versos = L.map(([rot, lista]) => ({ rot, lista, i: sorteia(lista) }));
  // Na taça: prefere a harmonização cadastrada para o principal, quando houver
  const pri = versos.find(x => /Principal|centro/.test(x.rot)), t = versos.find(x => x.rot === "Na taça");
  if (v.momento === "jantar" && pri && t && !["trabalho", "festa"].includes(v.quem)) { const h = (pri.i.par || []).map(porId).filter(Boolean); if (h.length) { t.lista = h; t.i = h[0]; } }
}
const versoHTML = x => `<span class="troca"><b>${esc(x.i.nome)}</b><p>${esc(x.i.desc || "")}</p></span>`;
function carta() {
  const quem = { so: "uma mesa só sua", dois: "uma mesa a dois", familia: "a mesa da família", amigos: "a mesa dos amigos", trabalho: "uma mesa de trabalho", festa: "uma mesa de festa" }[v.quem];
  const mom = { almoco: "almoço", tarde: "fim de tarde", jantar: "jantar" }[v.momento];
  const temTaca = versos.some(x => x.rot === "Na taça");
  const extra = !temTaca && ["trabalho", "festa"].includes(v.quem) ? "" : v.quem === "trabalho" ? " Na taça, nada de álcool." : v.quem === "festa" ? " Na taça, um espumante para o brinde." : ["familia", "amigos"].includes(v.quem) && v.momento !== "almoco" ? " No centro, um prato para dividir." : "";
  const porque = v.vontade === "surpresa" ? `Você deixou a escolha com a casa.${extra}` : `Você pediu ${rotulo("vontade")}, ${rotulo("quem")}.${extra}`;
  const soma = versos.reduce((a, x) => a + (x.i.preco || 0), 0);
  const valor = v.momento === "almoco" ? "menu executivo: setenta e nove reais" : `esta sugestão soma ${extenso(soma)} reais`;
  let d = 0; const at = (x = "") => `style="animation-delay:${(d += .3).toFixed(2)}s;${x}"`;
  $("#folha").innerHTML = `<span class="sc" ${at("display:block")}>Carta escrita para</span><h2 ${at()}>${esc(v.nome.trim() || "você")}</h2>
    <div class="it" ${at("font-size:16px;color:var(--suave);margin-top:4px")}>${mom} · ${quem}</div><div class="orn" ${at()}><i></i><s></s><i></i></div>
    ${versos.map((x, n) => `<div class="pr" ${at()}><span class="sc">${x.rot}</span><div data-verso="${n}">${versoHTML(x)}</div>${x.lista.length > 1 ? `<button class="outra" data-outra="${n}">outra sugestão</button>` : ""}</div>`).join("")}
    <p class="porque" ${at()}>${porque}</p><div class="orn" ${at()}><i></i><s></s><i></i></div><div class="valor" id="valor" ${at()}>${valor}</div>`;
}
function outra(n) {
  const x = versos[n], k = x.lista.indexOf(x.i); x.i = x.lista[(k + 1) % x.lista.length];
  const el = document.querySelector(`[data-verso="${n}"]`), tr = el.firstElementChild; tr.classList.add("sai");
  setTimeout(() => { el.innerHTML = versoHTML(x); const nv = el.firstElementChild; nv.classList.add("sai"); requestAnimationFrame(() => requestAnimationFrame(() => nv.classList.remove("sai"))); }, calmo ? 0 : 350);
  if (v.momento !== "almoco") $("#valor").textContent = `esta sugestão soma ${extenso(versos.reduce((a, y) => a + (y.i.preco || 0), 0))} reais`;
}

// ---------- IV · Folhear a carta ----------
// Os textos da carta vêm de data.js, que é a transcrição literal do cardápio impresso.
const ROM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const tipo = t => SECOES.filter(s => s.tipo === t);
const BEBES = ["aguas", "cervejas", "whisky", "destilados", "cachacas", "licores", "classicos", "autorais", "semalcool"];
const MODS = [
  { id: "executivo", nome: "Menu Executivo", linha: "Entrada + Prato principal + Sobremesa ou café", un: "setenta e nove reais",
    secs: ["entrada", "principal", "final"].map((e, k) => ({ id: "ex-" + e, nome: ["Entradas", "Pratos principais", "Sobremesas"][k], sub: "", itens: PRATOS.filter(p => p.etapa === e && p.id !== "ex-cafe-exec") })) },
  { id: "comes", nome: "Comes", linha: "Do começo de prosa às doces canções", secs: tipo("carta") },
  { id: "bebes", nome: "Bebes", linha: "Águas, cervejas, álcool forte e drinks", secs: BEBES.map(id => SECOES.find(s => s.id === id)) },
  { id: "vinhos", nome: "Carta de vinhos", linha: "Espumantes, brancos, rosés e tintos", secs: tipo("vinho") },
  { id: "crepes", nome: "Crepes", linha: "Em breve nesta carta", secs: [] },
];
const total = m => m.secs.reduce((a, x) => a + x.itens.length, 0);
const conta = m => !m.secs.length ? "em breve" : m.un || `${total(m)} ${m.id === "vinhos" ? "rótulos" : "itens"}`;
let mod = null, espia = null;
const preco = p => p == null ? "" : p % 1 ? p.toFixed(2).replace(".", ",") : p;
// Só tipografia: a origem do vinho vira sigla ao lado, o parêntese fica menor. O texto é o do cardápio.
function nomeHTML(n) {
  const o = n.match(/^(.*?)\s+-\s*([A-Z]{2,3})$/); if (o) return `${esc(o[1])}<span class="or">${o[2]}</span>`;
  const p = n.match(/^(.*?)\s*(\([^)]*\))$/); return p ? `${esc(p[1])} <small>${esc(p[2])}</small>` : esc(n);
}
const linha = i => `<li${FOTO.item[i.id] && SIS === "foto" ? ` class="cf"><figure><img ${foto(FOTO.item[i.id])} alt="${esc(i.nome)}" loading="lazy"></figure` : ""}><div class="l"><h4>${nomeHTML(i.nome)}</h4>${i.preco != null ? `<span class="pc">${preco(i.preco)}</span>` : ""}<div class="mk" data-id="${i.id}"></div></div>${i.desc ? `<p>${esc(i.desc)}</p>` : ""}</li>`;
const secao = (x, n) => {
  const curta = x.sub && x.sub.length < 24, so = x.itens.every(i => !i.desc);
  return `<section class="sec${so ? " so" : ""}" id="s-${n}" data-n="${n}"><header><i class="orn-s" aria-hidden="true"></i><h3>${esc(x.nome)}</h3><span class="sc">${curta ? esc(x.sub) : x.itens.length + (x.itens.length === 1 ? " item" : " itens")}</span>${x.sub && !curta ? `<p>${esc(x.sub)}</p>` : ""}</header><ul>${x.itens.map(linha).join("")}</ul></section>`;
};
// Rodapé de livro: um fio com um traço por capítulo (o atual aceso) e o sumário completo a um toque.
let capAt = 0;
function rodape(m) {
  $("#caps").innerHTML = `<div><div class="fio-c">${m.secs.map((x, k) => `<button data-cap="${k}" aria-label="${esc(x.nome)}"><i></i></button>`).join("")}</div>
    <button class="rod" data-indice aria-label="Ver tudo desta seção"><span class="rm"></span><b></b><span class="su">Ver tudo</span></button></div>`;
  marca(0, true);
}
function marca(n, ja) {
  const m = MODS.find(x => x.id === mod); if (!m || !m.secs[n] || (n === capAt && !ja)) return;
  capAt = n;
  document.querySelectorAll("#caps .fio-c button").forEach((b, k) => { b.className = k < n ? "f" : k === n ? "a" : ""; });
  
  const b = $("#caps .rod b"); b.textContent = m.secs[n].nome; b.classList.remove("troca"); void b.offsetWidth; b.classList.add("troca");
}
const vaiCap = n => document.getElementById("s-" + n)?.scrollIntoView({ behavior: calmo ? "auto" : "smooth", block: "start" });
function indice(on) {
  const m = MODS.find(x => x.id === mod);
  if (on && m) { $("#ind-t").textContent = m.nome; $("#ind-l").innerHTML = m.secs.map((x, n) => `<li style="animation-delay:${(.12 + .06 * n).toFixed(2)}s"><button data-cap="${n}" aria-current="${n === capAt}"><span></span><b>${esc(x.nome)}</b><u></u><i>${x.itens.length}</i></button></li>`).join(""); }
  document.body.classList.toggle("com-indice", !!on);
}
function livro() {
  const m = MODS.find(x => x.id === mod), comCaps = !!m && m.secs.length > 1;
  document.body.classList.toggle("no-livro", cena === "livro" && comCaps);
  espia?.disconnect(); refoca();
  veste();
  $("#mods").hidden = !!m; $("#onde").hidden = !!m; $("#est-leg").hidden = true; $("#mods").innerHTML = ""; $("#idx").innerHTML = "";
  $("#caps").innerHTML = ""; if (comCaps) rodape(m);
  if (!m) {
    $("#cap-h").className = "cap-h centro"; $("#cap-h").innerHTML = `<span class="sc">A carta da casa</span><h2>Por onde <span class="it">começamos?</span></h2>`;
    // A estante: cada módulo é a lombada de um volume
    const pe = x => !x.secs.length ? "em breve" : x.id === "executivo" ? "<b>79</b>reais" : `<b>${total(x)}</b>${x.id === "vinhos" ? "rótulos" : "itens"}`;
    const ar = x => `aria-label="${esc(x.nome)}: ${esc(x.linha)}"`, dl = n => `animation-delay:${(.1 * n + .15).toFixed(2)}s`;
    const conta2 = x => !x.secs.length ? "em breve" : x.id === "executivo" ? "79 reais" : `${total(x)} ${x.id === "vinhos" ? "rótulos" : "itens"}`;
    const COR = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"], NIV = [52, 40, 48, 38, 0], LIQ = ["var(--c1)", "var(--c3)", "var(--foil)", "var(--c2)", "transparent"];
    const POS = ["left:50%;top:-13%;transform:translateX(-50%);text-align:center", "right:-9%;top:22%;text-align:right", "right:0;top:97%;text-align:right", "left:0;top:97%", "left:-9%;top:22%"];
    $("#mods").className = "mods";
    $("#mods").innerHTML = SIS === "gomos"
      ? MODS.map((x, n) => `<button class="pet${x.secs.length ? "" : " vaz"}" data-mod="${x.id}" ${ar(x)} style="--a:${n * 72}deg;--cor:${COR[n]};${dl(n)}"><svg viewBox="0 0 60 110" preserveAspectRatio="none" aria-hidden="true"><path d="M30 108 C2 80 0 22 30 2 C60 22 58 80 30 108Z"/></svg></button>`).join("")
        + `<div class="ros-c"><svg viewBox="-16 -16 32 32" aria-hidden="true"><path d="${ESTRELA}"/></svg></div>`
        + MODS.map((x, n) => `<button class="rl${x.secs.length ? "" : " vaz"}" data-mod="${x.id}" tabindex="-1" aria-hidden="true" style="${POS[n]};${dl(n + 3)}"><small>${ROM[n]} · ${conta2(x)}</small>${esc(x.nome)}</button>`).join("")
      : SIS === "tinta"
      ? `<div class="ti2">${MODS.map((x, n) => `<button class="il${x.secs.length ? "" : " off"}" data-mod="${x.id}" ${ar(x)} style="${dl(n)}"><span class="n">${ROM[n].toLowerCase()}.</span><span class="tx"><b>${esc(x.nome)}</b><small>${esc(x.linha)}</small></span><i>${conta2(x)}</i></button>`).join("")}</div>`
      : SIS === "tacas"
      ? MODS.map((x, n) => `<button class="cl${x.secs.length ? "" : " vaz"}${n === 2 ? " clara" : ""}" data-mod="${x.id}" ${ar(x)} style="--h:${[100, 92, 96, 88, 78][n]}%;--n:${NIV[n]}%;--cor:${LIQ[n]};${dl(n)}"><span class="liq">${n === 2 ? "<i style='left:30%'></i><i style='left:64%;animation-delay:-1.4s'></i>" : ""}</span><span class="vt">${esc(x.nome)}</span><span class="ct">${pe(x)}</span></button>`).join("")
      : SIS === "foto"
      ? MODS.map((x, n) => { const f = FOTO.modulo[x.id]; return `<button class="sala${f ? "" : " sem"}" data-mod="${x.id}" ${ar(x)} style="${dl(n)}">${f ? `<span class="ft"><img ${foto(f[0])} alt="" loading="${n < 2 ? "eager" : "lazy"}" style="object-position:${f[1]}"></span>` : ""}<span class="br"></span><span class="sn">${ROM[n]}</span><span class="sq">${conta2(x)}</span><span class="st"><b>${esc(x.nome)}</b><small>${esc(x.linha)}</small></span></button>`; }).join("")
      : MODS.map((x, n) => `<button class="vol${x.secs.length ? "" : " vaz"}" data-mod="${x.id}" ${ar(x)} style="${dl(n)}"><span class="vn">${ROM[n]}</span><span class="vt">${esc(x.nome)}</span><span class="vc">${pe(x)}</span></button>`).join("");
    $("#est-leg").textContent = { estante: "Cinco volumes. Toque numa lombada para abrir.", gomos: "Cinco gomos. Toque num deles para abrir.", tacas: "Cinco taças. Toque numa para servir.", tinta: "" }[SIS];
    $("#est-leg").hidden = SIS === "tinta" || SIS === "foto";
    return;
  }
  const k = MODS.indexOf(m); $("#cap-h").className = "cap-h";
  const fm = SIS === "foto" && FOTO.modulo[m.id];
  $("#cap-h").classList.toggle("com-foto", !!fm);
  $("#cap-h").innerHTML = (fm ? `<div class="mh"><img ${foto(fm[0])} alt="" style="object-position:${fm[1]}"></div>` : "") + `<button class="volta" data-mod="">← A carta</button><span class="sc">${ROM[k]} · ${conta(m)}</span><h2>${esc(m.nome)}</h2>`
    + (m.id === "executivo" ? `<div class="p79"><span>${esc(m.linha)}</span><b>79</b></div>` : m.secs.length ? `<p>${esc(m.linha)}</p>` : `<p>A carta de crepes ainda não está disponível aqui.</p>`);
  $("#idx").innerHTML = m.secs.map(secao).join("") + (m.secs.length ? `<p class="rodape">Preços em reais</p>` : "");
  const secs = [...document.querySelectorAll("#idx .sec")];
  if (!("IntersectionObserver" in window)) return secs.forEach(x => x.classList.add("v"));
  const surge = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("v"); surge.unobserve(e.target); } }), { root: $("#livro"), rootMargin: "0px 0px -8% 0px" });
  espia = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && marca(+e.target.dataset.n)), { root: $("#livro"), rootMargin: "-22% 0px -72% 0px" });
  secs.forEach(x => { if (calmo) x.classList.add("v"); else surge.observe(x); espia.observe(x); });
}

// ---------- Como chegar ----------
const LOCAL = { lat: -5.0801091, lng: -42.7846717, nome: "Pitanga Gastrobar", end: "Av. João XXIII, 1161 - Jóquei, Teresina - PI" };
{
  const ua = navigator.userAgent, android = /Android/i.test(ua), apple = /iPhone|iPad|iPod|Macintosh/i.test(ua), n = encodeURIComponent(LOCAL.nome), ll = `${LOCAL.lat},${LOCAL.lng}`;
  const vias = [
    android && ["Aplicativo de mapas do celular", `geo:${ll}?q=${ll}(${n})`],
    apple && ["Mapas da Apple", `https://maps.apple.com/?q=${n}&ll=${ll}`],
    ["Google Maps", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(LOCAL.nome + " Teresina")}&query_place_id=ChIJCTT5sGo7jgcRMIG5PK3itL8`],
    ["Waze", `https://waze.com/ul?ll=${ll}&navigate=yes`],
  ].filter(Boolean);
  $("#vias").innerHTML = vias.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${t}<i>abrir</i></a>`).join("");
}
const mapa = on => document.body.classList.toggle("com-mapa", on);


// ---------- Linha viva da abertura ----------
// Memória só deste aparelho: a contagem de visitas e os últimos pratos marcados. Nada sai daqui.
const VK = "pitanga-visitas";
const lerV = () => { try { return JSON.parse(localStorage.getItem(VK)) || {}; } catch { return {}; } };
const gravaV = o => { try { localStorage.setItem(VK, JSON.stringify(o)); } catch {} };
{ const o = lerV(); let novo = false; try { novo = !sessionStorage.getItem("pitanga-sessao"); sessionStorage.setItem("pitanga-sessao", "1"); } catch {} if (novo) gravaV({ ...o, n: (o.n || 0) + 1 }); }
const marcou = id => { const o = lerV(); gravaV({ ...o, ult: [id, ...(o.ult || []).filter(x => x !== id)].slice(0, 6) }); };
const POOL = { almoco: ["Mar Vermelho", "Pescada do Pitanga", "Arrastão", "Carne de Sol Grelhada"], tarde: ["Gin do Del", "Aperol Spritz"], jantar: ["Mignon Bordelaise", "Segundo Sol", "Carne de Sol Grelhada"] };
const porNome = n => todos().find(i => i.nome === n);
function viva() {
  const el = $("#viva"); if (!el) return;
  const d = (location.search.match(/[?&]demo=(\d+)/) || [])[1];
  const o = lerV(), n = d ? +d : o.n || 0;
  const ult = (d ? (+d >= 10 ? ["mar-vermelho", "mignon-bordelaise"] : +d >= 2 ? ["mar-vermelho"] : []) : o.ult || []).map(porId).filter(Boolean);
  let html = "";
  if (n >= 2 && ult.length) html = `Da última vez você marcou <b>${esc(ult[0].nome)}</b>.`;
  else if (n >= 2) { const l = (POOL[agora] || []).map(porNome).filter(Boolean); if (l.length) html = `Uma sugestão da carta para agora: <b>${esc(l[new Date().getDate() % l.length].nome)}</b>.`; }
  if (!html) { el.hidden = true; return; }
  el.innerHTML = html + ` <button data-ir="livro">ver na carta</button>`; el.hidden = false;
}


// ---------- Estou perdido ----------
// Duas ou três perguntas gentis, cada uma com "pular". As sugestões saem só de nomes, descrições e preços da carta.
const PD = { fome: null, leve: null, bebida: null, passo: 0, volta: 0, foco: null };
const PDQ = [
  ["fome", "Com fome ou só beliscando?", [["f", "Com fome"], ["b", "Só beliscando"]]],
  ["leve", "Algo mais leve ou mais reconfortante?", [["l", "Mais leve"], ["r", "Mais reconfortante"]]],
  ["bebida", "Quer uma bebida também?", [["s", "Quero"], ["n", "Agora não"]]],
];
const RE_LEVE = /salada|pescada|salm|peixe|carpaccio|ceviche|legum|verde/, RE_REC = /risoto|gnocchi|fettuccine|queijo|molho branco|baiao|feij|cupim|costela|gratin|creme|farofa/;
const semente = () => { const d = new Date(); return d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate() + PD.volta; };
const gira = (a, n) => a.length ? a.map((x, k) => [x, (k * 7 + n) % a.length * 1000 + k]).sort((p, q) => p[1] - q[1]).map(p => p[0]) : a;
function pdSugere() {
  const secsDe = ids => ids.flatMap(sec), n = semente();
  let pool = PD.fome === "b" ? secsDe(["prosa", "saladas"]) : secsDe(["poesias", "grelhados", "paixao", "contos"]);
  const re = PD.leve === "l" ? RE_LEVE : PD.leve === "r" ? RE_REC : null;
  const ok = re ? pool.filter(i => re.test(txt(i))) : [];
  const ordem = [...gira(ok, n), ...gira(pool.filter(i => !ok.includes(i)), n)];
  const pratos = ordem.slice(0, 3);
  const bebida = PD.bebida === "s" ? gira(sec("autorais"), n)[0] : null;
  return { pratos, bebida };
}
const pdItem = (i, rot) => `<div class="r"><b>${nomeHTML ? nomeHTML(i.nome) : esc(i.nome)}</b>${i.desc ? `<span>${esc(i.desc)}</span>` : ""}<span>${rot ? rot + " · " : ""}${i.preco != null ? `<i>${preco(i.preco)}</i>` : ""}</span></div>`;
function pdPinta() {
  const el = $("#pd"); if (!el) return;
  if (PD.passo < PDQ.length) {
    const [k, q, ops] = PDQ[PD.passo];
    el.innerHTML = `<small>Sem pressa · ${PD.passo + 1} de ${PDQ.length}</small><h3 id="pd-t" tabindex="-1">${q}</h3><p>Ninguém aqui espera que você saiba. Pode pular.</p>
      <div class="op">${ops.map(([v2, r]) => `<button data-pd="r" data-k="${k}" data-v="${v2}">${r}</button>`).join("")}</div>
      <div class="ac"><button class="pu" data-pd="r" data-k="${k}" data-v="">Prefiro pular</button><button class="pu" data-pd="fecha">Fechar</button></div>`;
  } else {
    const { pratos, bebida } = pdSugere();
    el.innerHTML = `<small>Três ideias. Nenhuma obrigação.</small><h3 id="pd-t" tabindex="-1">Para começar a conversar</h3>
      ${pratos.map(i => pdItem(i, i.grupo)).join("")}${bebida ? pdItem(bebida, "Para acompanhar") : ""}
      <p style="margin-top:14px;font-size:12.5px">Sobre alergias e restrições: a carta não detalha tudo. Pergunte ao salão, sem pressa.</p>
      <div class="ac"><button data-pd="outra">Outras ideias</button><button data-ir="livro" data-pd="fecha">Ver a carta</button><button class="pu" data-pd="fecha">Fechar</button></div>`;
  }
  el.querySelector("#pd-t")?.focus({ preventScroll: true });
}
const pdAbre = on => {
  document.body.classList.toggle("com-pd", on);
  if (on) { PD.fome = PD.leve = PD.bebida = null; PD.passo = 0; PD.volta = 0; PD.foco = document.activeElement; pdPinta(); document.getElementById("livro")?.setAttribute("inert", ""); }
  else { document.getElementById("livro")?.removeAttribute("inert"); PD.foco?.focus?.({ preventScroll: true }); }
};

// ---------- Toques ----------
document.addEventListener("click", e => {
  if (cena === "abertura" && !document.body.classList.contains("pula")) document.body.classList.add("pula");
  if (e.target.closest("[data-mapa-fecha]") || (document.body.classList.contains("com-mapa") && !e.target.closest(".mapa"))) return mapa(false);
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset;
  if (d.mk === "+" && d.id) marcou(d.id);
  if (d.pd) {
    if (d.pd === "abre") pdAbre(true);
    else if (d.pd === "fecha") pdAbre(false);
    else if (d.pd === "r") { if (d.v) PD[d.k] = d.v; PD.passo++; pdPinta(); }
    else if (d.pd === "outra") { PD.volta++; pdPinta(); }
    if (!d.ir) return;
  }
  if (d.ir) { if (d.porta !== undefined) toca(t, e, () => ir(d.ir)); else ir(d.ir); }
  else if (d.abre) { aberta = aberta === d.abre ? null : d.abre; frase(); baixo(); }
  else if (d.escolhe) escolhe(d.escolhe);
  else if (t.id === "escrever") { compoe(); carta(); ir("carta"); }
  else if (d.outra) outra(+d.outra);
  else if (d.mod !== undefined) {
    // Cada sistema responde ao toque antes de abrir o capítulo
    const abre = () => { mod = d.mod || null; livro(); $("#livro").scrollTop = 0; };
    if (d.mod && !mod) toca(t, e, abre); else abre();
  }
  else if (d.mapa !== undefined) mapa(true);
  else if (t.id === "copia") { navigator.clipboard?.writeText(LOCAL.end).then(() => { t.lastElementChild.textContent = "copiado"; }, () => {}); }
  else if (d.cap) { indice(false); vaiCap(+d.cap); }
  else if (d.indFecha !== undefined) indice(false);
  else if (d.indice !== undefined) indice(true);
});
document.addEventListener("input", e => { if (e.target.id === "nome") v.nome = e.target.value; });
document.addEventListener("keydown", e => { if (e.key === "Escape") { mapa(false); indice(false); if (document.body.classList.contains("com-pd")) pdAbre(false); } if (e.key === "Enter" && e.target.id === "nome") { e.target.blur(); $("#escrever")?.click(); } });

// ---------- Luz de vela e poeira dourada ----------
addEventListener("pointermove", e => { document.body.style.setProperty("--vx", e.clientX + "px"); document.body.style.setProperty("--vy", e.clientY + "px"); }, { passive: true });
(function poeira() {
  const cv = $("#po"), x = cv.getContext("2d"); let W, H, dpr;
  const tam = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
  tam(); addEventListener("resize", tam);
  const P = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.6, s: .00012 + Math.random() * .00035, f: Math.random() * 6.28, a: .15 + Math.random() * .5 }));
  let t0 = performance.now();
  (function q(t) {
    const dt = Math.min(50, t - t0); t0 = t;
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    const noite = document.documentElement.dataset.tema !== "almoco";
    for (const p of P) {
      p.y -= p.s * dt; p.f += .0009 * dt; if (p.y < -.03) { p.y = 1.03; p.x = Math.random(); }
      const px = (p.x + Math.sin(p.f) * .012) * W, py = p.y * H, al = p.a * (.55 + .45 * Math.sin(p.f * 2.3)) * (noite ? 1 : .55);
      x.fillStyle = noite ? `rgba(255,205,150,${al})` : `rgba(160,60,40,${al * .6})`;
      x.beginPath(); x.arc(px, py, p.r, 0, 6.29); x.fill();
    }
    if (!calmo) requestAnimationFrame(q);
  })(t0);
})();

// Profundidade: as fotos andam um pouco mais devagar que a página
{
  let pend = false;
  const anda = () => {
    pend = false; if (SIS !== "foto") return;
    const L = $("#livro"), vh = innerHeight;
    document.querySelectorAll("#livro .sala .ft img").forEach(im => { const r = im.parentNode.getBoundingClientRect(); im.style.transform = `translate3d(0,${((r.top + r.height / 2 - vh / 2) * -.08).toFixed(1)}px,0) scale(1.1)`; });
    const mh = $("#livro .mh img"); if (mh) mh.style.transform = `translate3d(0,${(L.scrollTop * .35).toFixed(1)}px,0) scale(${(1 + L.scrollTop / 2400).toFixed(3)})`;
    document.body.classList.toggle("sobre-foto", cena === "livro" && !!mh && L.scrollTop < innerHeight * .5 - 70);
  };
  const pede = () => { if (!pend) { pend = true; requestAnimationFrame(anda); } };
  $("#livro").addEventListener("scroll", pede, { passive: true }); addEventListener("resize", pede);
  new MutationObserver(pede).observe($("#mods"), { childList: true }); new MutationObserver(pede).observe($("#cap-h"), { childList: true });
}
portas();
veste();

// Minha mesa: lista pessoal do cliente (assets/minha.js)
iniciaMinha({ MODS, preco, esc });
viva();
