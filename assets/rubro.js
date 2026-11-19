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
.qa .r-cartao{position:absolute;inset:8px;border-radius:38px;overflow:hidden;background:var(--r-lei-c);isolation:isolate;
  box-shadow:0 0 0 1px var(--r-aro),0 40px 80px -40px var(--r-sombra);
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
.qa .r-aro{inset:0;border-radius:inherit;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 0 0 1px rgba(255,255,255,.1)}
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

/* a frase: cada letra é um <c-h>; entra úmida e seca devagar */
c-h{opacity:0;color:var(--a-wet);transition:opacity .22s ease-out,color 2.6s ease-out}
c-h.on{opacity:1;color:var(--cor-final,inherit)}
w-d{display:inline-block;white-space:nowrap}
.verso c-h{--cor-final:var(--a-ink)}
.verso k-w c-h{--cor-final:var(--a-cur2)}
.pergunta c-h{--cor-final:var(--a-cur)}
k-w{position:relative;display:inline-block}
k-w::before{content:"";position:absolute;z-index:-1;left:-.14em;right:-.1em;top:.3em;bottom:.04em;background:var(--a-wash);
  -webkit-mask:var(--grifo) 0 0/100% 100% no-repeat;mask:var(--grifo) 0 0/100% 100% no-repeat;clip-path:inset(0 100% 0 0);transition:clip-path 1.1s cubic-bezier(.45,.05,.2,1)}
k-w.fim::before{clip-path:inset(0 0 0 0)}
k-w[data-g="0"]{--grifo:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40' preserveAspectRatio='none'%3E%3Cpath d='M2 22 C4 8 14 4 40 7 C66 9 88 5 97 11 C100 18 99 28 95 34 C70 38 40 33 14 36 C5 36 1 31 2 22Z'/%3E%3C/svg%3E")}
k-w[data-g="1"]{--grifo:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40' preserveAspectRatio='none'%3E%3Cpath d='M1 18 C3 9 20 6 46 9 C72 12 90 6 98 14 C99 22 98 31 93 35 C66 33 36 38 12 35 C3 33 0 27 1 18Z'/%3E%3C/svg%3E")}
k-w[data-g="2"]{--grifo:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40' preserveAspectRatio='none'%3E%3Cpath d='M3 20 C5 10 18 7 44 9 C68 7 90 8 98 13 C99 21 97 29 94 33 C64 36 38 31 13 35 C4 34 2 28 3 20Z'/%3E%3C/svg%3E")}
i-n{display:inline-block;width:0;height:0;position:relative;vertical-align:baseline}
i-n::after{content:"";position:absolute;left:.05em;bottom:-.05em;width:.028em;height:.78em;background:var(--a-cur);border-radius:1px;transform:skewX(-14deg);transform-origin:50% 100%;opacity:.9;transition:opacity 1.2s ease}
i-n.sai::after{opacity:0}
a-n{display:inline}
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
const L = { x: 0, y: 0, tx: 0, ty: 0, raf: 0, root: null, sala: null, pausa: 0 };
function lampPasso() {
  L.x += (L.tx - L.x) * .085; L.y += (L.ty - L.y) * .085;
  L.sala.style.setProperty("--lx", L.x.toFixed(1) + "px"); L.sala.style.setProperty("--ly", L.y.toFixed(1) + "px");
  const d = document.documentElement.style, w = L.sala.clientWidth || 380, h = L.sala.clientHeight || 800;
  // a sombra das letras cai para o lado oposto ao da luz
  d.setProperty("--sx", (-(L.x / w - .5) * 7).toFixed(2) + "px"); d.setProperty("--sy", (1.2 + (-(L.y / h - .5)) * 4).toFixed(2) + "px");
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

/* ---------- botões: ímã suave, brilho que segue o toque, seta que passa e volta ---------- */
function botoes() {
  const bs = document.querySelectorAll("#abertura .vd, #abertura .onde-l, .topo .perd");
  bs.forEach(b => {
    const mede = e => { const r = b.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    const move = e => {
      const [a, c] = mede(e); b.style.setProperty("--mx", (a * 100).toFixed(1) + "%"); b.style.setProperty("--my", (c * 100).toFixed(1) + "%");
      if (!calmo()) { b.style.setProperty("--ix", ((a - .5) * 7).toFixed(2) + "px"); b.style.setProperty("--iy", ((c - .5) * 5).toFixed(2) + "px"); }
    };
    b.addEventListener("pointerenter", move, { passive: true });
    b.addEventListener("pointermove", move, { passive: true });
    b.addEventListener("pointerdown", e => { move(e); b.classList.add("preso"); b.classList.remove("seta"); void b.offsetWidth; b.classList.add("seta"); }, { passive: true });
    const solta = () => { b.classList.remove("preso"); b.style.setProperty("--ix", "0px"); b.style.setProperty("--iy", "0px"); };
    b.addEventListener("pointerup", solta, { passive: true }); b.addEventListener("pointercancel", solta, { passive: true }); b.addEventListener("pointerleave", solta, { passive: true });
  });
}

/* ---------- a escrita ---------- */
function quebra(p) {
  const letras = []; let k = -1;
  const anda = (n, em) => n.childNodes.forEach(c => {
    if (c.nodeType === 3) for (const ch of c.textContent.replace(/\s+/g, " ")) letras.push({ ch, em });
    else if (c.nodeType === 1) { if (c.tagName === "EM") { k++; anda(c, k); } else anda(c, em); }
  });
  anda(p, -1);
  const texto = letras.map(l => l.ch).join("").trim();
  const sr = document.createElement("b-s"); sr.textContent = texto;
  const an = document.createElement("a-n"); an.setAttribute("aria-hidden", "true");
  let w = null, seg = null, segEm = -2; const cs = [], kws = [];
  const abreW = () => { w = document.createElement("w-d"); an.appendChild(w); seg = null; segEm = -2; };
  letras.forEach((l, i) => {
    if (l.ch === " ") { if (an.lastChild && i && i < letras.length - 1) an.appendChild(document.createTextNode(" ")); w = null; return; }
    if (!w) abreW();
    if (l.em !== segEm) {
      segEm = l.em;
      if (l.em >= 0) { seg = document.createElement("k-w"); seg.dataset.g = l.em; w.appendChild(seg); kws[l.em] = { el: seg, n: 0 }; } else seg = w;
    }
    const c = document.createElement("c-h"); c.textContent = l.ch; seg.appendChild(c);
    cs.push({ c, ch: l.ch, kw: l.em >= 0 ? kws[l.em] : null, w });
    if (l.em >= 0) kws[l.em].n++;
  });
  p.textContent = ""; p.append(sr, an);
  return cs;
}

export function escreve() {
  const v = document.querySelector("#abertura .verso"), q = document.querySelector("#abertura .pergunta");
  if (!v || !q || v.dataset.esc) return; v.dataset.esc = "1";
  const A = quebra(v), B = quebra(q), todas = A.concat(B);
  const pen = document.createElement("i-n");
  const root = document.querySelector(".qa");
  const acende = () => { if (root) root.classList.add("acesa"); const [a, b] = repouso(); lampPara(a, b); };
  let nl = 0; const lz = () => { nl = Math.min(3, nl + 1); if (root) root.style.setProperty("--lz", (nl / 3).toFixed(2)); };
  const mostra = (it, fim) => {
    it.c.classList.add("on");
    if (!fim) {
      it.c.after(pen);
      // a lâmpada vai à letra: coordenadas relativas ao cartão
      if (L.sala) { const r = it.c.getBoundingClientRect(), s = L.sala.getBoundingClientRect(); lampPara(r.left - s.left + r.width / 2, r.top - s.top + r.height * .35); }
    }
    if (it.kw && --it.kw.n === 0) setTimeout(() => { it.kw.el.classList.add("fim"); lz(); }, fim ? 0 : 160);
  };
  const tudo = () => { nl = 3; if (root) root.style.setProperty("--lz", "1"); todas.forEach(it => { it.c.style.transition = "none"; mostra(it, true); }); pen.remove(); [v, q].forEach(e => e.dataset.feito = "1"); document.body.classList.add("escrito", "q-on"); if (root) root.classList.add("acesa"); const [a, b] = repouso(); lampPara(a, b, true); };
  const pula = document.body.classList.contains("pula");
  if (calmo() || pula) return tudo();
  let t = 900; const agenda = [];
  const ritmo = (it, i, lista) => {
    const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453, r = x - Math.floor(x);
    let d = 52 + r * 46;
    if (it.ch === " ") d = 36;
    if (/[a-zç]/i.test(it.ch) && lista[i + 1] && lista[i + 1].ch === " ") d += 18;
    agenda.push([t, it]);
    t += d + (it.ch === "," ? 300 : it.ch === "." ? 460 : 0);
  };
  A.forEach(ritmo); t += 380; const tq = t; B.forEach(ritmo);
  const fimT = t;
  let i = 0, ini = 0, feito = false, raf = 0;
  const fecha = () => { if (feito) return; feito = true; cancelAnimationFrame(raf); tudo(); };
  const quadro = ts => {
    if (feito) return;
    if (!ini) ini = ts;
    const dt = ts - ini;
    if (dt >= tq - 200) document.body.classList.add("q-on");
    // o buraco de luz cresce com a escrita (0 a 100%), do tamanho de uma lâmpada ao do salão
    if (L.sala) L.sala.style.setProperty("--r", (95 + Math.pow(Math.min(1, i / agenda.length), .8) * 520).toFixed(0) + "px");
    while (i < agenda.length && agenda[i][0] <= dt) { mostra(agenda[i][1]); i++; }
    if (i < agenda.length) raf = requestAnimationFrame(quadro);
    else { feito = true; document.body.classList.add("escrito"); setTimeout(() => pen.classList.add("sai"), 700); setTimeout(() => pen.remove(), 2200); setTimeout(acende, 500); }
  };
  const quando = () => { document.body.classList.add("escrevendo"); raf = requestAnimationFrame(quadro); };
  [v, q].forEach(e => e.addEventListener("pointerdown", () => { if (!feito) fecha(); }, { once: true }));
  const fonte = document.fonts && document.fonts.load ? Promise.race([document.fonts.load('40px "Yellowtail"'), new Promise(r => setTimeout(r, 1800))]) : Promise.resolve();
  fonte.then(quando, quando);
  window.__escrita = { fimMs: fimT };
}
