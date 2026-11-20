/* Abertura "A casa acende enquanto se escreve" (protoR).
   Gesto autoral: o salão real do Pitanga começa na penumbra (ou na névoa, ao meio-dia) e a PENA É A LÂMPADA:
   cada letra escrita acende o salão em volta dela, linha a linha, e a sombra das letras cai para longe da luz.
   Quando a frase termina a luz sossega perto das lâmpadas da parede; depois, o dedo vira lanterna.
   Os botões moram numa doca de vidro que mostra o salão desfocado atrás.

   - default()   -> html da cena (cartão arredondado com o salão, véu, brilho da lâmpada, leitura, grão).
   - hora(el, h) -> garante o tema da hora e liga (uma vez) paralaxe (dedo/inclinação), lanterna e botões magnéticos.
   - escreve()   -> digita a frase (c-h, grifos, pena) e conduz a lâmpada. Toque na frase completa tudo.
   Sem WebGL: só camadas CSS e custom properties. Nada pisca; reduced-motion = tudo já aceso e escrito. */
const css = `
.qa{position:absolute;inset:0;overflow:hidden;background:var(--r-fora);transition:background 1.4s var(--ease),--lz 1.6s cubic-bezier(.3,.05,.2,1);--px:0;--py:0;--sw:0;--lz:0}
.qa .r-fora{position:absolute;inset:0;background:radial-gradient(70% 38% at 85% 0%,var(--r-f1),transparent 70%),radial-gradient(80% 40% at 0% 100%,var(--r-f2),transparent 70%)}
.qa .r-cartao{position:absolute;inset:0;border-radius:0;overflow:hidden;background:var(--r-lei-c);isolation:isolate;
  transition:inset .9s var(--ease),border-radius .9s var(--ease),transform .9s var(--ease),opacity .6s var(--ease) .3s;
  --lx:62%;--ly:16%;--r:70px}
.qa i{position:absolute;display:block;pointer-events:none}
/* o salão: duas fotos reais, trocadas pela hora com fusão lenta */
.qa .r-foto{inset:-2% -3% auto -3%;height:70%;-webkit-mask-image:linear-gradient(#000 70%,transparent 100%);mask-image:linear-gradient(#000 70%,transparent 100%);transform:translate3d(calc((var(--px) + var(--sw)*.55)*-9px),calc((var(--py) + var(--sw)*.2)*-6px),0);will-change:transform}
.qa .r-foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.6s ease,filter 1.6s ease;transform-origin:50% 30%;animation:r-kb 60s ease-in-out infinite alternate}
.qa .r-foto .f1{object-position:93% 30%}
.qa .r-foto .f2{object-position:72% 30%}
html[data-tema="almoco"] .qa .f1{opacity:1;filter:brightness(1.12) saturate(1.12) contrast(.98)}
html[data-tema="tarde"] .qa .f1{opacity:1;filter:brightness(.92) saturate(1.2) sepia(.22) hue-rotate(-6deg)}
html[data-tema="jantar"] .qa .f2{opacity:1;filter:brightness(.6) saturate(1.3) sepia(.3) contrast(1.05)}
@keyframes r-kb{from{transform:scale(1)}to{transform:scale(1.05) translate3d(0,-.6%,0)}}
/* a luz que sobe: leitura (suporte do texto) por baixo, véu com buraco na lâmpada por cima */
.qa .r-lamps{inset:-2% -3% auto -3%;height:70%;transform:translate3d(calc((var(--px) + var(--sw)*.55)*-9px),calc((var(--py) + var(--sw)*.2)*-6px),0);
  background:radial-gradient(circle at 18% 11%,rgba(255,226,160,calc(.95*var(--lz))) 0,rgba(255,170,84,calc(.5*var(--lz))) 6%,rgba(255,130,60,calc(.16*var(--lz))) 16%,transparent 26%),radial-gradient(circle at 66% 11.5%,rgba(255,226,160,calc(.95*var(--lz))) 0,rgba(255,170,84,calc(.5*var(--lz))) 6%,rgba(255,130,60,calc(.16*var(--lz))) 16%,transparent 26%)}
html[data-tema="jantar"] .qa .r-lamps{background:radial-gradient(circle at 24% 42%,rgba(255,206,130,calc(.55*var(--lz))) 0,rgba(255,150,70,calc(.2*var(--lz))) 10%,transparent 24%),radial-gradient(circle at 64% 30%,rgba(255,206,130,calc(.5*var(--lz))) 0,rgba(255,150,70,calc(.18*var(--lz))) 10%,transparent 26%)}
.qa .r-lei{inset:0;background:linear-gradient(180deg,rgba(var(--r-lei),.62) 0,rgba(var(--r-lei),0) 14%,rgba(var(--r-lei),0) 28%,rgba(var(--r-lei),.62) 42%,rgba(var(--r-lei),.9) 54%,rgb(var(--r-lei)) 68%)}
.qa .r-cortina{inset:0;background:var(--r-veu);
  -webkit-mask-image:radial-gradient(circle at var(--lx) var(--ly),transparent 0,transparent calc(var(--r)*.45),#000 var(--r));mask-image:radial-gradient(circle at var(--lx) var(--ly),transparent 0,transparent calc(var(--r)*.45),#000 var(--r))}
.qa .r-luz{inset:0;mix-blend-mode:var(--r-mix);background:radial-gradient(circle at var(--lx) var(--ly),var(--r-b1) 0,var(--r-b2) 22%,transparent 55%);background-size:100% 100%;opacity:var(--r-bo)}
.qa .r-grao{inset:0;opacity:var(--r-gr);mix-blend-mode:overlay;background-image:var(--qa-grao)}
.qa .r-aro{display:none}
@property --r{syntax:"<length>";inherits:true;initial-value:70px}
@property --lz{syntax:"<number>";inherits:true;initial-value:0}
@property --sw{syntax:"<number>";inherits:true;initial-value:0}
.qa{animation:r-sw 22s ease-in-out infinite alternate}
@keyframes r-sw{from{--sw:-1}to{--sw:1}}
.qa.acesa .r-cartao{animation:r-abre 2.8s cubic-bezier(.3,.05,.2,1) forwards}
@keyframes r-abre{to{--r:190vmax}}
/* saída: o cartão cresce até virar a página da carta */
body:not([data-cena="abertura"]) .qa .r-cartao{inset:0;border-radius:0;transform:scale(1.03);opacity:0}
@media(prefers-reduced-motion:reduce){.qa,.qa .r-foto img{animation:none}.qa .r-cartao{--r:190vmax;animation:none}}

/* ============ A frase (z7). Cada palavra é um <w-d>; o movimento mora em <w-i>, dentro de <w-m> (a "linha invisível").
   Duas personalidades, escolhidas por ?f=a|b (html[data-fv]). Só transform, opacity, filter leve e clip-path. ============ */
a-n{display:inline}
w-d{display:inline-block;white-space:nowrap}
w-m{display:inline-block}
w-i{display:inline-block;opacity:0;color:inherit}
k-w{position:relative;display:inline-block}
k-w::before{content:"";position:absolute;z-index:-1;pointer-events:none;clip-path:inset(0 100% 0 0)}
k-w.fim::before{clip-path:inset(0 0 0 0)}
body.escrevendo :is(.verso,.pergunta) w-i{will-change:transform,opacity}
html[data-fv="b"] body.escrevendo :is(.verso,.pergunta) w-i{will-change:transform,opacity,filter}
:is(.verso,.pergunta)[data-feito] :is(w-i,k-w::before),:is(.verso,.pergunta)[data-feito] w-i,:is(.verso,.pergunta)[data-feito] k-w::before{transition:none!important}
w-d.on w-i{opacity:1}

/* ---- A: revelação por palavra, de dentro de uma linha invisível; grifo de pincel desenhado depois que a palavra assenta ---- */
html[data-fv="a"] w-m{clip-path:inset(-.55em -.5em -.3em -.5em)}
html[data-fv="a"] w-i{transform:translate3d(0,160%,0) rotate(4deg);transform-origin:0 100%;
  transition:transform 1.35s cubic-bezier(.16,1,.3,1),opacity .45s ease-out,color 1.2s ease .1s}
html[data-fv="a"] w-d.on w-i{transform:none}
html[data-fv="a"] .pergunta w-i{transition-duration:1.8s,.6s,1.2s}
html[data-fv="a"] k-w.fim w-i{color:var(--a-cur2)}
html[data-fv="a"] k-w::before{left:-.16em;right:-.1em;top:.32em;bottom:.02em;background:var(--a-wash);
  -webkit-mask:var(--grifo) 0 0/100% 100% no-repeat;mask:var(--grifo) 0 0/100% 100% no-repeat;transition:clip-path 1.05s cubic-bezier(.6,.02,.2,1)}

k-w[data-g="0"]{--grifo:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40' preserveAspectRatio='none'%3E%3Cpath d='M2 22 C4 8 14 4 40 7 C66 9 88 5 97 11 C100 18 99 28 95 34 C70 38 40 33 14 36 C5 36 1 31 2 22Z'/%3E%3C/svg%3E")}
k-w[data-g="1"]{--grifo:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40' preserveAspectRatio='none'%3E%3Cpath d='M1 18 C3 9 20 6 46 9 C72 12 90 6 98 14 C99 22 98 31 93 35 C66 33 36 38 12 35 C3 33 0 27 1 18Z'/%3E%3C/svg%3E")}
k-w[data-g="2"]{--grifo:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40' preserveAspectRatio='none'%3E%3Cpath d='M3 20 C5 10 18 7 44 9 C68 7 90 8 98 13 C99 21 97 29 94 33 C64 36 38 31 13 35 C4 34 2 28 3 20Z'/%3E%3C/svg%3E")}

/* ---- B: cinemática. A linha vem do desfoque ao foco, com as palavras se aproximando (tracking que fecha); traço fino de tinta sob cada palavra ---- */
html[data-fv="b"] w-i{filter:blur(9px);transform:translate3d(var(--dx,0px),6px,0) scale(1.06);transform-origin:50% 60%;
  transition:opacity 1.35s cubic-bezier(.3,.6,.2,1),filter 1.6s cubic-bezier(.2,.7,.2,1),transform 2.2s cubic-bezier(.16,1,.3,1),color 1.4s ease .2s}
html[data-fv="b"] w-d.on w-i{filter:none;transform:none}
html[data-fv="b"] .pergunta w-i{filter:blur(14px);transform:translate3d(var(--dx,0px),10px,0) scale(1.1);transition-duration:1.7s,2s,2.8s,1.4s}
html[data-fv="b"] k-w.fim w-i{color:var(--a-cur2)}
html[data-fv="b"] k-w::before{left:-.04em;right:-.22em;top:auto;bottom:-.08em;height:.34em;background:var(--a-cur);opacity:.9;
  -webkit-mask:var(--traco) 0 0/100% 100% no-repeat;mask:var(--traco) 0 0/100% 100% no-repeat;transition:clip-path 1.25s cubic-bezier(.5,0,.15,1)}
html[data-fv="b"] k-w[data-g="0"]{--traco:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 20' preserveAspectRatio='none'%3E%3Cpath d='M0 15 C20 13 52 11 80 7.6 C89 6.5 95 4.5 100 1.2 C96 6 90 9.6 80 11.4 C52 15.6 22 16.6 0 15Z'/%3E%3C/svg%3E")}
html[data-fv="b"] k-w[data-g="1"]{--traco:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 20' preserveAspectRatio='none'%3E%3Cpath d='M0 12 C24 15 56 14 82 9 C90 7.4 96 5 100 1.6 C97 7.4 91 11.8 82 13.6 C56 18.4 24 18.4 0 12Z'/%3E%3C/svg%3E")}
html[data-fv="b"] k-w[data-g="2"]{--traco:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 20' preserveAspectRatio='none'%3E%3Cpath d='M0 14 C18 11 46 12 74 9.4 C87 8 95 5.2 100 1 C97 7 90 11.2 74 13.4 C46 17 18 17.6 0 14Z'/%3E%3C/svg%3E")}

/* ---- a câmera e a vinheta respiram junto, sem chamar atenção ---- */
.qa .r-cartao::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(120% 82% at 50% 40%,transparent 48%,rgba(8,2,2,.5) 100%)}
html[data-fv="a"] body.escrevendo .qa .r-foto{transform-origin:55% 26%;animation:z7-ra 7.6s cubic-bezier(.3,.1,.25,1) both}
html[data-fv="b"] body.escrevendo .qa .r-foto{transform-origin:55% 26%;animation:z7-rb 8s cubic-bezier(.25,.1,.25,1) both}
html[data-fv="a"] body.escrevendo .qa .r-cartao::after{animation:z7-va 6s ease-out both}
html[data-fv="b"] body.escrevendo .qa .r-cartao::after{animation:z7-vb 6.5s ease-out both}
@keyframes z7-ra{from{scale:1}to{scale:1.022}}
@keyframes z7-rb{from{scale:1}to{scale:1.045}}
@keyframes z7-va{from{opacity:0}to{opacity:.5}}
@keyframes z7-vb{from{opacity:0}to{opacity:.85}}
@media(prefers-reduced-motion:reduce){.qa .r-foto,.qa .r-cartao::after{animation:none!important}}

i-n{display:none}
b-s{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

const GRAO = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .4 0 0 0 0 .3 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23a)'/%3E%3C/svg%3E\")";

const calmo = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

export default function () {
  if (!document.getElementById("rb-css")) { const s = document.createElement("style"); s.id = "rb-css"; s.textContent = css; document.head.appendChild(s); }
  return `<div class="qa" style="--qa-grao:${GRAO}"><i class="r-fora"></i><div class="r-cartao"><i class="r-foto"><img class="f1" src="/assets/f/casa-1-w.webp" alt="" decoding="async" fetchpriority="high"><img class="f2" src="/assets/f/casa-2-w.webp" alt="" decoding="async"></i><i class="r-lei"></i><i class="r-cortina"></i><i class="r-lamps"></i><i class="r-luz"></i><i class="r-grao"></i><i class="r-aro"></i></div></div>`;
}

export function agora() {
  const q = (location.search.match(/[?&]hora=([\d.]+)/) || [])[1];
  if (q) return parseFloat(q);
  const f = new Intl.DateTimeFormat("pt-BR", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: "America/Fortaleza" }).formatToParts(new Date());
  return +f.find(x => x.type === "hour").value + +f.find(x => x.type === "minute").value / 60;
}

/* ---------- a lâmpada: um alvo (x,y em px dentro do cartão) e uma posição que o persegue com amortecimento ---------- */
const L = { x: 0, y: 0, tx: 0, ty: 0, raf: 0, root: null, sala: null, pausa: 0, congela: false };
function lampPasso() {
  L.x += (L.tx - L.x) * .085; L.y += (L.ty - L.y) * .085;
  L.sala.style.setProperty("--lx", L.x.toFixed(1) + "px"); L.sala.style.setProperty("--ly", L.y.toFixed(1) + "px");
  const d = document.documentElement.style, w = L.sala.clientWidth || 380, h = L.sala.clientHeight || 800;
  // a sombra das letras cai para o lado oposto ao da luz
  // depois que a frase termina a sombra das letras fica parada: a luz ainda se acomoda, mas o texto não se mexe mais
  if (!L.congela) { d.setProperty("--sx", (-(L.x / w - .5) * 7).toFixed(2) + "px"); d.setProperty("--sy", (1.2 + (-(L.y / h - .5)) * 4).toFixed(2) + "px"); }
  L.raf = (Math.abs(L.tx - L.x) + Math.abs(L.ty - L.y) > .4) ? requestAnimationFrame(lampPasso) : 0;
}
function lampPara(x, y, seco) {
  if (!L.sala) return; L.tx = x; L.ty = y;
  if (seco) { L.x = x; L.y = y; }
  if (!L.raf) L.raf = requestAnimationFrame(lampPasso);
}
const repouso = () => L.sala ? [L.sala.clientWidth * .64, L.sala.clientHeight * .17] : [200, 120];

let ligado = false;
export function hora(el, h) {
  const d = document.documentElement;
  if (!/^(almoco|tarde|jantar)$/.test(d.dataset.tema)) d.dataset.tema = (h >= 18 || h < 5) ? "jantar" : h >= 16 ? "tarde" : "almoco";
  if (ligado) return; ligado = true;
  const root = el.querySelector(".qa"); if (!root) return;
  L.root = root; L.sala = root.querySelector(".r-cartao");
  const [rx, ry] = repouso(); L.x = L.tx = rx; L.y = L.ty = ry; L.sala.style.setProperty("--lx", rx + "px"); L.sala.style.setProperty("--ly", ry + "px");
  botoes();
  if (calmo()) return;
  // paralaxe: dedo ou inclinação deslocam a foto; no dedo a lâmpada também o segue
  let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
  const passo = () => {
    x += (tx - x) * .06; y += (ty - y) * .06;
    root.style.setProperty("--px", x.toFixed(3)); root.style.setProperty("--py", y.toFixed(3));
    raf = (Math.abs(tx - x) + Math.abs(ty - y) > .003) ? requestAnimationFrame(passo) : 0;
  };
  const alvo = (a, b) => { tx = Math.max(-1, Math.min(1, a)); ty = Math.max(-1, Math.min(1, b)); if (!raf) raf = requestAnimationFrame(passo); };
  let solto = 0;
  const lanterna = e => {
    if (!document.body.classList.contains("escrito")) return;
    const r = L.sala.getBoundingClientRect(); clearTimeout(solto);
    lampPara(e.clientX - r.left, e.clientY - r.top - 40);
  };
  addEventListener("pointermove", e => {
    if (e.pointerType === "mouse" || e.buttons || e.pressure) { alvo(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); lanterna(e); }
  }, { passive: true });
  const solta = () => { alvo(0, 0); clearTimeout(solto); solto = setTimeout(() => { const [a, b] = repouso(); lampPara(a, b); }, 900); };
  addEventListener("pointerup", solta, { passive: true }); addEventListener("pointercancel", solta, { passive: true }); document.addEventListener("pointerleave", solta);
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== "function")
    addEventListener("deviceorientation", e => { if (e.gamma == null) return; alvo(e.gamma / 28, (e.beta - 55) / 28); }, { passive: true });
}

/* ---------- botões: ponto de luz no filete ----------
   O CSS faz o repouso (ponto, rastro e seta em laço). Aqui ficam:
   - o toque: o ponto dispara do lugar onde está até o dedo (160ms) e a placa acende (CSS, 150ms)
   - a pausa dos laços com a aba oculta
   Delegado no documento: os botões da abertura são montados por carta.js, depois deste módulo. */
function botoes() {
  if (botoes.feito) return; botoes.feito = true;
  const calma = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
  const alvo = e => e.target.closest && e.target.closest("#abertura .vd, #abertura .onde-l .mapa-l");
  const solta = () => document.querySelectorAll("#abertura .preso").forEach(b => b.classList.remove("preso"));
  const root = document.documentElement;
  const oculta = () => root.classList.toggle("oculto", document.hidden);
  document.addEventListener("visibilitychange", oculta); oculta();
  const sai = new WeakMap();
  // o ponto ocioso visível agora (ida ou volta): a posição dele é o ponto de partida do disparo
  const dispara = (b, e) => {
    const fio = b.querySelector(".vd-fio"), d = fio && fio.querySelector(".vd-d"); if (!d || calma()) return;
    const fr = fio.getBoundingClientRect(); if (!fr.width) return;
    let x0 = fr.width / 2;
    const ps = [...fio.querySelectorAll(".vd-p")].map(p => ({ p, o: +getComputedStyle(p).opacity })).sort((m, n) => n.o - m.o);
    if (ps[0] && ps[0].o > .02) x0 = ps[0].p.querySelector("u").getBoundingClientRect().left - fr.left;
    const x1 = Math.max(0, Math.min(fr.width - 3, (e.clientX || fr.left + fr.width / 2) - fr.left - 1.5));
    clearTimeout(sai.get(b)); d.getAnimations().forEach(a => a.cancel());
    d.classList.toggle("e", x1 < x0);
    b.classList.add("toque");
    const dur = Math.max(110, Math.min(200, Math.abs(x1 - x0) * .7));
    d.animate([{ transform: `translateX(${x0}px)`, opacity: 1 }, { transform: `translateX(${x1}px)`, opacity: 1 }], { duration: dur, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
  };
  const apaga = b => {
    const d = b.querySelector(".vd-d"); if (!d) return;
    sai.set(b, setTimeout(() => {
      // fica onde parou e some devagar
      const xf = getComputedStyle(d).transform;
      d.animate([{ transform: xf, opacity: 1 }, { transform: xf, opacity: 0 }], { duration: 420, easing: "ease-out", fill: "forwards" }).finished.then(() => { d.getAnimations().forEach(a => a.cancel()); b.classList.remove("toque"); }, () => {});
    }, 120));
  };
  document.addEventListener("pointerdown", e => { const b = alvo(e); if (!b) return; b.classList.add("preso"); if (b.classList.contains("vd")) dispara(b, e); }, { passive: true });
  ["pointerup", "pointercancel", "dragstart", "contextmenu"].forEach(t => document.addEventListener(t, () => { solta(); document.querySelectorAll("#abertura .vd.toque").forEach(apaga); }, { passive: true }));
  document.addEventListener("pointerout", e => { const b = alvo(e); if (b && !b.contains(e.relatedTarget)) { b.classList.remove("preso"); if (b.classList.contains("vd") && b.classList.contains("toque")) apaga(b); } }, { passive: true });
}

/* ---------- a escrita (z7): palavras, não letras ---------- */
const VARIANTE = (() => { try { return String(new URLSearchParams(location.search).get("f") || "b").toLowerCase() === "a" ? "a" : "b"; } catch { return "b"; } })();

/* Divide o parágrafo em palavras: <w-d> > [<k-w> se grifada] > <w-m><w-i>letras</w-i></w-m> (+ pontuação em peça própria). */
function quebra(p) {
  const cs = []; let k = -1;
  const anda = (n, em) => n.childNodes.forEach(c => {
    if (c.nodeType === 3) for (const ch of c.textContent.replace(/\s+/g, " ")) cs.push({ ch, em });
    else if (c.nodeType === 1) { if (c.tagName === "EM") { k++; anda(c, k); } else anda(c, em); }
  });
  anda(p, -1);
  const texto = cs.map(l => l.ch).join("").replace(/\s+/g, " ").trim();
  const sr = document.createElement("b-s"); sr.textContent = texto;
  const an = document.createElement("a-n"); an.setAttribute("aria-hidden", "true");
  const peca = t => { const m = document.createElement("w-m"), i = document.createElement("w-i"); i.textContent = t; m.appendChild(i); return m; };
  const palavras = []; let atual = [];
  const fecha = () => {
    if (!atual.length) return;
    const d = document.createElement("w-d"); const txt = atual.map(x => x.ch).join(""); const em = atual.find(x => x.em >= 0);
    let kw = null;
    if (em) {
      const nucleo = atual.filter(x => x.em >= 0).map(x => x.ch).join(""), resto = atual.filter(x => x.em < 0).map(x => x.ch).join("");
      kw = document.createElement("k-w"); kw.dataset.g = em.em; kw.appendChild(peca(nucleo)); d.appendChild(kw);
      if (resto) d.appendChild(peca(resto));
    } else d.appendChild(peca(txt));
    if (an.lastChild) an.appendChild(document.createTextNode(" "));
    an.appendChild(d);
    palavras.push({ d, kw, txt, len: txt.replace(/[^\p{L}]/gu, "").length });
    atual = [];
  };
  cs.forEach(l => { if (l.ch === " ") fecha(); else atual.push(l); }); fecha();
  p.textContent = ""; p.append(sr, an);
  return palavras;
}

export function escreve() {
  const v = document.querySelector("#abertura .verso"), q = document.querySelector("#abertura .pergunta");
  if (!v || !q || v.dataset.esc) return; v.dataset.esc = "1";
  document.documentElement.dataset.fv = VARIANTE;
  // a frase nasce aqui, já sob o controle da animação: o HTML não traz texto solto que apareça antes da escrita
  if (!v.firstChild) v.innerHTML = "Aqui, cada prato tem nome de <em>canção</em>, de <em>poema</em>, de <em>escritora</em>.";
  if (!q.firstChild) q.textContent = "Qual será o seu?";
  const A = quebra(v), B = quebra(q), todas = A.concat(B);
  const root = document.querySelector(".qa");
  const acende = () => { L.congela = true; if (root) root.classList.add("acesa"); const [a, b] = repouso(); lampPara(a, b); };
  let nl = 0; const lz = () => { nl = Math.min(3, nl + 1); if (root) root.style.setProperty("--lz", (nl / 3).toFixed(2)); };
  const luzNa = w => { if (!L.sala) return; const r = w.d.getBoundingClientRect(), s = L.sala.getBoundingClientRect(); lampPara(r.left - s.left + r.width / 2, r.top - s.top + r.height * .35); };
  const mostra = (w, fim) => { w.d.classList.add("on"); if (!fim) luzNa(w); };
  const grifa = (w, fim) => { if (w.kw && !w.kw.classList.contains("fim")) { w.kw.classList.add("fim"); lz(); } };
  const tudo = () => {
    nl = 3; if (root) root.style.setProperty("--lz", "1");
    [v, q].forEach(e => e.dataset.feito = "1");
    todas.forEach(w => { mostra(w, true); grifa(w, true); });
    document.body.classList.add("escrito", "q-on", "z7-fim"); if (root) root.classList.add("acesa"); const [a, b] = repouso(); lampPara(a, b, true); if (L.sala) { cancelAnimationFrame(L.raf); L.raf = 0; lampPasso(); } L.congela = true;
  };
  const pula = document.body.classList.contains("pula");
  if (calmo() || pula) return tudo();

  /* ---------- a partitura: [instante em ms, ação]; montada depois da fonte, para medir as linhas já quebradas ---------- */
  const agenda = []; const ev = (t, f) => agenda.push([t, f]);
  const falado = (w, i) => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453, r = x - Math.floor(x); return 112 + w.len * 18 + r * 30; };
  let fimT = 0, tq = 0, total = 0;
  const monta = () => {
  if (VARIANTE === "a") {
    /* A: palavra a palavra, no ritmo da fala; pausa nas vírgulas; grifos desenhados depois que a palavra assenta */
    let t = 380;
    let tUlt = 0;
    A.forEach((w, i) => {
      ev(t, () => mostra(w)); tUlt = t;
      if (w.kw) ev(t + 640 + w.len * 14, () => grifa(w));
      t += falado(w, i) + (/,$/.test(w.txt) ? 290 : 0);
    });
    /* pausa dramática: a frase respira (o último grifo ainda se desenha) antes da pergunta */
    t = tUlt + 1650; tq = t;
    B.forEach((w, i) => { ev(t, () => mostra(w)); if (i < 3) t += [330, 290, 240][i]; });
    fimT = t + 1050;
  } else {
    /* B: por linha. Mede as linhas já quebradas; cada linha entra do desfoque ao foco, com as palavras em onda curta */
    const topos = []; const linhas = [];
    A.forEach(w => {
      const r = w.d.getBoundingClientRect(), y = Math.round(r.top / 6);
      let li = topos.indexOf(y); if (li < 0) { topos.push(y); li = topos.length - 1; linhas[li] = []; }
      w.r = r; linhas[li].push(w);
    });
    const nlinhas = linhas.length; let ultimo = 0;
    linhas.forEach((ws, li) => {
      const x0 = Math.min(...ws.map(w => w.r.left)), x1 = Math.max(...ws.map(w => w.r.right)), cx = (x0 + x1) / 2;
      let t = 400 + li * (nlinhas > 3 ? 620 : 720);
      ws.forEach((w, i) => {
        w.d.style.setProperty("--dx", ((w.r.left + w.r.width / 2 - cx) * .1).toFixed(1) + "px");
        const ti = t; ev(ti, () => mostra(w));
        if (w.kw) ev(ti + 750, () => grifa(w));
        t += 60 + w.len * 7.5 + (/,$/.test(w.txt) ? 140 : 0);
        ultimo = Math.max(ultimo, ti);
      });
    });
    /* pausa dramática mais longa, em foco parado; depois a pergunta, maior e mais lenta */
    let t = ultimo + 1140; tq = t;
    B.forEach((w, i) => { w.d.style.setProperty("--dx", ((i - 1.5) * 14) + "px"); ev(t, () => mostra(w)); if (i < 3) t += 180; });
    fimT = t + 1000;
  }
  agenda.sort((a, b) => a[0] - b[0]);
  total = agenda.length; window.__escrita = { fimMs: fimT, variante: VARIANTE };
  };

  let i = 0, ini = 0, feito = false, raf = 0, qon = false;
  const fecha = () => { if (feito) return; feito = true; cancelAnimationFrame(raf); tudo(); };
  const quadro = ts => {
    if (feito) return;
    if (!ini) ini = ts;
    const dt = ts - ini;
    if (!qon && dt >= tq - 200) { qon = true; document.body.classList.add("q-on"); }
    // o buraco de luz cresce com a escrita (0 a 100%), do tamanho de uma lâmpada ao do salão
    if (L.sala) L.sala.style.setProperty("--r", (95 + Math.pow(Math.min(1, i / total), .8) * 520).toFixed(0) + "px");
    while (i < total && agenda[i][0] <= dt) { agenda[i][1](); i++; }
    if (i < total || dt < fimT) raf = requestAnimationFrame(quadro);
    else {
      feito = true; document.body.classList.add("escrito"); setTimeout(acende, 400);
      setTimeout(() => document.body.classList.add("z7-fim"), 2600);
    }
  };
  const quando = () => { monta(); document.body.classList.add("escrevendo"); raf = requestAnimationFrame(quadro); };
  [v, q].forEach(e => e.addEventListener("pointerdown", () => { if (!feito) fecha(); }, { once: true }));
  const fonte = document.fonts && document.fonts.load ? Promise.race([document.fonts.load('40px "Yellowtail"'), new Promise(r => setTimeout(r, 1800))]) : Promise.resolve();
  fonte.then(quando, quando);
}
