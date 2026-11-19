/* Abertura "A casa acende enquanto se escreve" (protoS).
   A frase é ESCRITA À MÃO de verdade: cada linha é um <svg> com o texto real em Yellowtail (<text>) por baixo de uma máscara.
   A máscara é feita de traços centrais pré-computados offline (assets/escrita.json: esqueleto do glifo, ordenado na ordem natural
   de escrita, suavizado em Bézier). A caneta percorre cada traço (stroke-dashoffset) e só o que ela já passou aparece; a ponta é uma
   pena luminosa e a lâmpada do salão acompanha a ponta. Nada de esqueletizar no aparelho: o JSON já traz tudo.
   Autônoma: toca sozinha ao abrir, sem toque, arrasto, inclinação ou giroscópio. Tocar na frase só completa de uma vez (atalho de acessibilidade).
   Tema fixo: o salão de fim de tarde (data-tema="tarde"), em qualquer hora.

   - default()   -> html da cena (cartão arredondado com o salão, véu, brilho da lâmpada, leitura, grão).
   - hora(el)    -> fixa o tema e liga os botões (uma vez). (O 2º argumento, a hora, é ignorado.)
   - escreve()   -> monta os SVGs, escreve a frase e conduz a lâmpada.
   - window.__esc = { total, seek(ms) } para gravar quadro a quadro (teste). Sem WebGL: só camadas CSS e custom properties.
   Reduced-motion = frase completa estática e salão aceso. */
const css = `
.qa{position:absolute;inset:0;overflow:hidden;background:var(--r-fora);transition:background 1.4s var(--ease),--lz 1.6s cubic-bezier(.3,.05,.2,1);--px:0;--py:0;--sw:0;--lz:0}
.qa .r-fora{position:absolute;inset:0;background:radial-gradient(70% 38% at 85% 0%,var(--r-f1),transparent 70%),radial-gradient(80% 40% at 0% 100%,var(--r-f2),transparent 70%)}
.qa .r-cartao{position:absolute;inset:8px;border-radius:38px;overflow:hidden;background:var(--r-lei-c);isolation:isolate;
  box-shadow:0 0 0 1px var(--r-aro),0 40px 80px -40px var(--r-sombra);
  transition:inset .9s var(--ease),border-radius .9s var(--ease),transform .9s var(--ease),opacity .6s var(--ease) .3s;
  --lx:62%;--ly:16%;--r:70px}
.qa i{position:absolute;display:block;pointer-events:none}
/* o salão: duas fotos reais, trocadas pela hora com fusão lenta */
.qa .r-foto{inset:-2% -3% auto -3%;height:70%;-webkit-mask-image:linear-gradient(#000 70%,transparent 100%);mask-image:linear-gradient(#000 70%,transparent 100%);transform:translate3d(calc(var(--sw)*-5px),calc(var(--sw)*-1.5px),0);will-change:transform}
.qa .r-foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.6s ease,filter 1.6s ease;transform-origin:50% 30%;animation:r-kb 60s ease-in-out infinite alternate}
.qa .r-foto .f1{object-position:93% 30%}
.qa .r-foto .f2{object-position:72% 30%}
html[data-tema="tarde"] .qa .f1{opacity:1;filter:brightness(.92) saturate(1.2) sepia(.22) hue-rotate(-6deg)}
@keyframes r-kb{from{transform:scale(1)}to{transform:scale(1.05) translate3d(0,-.6%,0)}}
/* a luz que sobe: leitura (suporte do texto) por baixo, véu com buraco na lâmpada por cima */
.qa .r-lamps{inset:-2% -3% auto -3%;height:70%;transform:translate3d(calc(var(--sw)*-5px),calc(var(--sw)*-1.5px),0);
  background:radial-gradient(circle at 18% 11%,rgba(255,226,160,calc(.95*var(--lz))) 0,rgba(255,170,84,calc(.5*var(--lz))) 6%,rgba(255,130,60,calc(.16*var(--lz))) 16%,transparent 26%),radial-gradient(circle at 66% 11.5%,rgba(255,226,160,calc(.95*var(--lz))) 0,rgba(255,170,84,calc(.5*var(--lz))) 6%,rgba(255,130,60,calc(.16*var(--lz))) 16%,transparent 26%)}
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

/* a escrita: um <svg> por linha; o texto Yellowtail fica por baixo da máscara de traços */
.esc{display:block;overflow:visible;width:min(calc(var(--w)*1em),100%);height:auto;
  filter:drop-shadow(var(--sx,0px) var(--sy,1px) 1px var(--a-sh))}
.esc text{font-family:"Yellowtail",cursive;font-size:100px;font-weight:400;letter-spacing:0;fill:var(--a-ink);text-rendering:geometricPrecision;white-space:pre}
.esc .k{fill:var(--a-cur2)}
.pergunta .esc text{fill:var(--a-cur)}
.esc .gf{fill:var(--a-wash)}
.pena{position:fixed;left:0;top:0;z-index:5;width:0;height:0;pointer-events:none;opacity:0;will-change:transform,opacity}
.pena i{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;
  background:radial-gradient(circle,#fff 0,#fff 14%,rgba(255,226,170,.95) 26%,rgba(255,170,90,.55) 52%,rgba(255,140,70,0) 72%)}
.pena i::after{content:"";position:absolute;left:12px;top:-30px;width:2px;height:34px;border-radius:2px;transform:rotate(22deg);transform-origin:50% 100%;
  background:linear-gradient(rgba(255,226,170,0),rgba(255,226,170,.55))}
b-s{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media(prefers-reduced-motion:reduce){.pena{display:none}}
`;

const GRAO = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .4 0 0 0 0 .3 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23a)'/%3E%3C/svg%3E\")";

const calmo = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
const TEMA = "tarde"; // tema fixo da abertura (o da imagem aprovada): não depende de hora, ?hora= nem ?tema=

export default function () {
  if (!document.getElementById("rb-css")) { const s = document.createElement("style"); s.id = "rb-css"; s.textContent = css; document.head.appendChild(s); }
  return `<div class="qa" style="--qa-grao:${GRAO}"><i class="r-fora"></i><div class="r-cartao"><i class="r-foto"><img class="f1" src="/assets/f/casa-1-w.webp" alt="" decoding="async" fetchpriority="high"><img class="f2" src="/assets/f/casa-2-w.webp" alt="" decoding="async"></i><i class="r-lei"></i><i class="r-cortina"></i><i class="r-lamps"></i><i class="r-luz"></i><i class="r-grao"></i><i class="r-aro"></i></div></div>`;
}

/* mantido só por compatibilidade com quem chama m.agora(): a hora não decide mais nada */
export function agora() { return 20; }

/* ---------- a lâmpada: um alvo (x,y em px dentro do cartão) e uma posição que o persegue (amortecimento por tempo) ---------- */
const L = { x: 0, y: 0, tx: 0, ty: 0, raf: 0, root: null, sala: null, ult: 0 };
function lampAplica() {
  L.sala.style.setProperty("--lx", L.x.toFixed(1) + "px"); L.sala.style.setProperty("--ly", L.y.toFixed(1) + "px");
  const d = document.documentElement.style, w = L.sala.clientWidth || 380, h = L.sala.clientHeight || 800;
  // a sombra das letras cai para o lado oposto ao da luz
  d.setProperty("--sx", (-(L.x / w - .5) * 7).toFixed(2) + "px"); d.setProperty("--sy", (1.2 + (-(L.y / h - .5)) * 4).toFixed(2) + "px");
}
function lampAvanca(dt) { const k = 1 - Math.exp(-dt / 190); L.x += (L.tx - L.x) * k; L.y += (L.ty - L.y) * k; lampAplica(); }
function lampPasso(ts) { // laço livre (depois da escrita): leva a lâmpada ao repouso
  const dt = Math.min(64, ts - (L.ult || ts)); L.ult = ts; lampAvanca(dt);
  L.raf = (Math.abs(L.tx - L.x) + Math.abs(L.ty - L.y) > .4) ? requestAnimationFrame(lampPasso) : (L.ult = 0);
}
function lampPara(x, y, seco) {
  if (!L.sala) return; L.tx = x; L.ty = y;
  if (seco) { L.x = x; L.y = y; lampAplica(); return; }
  if (window.__escManual) return; // gravação por quadros: quem avança a lâmpada é o seek()
  if (!L.raf) L.raf = requestAnimationFrame(lampPasso);
}
const repouso = () => L.sala ? [L.sala.clientWidth * .64, L.sala.clientHeight * .17] : [200, 120];

let ligado = false;
export function hora(el) {
  document.documentElement.dataset.tema = TEMA;
  if (ligado) return; ligado = true;
  const root = el.querySelector(".qa"); if (!root) return;
  L.root = root; L.sala = root.querySelector(".r-cartao");
  const [rx, ry] = repouso(); L.x = L.tx = rx; L.y = L.ty = ry; L.sala.style.setProperty("--lx", rx + "px"); L.sala.style.setProperty("--ly", ry + "px");
  botoes();
}

/* ---------- botões: só o retorno do toque (brilho no ponto do toque e a seta que passa e volta). Sem ímã nem rastreio ---------- */
function botoes() {
  const bs = document.querySelectorAll("#abertura .vd, #abertura .onde-l, .topo .perd");
  bs.forEach(b => {
    b.addEventListener("pointerdown", e => {
      const r = b.getBoundingClientRect(); b.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%"); b.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      b.classList.add("preso"); b.classList.remove("seta"); void b.offsetWidth; b.classList.add("seta");
    }, { passive: true });
    const solta = () => b.classList.remove("preso");
    b.addEventListener("pointerup", solta, { passive: true }); b.addEventListener("pointercancel", solta, { passive: true }); b.addEventListener("pointerleave", solta, { passive: true });
  });
}

/* ---------- a escrita à mão ---------- */
const NS = "http://www.w3.org/2000/svg";
const GRIFO = ["M2 22 C4 8 14 4 40 7 C66 9 88 5 97 11 C100 18 99 28 95 34 C70 38 40 33 14 36 C5 36 1 31 2 22Z",
  "M1 18 C3 9 20 6 46 9 C72 12 90 6 98 14 C99 22 98 31 93 35 C66 33 36 38 12 35 C3 33 0 27 1 18Z",
  "M3 20 C5 10 18 7 44 9 C68 7 90 8 98 13 C99 21 97 29 94 33 C64 36 38 31 13 35 C4 34 2 28 3 20Z"];
// linha de base dentro de cada caixa de linha: (line-height - (ascent+descent))/2 + ascent da Yellowtail (hhea 1990/-617 em 2048)
const LINHA = { verso: { h: 128, base: 96.6 }, pergunta: { h: 110, base: 87.7 } };
const el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
let uid = 0;

function montaLinha(host, ln, tipo) {
  const g = LINHA[tipo], id = "esc" + (++uid), vw = ln.adv;
  const svg = el("svg", { class: "esc", viewBox: `0 0 ${vw} ${g.h}`, "aria-hidden": "true", focusable: "false" });
  svg.style.setProperty("--w", (vw / 100).toFixed(3));
  const defs = el("defs", {}, svg);
  const mk = el("mask", { id: id + "m", maskUnits: "userSpaceOnUse", x: -80, y: -120, width: vw + 160, height: g.h + 240 }, defs);
  const mg = el("g", { fill: "none", stroke: "#fff", "stroke-linecap": "round", "stroke-linejoin": "round" }, mk);
  const gfs = [];
  // grifos (a luz que sobe): atrás do texto
  const gg = el("g", {}, svg); let k = -1;
  ln.words.forEach((w, i) => {
    if (!w.em) return; k++;
    const x = w.x0 - 14, wd = (w.xc1 - w.x0) + 24, y = g.base - 67.2, ht = 93.3;
    const cp = el("clipPath", { id: id + "c" + i }, defs), r = el("rect", { x, y: y - 4, width: 0, height: ht + 8 }, cp);
    const gc = el("g", { "clip-path": `url(#${id}c${i})` }, gg); // o clip fica num <g> sem transform (o do <path> o deformaria)
    el("path", { class: "gf", d: GRIFO[k % 3], transform: `translate(${x} ${y}) scale(${wd / 100} ${ht / 40})` }, gc);
    gfs.push({ i, rect: r, x, wd, fim: 0 });
  });
  const tx = el("text", { x: 0, y: g.base, mask: `url(#${id}m)`, "xml:space": "preserve" }, svg);
  ln.words.forEach(w => { const t = el("tspan", { x: w.x0, class: w.em ? "k" : "" }, tx); t.textContent = w.t.replace(/[.,?]+$/, ""); if (w.t.length !== w.t.replace(/[.,?]+$/, "").length) { const t2 = el("tspan", {}, tx); t2.textContent = w.t.slice(w.t.replace(/[.,?]+$/, "").length); } });
  host.appendChild(svg);
  // traços
  const S = ln.strokes.map(s => {
    let nd;
    if (s.dot) nd = el("circle", { cx: s.c[0], cy: s.c[1] + g.base, r: s.r, fill: "#fff", stroke: "none", opacity: 0 }, mg);
    else { nd = el("path", { d: s.d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, a, b) => a + " " + (+b + g.base)), "stroke-width": s.w }, mg); nd._L = nd.getTotalLength(); nd.setAttribute("stroke-dasharray", `${nd._L} ${nd._L + 60}`); nd.setAttribute("stroke-dashoffset", nd._L); }
    return { s, nd, f: 0 };
  });
  return { svg, S, gfs, g, vw, tipo };
}

function pontoFrac(tp, tau) { // tempo normalizado -> fração do comprimento (perfil de velocidade pré-computado)
  if (tau <= 0) return 0; if (tau >= 1) return 1;
  const n = tp.length - 1; let i = 0; while (i < n - 1 && tp[i + 1] <= tau) i++;
  const a = tp[i], b = tp[i + 1]; return (i + (b > a ? (tau - a) / (b - a) : 0)) / n;
}

export function escreve() {
  const v = document.querySelector("#abertura .verso"), q = document.querySelector("#abertura .pergunta");
  if (!v || !q || v.dataset.esc) return;
  const root = document.querySelector(".qa");
  const pronto = fetch("/assets/escrita.json").then(r => { if (!r.ok) throw 0; return r.json(); });
  const fonte = document.fonts && document.fonts.load ? Promise.race([document.fonts.load('100px "Yellowtail"'), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
  Promise.all([pronto, fonte.catch(() => 0)]).then(([D]) => comeca(D), () => { v.dataset.esc = "txt"; q.dataset.esc = "txt"; document.body.classList.add("escrito", "q-on"); if (root) root.classList.add("acesa"); });

  function comeca(D) {
    const texto = el => el.textContent.replace(/\s+/g, " ").trim();
    const tv = texto(v), tq = texto(q);
    [[v, tv], [q, tq]].forEach(([e, t]) => { e.textContent = ""; const sr = document.createElement("b-s"); sr.textContent = t; e.appendChild(sr); });
    const linhas = [];
    D.lines.slice(0, 3).forEach(ln => linhas.push(montaLinha(v, ln, "verso")));
    linhas.push(montaLinha(q, D.lines[3], "pergunta"));
    v.dataset.esc = "1"; q.dataset.esc = "1";
    // lista plana de traços (na ordem de escrita) e de grifos
    const todos = []; linhas.forEach((ln, li) => ln.S.forEach(it => { it.li = li; todos.push(it); }));
    const grifos = []; linhas.forEach((ln, li) => ln.gfs.forEach(gf => {
      // o grifo abre quando a última letra da palavra termina (+160 ms)
      const ult = Math.max(...ln.S.filter(it => it.s.word === gf.i).map(it => it.s.t0 + it.s.dur));
      gf.t = ult + 160; gf.li = li; grifos.push(gf);
    }));
    const total = D.total, ESPERA = 700, GR = 1100;
    let lz = 0;
    const pena = document.createElement("div"); pena.className = "pena"; pena.innerHTML = "<i></i>"; document.getElementById("abertura").appendChild(pena);
    const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const setF = (it, f) => {
      if (it.f === f) return; it.f = f;
      if (it.s.dot) it.nd.setAttribute("opacity", f > 0 ? 1 : 0); else it.nd.setAttribute("stroke-dashoffset", (it._L0 = it.nd._L * (1 - f)));
    };
    const setG = (gf, a) => { if (gf.a === a) return; gf.a = a; gf.rect.setAttribute("width", (gf.wd * a).toFixed(1)); };
    // posição da ponta em px da página para (linha, x, y)
    const pagina = (li, x, y) => { const ln = linhas[li], r = ln.svg.getBoundingClientRect(), k = r.width / ln.vw; return [r.left + x * k, r.top + (y + ln.g.base) * k]; };
    const pontaStroke = (it, f) => { const ln = linhas[it.li]; if (it.s.dot) return pagina(it.li, it.s.c[0], it.s.c[1]); const p = it.nd.getPointAtLength(it.nd._L * f); const r = ln.svg.getBoundingClientRect(), k = r.width / ln.vw; return [r.left + p.x * k, r.top + p.y * k]; };
    const sala = () => L.sala.getBoundingClientRect();
    let ult = -1, nLz = 0, tUlt = 0, ativo = -1;
    const pinta = (t, dtMs) => {
      // traços
      let cur = -1;
      for (let i = 0; i < todos.length; i++) {
        const it = todos[i], s = it.s;
        let f = t <= s.t0 ? 0 : t >= s.t0 + s.dur ? 1 : pontoFrac(s.tp, (t - s.t0) / s.dur);
        if (s.dot) f = t >= s.t0 + s.dur * .5 ? 1 : 0;
        setF(it, f);
        if (t >= s.t0 && t < s.t0 + s.dur) cur = i;
      }
      // grifos
      let nl = 0;
      grifos.forEach(gf => { const a = t <= gf.t ? 0 : t >= gf.t + GR ? 1 : ease((t - gf.t) / GR); setG(gf, a); if (a >= 1) nl++; });
      if (nl !== nLz) { nLz = nl; root.style.setProperty("--lz", (Math.min(3, nl) / 3).toFixed(2)); }
      // buraco de luz cresce com a escrita (do tamanho de uma lâmpada ao do salão)
      L.sala.style.setProperty("--r", (95 + Math.pow(Math.min(1, t / total), .8) * 520).toFixed(0) + "px");
      // ponta da pena: no traço ativo, ou deslizando entre o fim de um traço e o começo do próximo
      let px, py, op = 1;
      if (cur >= 0) { const it = todos[cur], s = it.s; const f = s.dot ? 1 : pontoFrac(s.tp, (t - s.t0) / s.dur); [px, py] = pontaStroke(it, f); ativo = cur; }
      else {
        let i = 0; while (i < todos.length && todos[i].s.t0 + todos[i].s.dur <= t) i++;
        if (i === 0) { [px, py] = pontaStroke(todos[0], 0); op = t < 0 ? 0 : 1; }
        else if (i >= todos.length) { [px, py] = pontaStroke(todos[todos.length - 1], 1); op = 1; }
        else {
          const a = todos[i - 1], b = todos[i], ta = a.s.t0 + a.s.dur, tb = b.s.t0, u = tb > ta ? Math.min(1, (t - ta) / (tb - ta)) : 1, e = u * u * (3 - 2 * u);
          const A = pontaStroke(a, 1), B = pontaStroke(b, 0); px = A[0] + (B[0] - A[0]) * e; py = A[1] + (B[1] - A[1]) * e;
          op = tb - ta > 200 ? .55 : 1; // só escurece um pouco na troca de linha; entre traços de uma palavra nada pisca
        }
      }
      pena.style.opacity = op;
      pena.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0)`;
      // a lâmpada vai à ponta
      const sr = sala(); L.tx = px - sr.left; L.ty = py - sr.top - 6; lampAvanca(dtMs);
      if (t >= D.qstart - 200) document.body.classList.add("q-on");
    };
    const completa = () => { // tudo escrito, aceso, quieto
      todos.forEach(it => setF(it, 1)); grifos.forEach(gf => setG(gf, 1));
      root.style.setProperty("--lz", "1"); L.sala.style.removeProperty("--r");
      pena.style.opacity = 0; document.body.classList.add("escrito", "q-on"); root.classList.add("acesa");
      const [a, b] = repouso(); lampPara(a, b, true);
    };
    let feito = false, raf = 0;
    const fecha = () => { if (feito) return; feito = true; cancelAnimationFrame(raf); if (window.__esc) window.__esc.seek = null; completa(); };
    const fila = []; // só na gravação por quadros: os "depois de X ms" andam com o seek, não com o relógio
    const depois = (fn, ms) => window.__escManual ? fila.push([total + ms, fn]) : setTimeout(fn, ms);
    const final = () => { // a frase terminou escrita: a pena apaga, a luz sossega nas lâmpadas
      if (feito) return; feito = true; document.body.classList.add("escrito");
      depois(() => { pena.style.transition = "opacity 1.2s ease"; pena.style.opacity = 0; }, 700);
      depois(() => { root.classList.add("acesa"); const [a, b] = repouso(); lampPara(a, b); }, 500);
    };
    window.__esc = { total, qstart: D.qstart, seek: null };
    if (calmo() || document.body.classList.contains("pula")) return completa();
    [v, q].forEach(e => e.addEventListener("pointerdown", () => { if (!feito) fecha(); }, { once: true }));
    document.body.classList.add("escrevendo");
    // zera todos os traços (máscara fechada) e posiciona a pena e a lâmpada no começo
    todos.forEach(it => { it.f = -1; setF(it, 0); }); grifos.forEach(gf => { gf.a = -1; setG(gf, 0); });
    let ini = 0, tAnt = 0;
    window.__esc.seek = ms => {
      const dt = Math.min(64, Math.max(0, ms - tAnt)); tAnt = ms;
      if (ms <= total) pinta(ms, dt); else lampAvanca(dt);
      if (ms >= total) final();
      for (let i = fila.length - 1; i >= 0; i--) if (fila[i][0] <= ms) { const f = fila[i][1]; fila.splice(i, 1); f(); }
    };
    const quadro = ts => {
      if (feito) return;
      if (!ini) { ini = ts; tAnt = -ESPERA; }
      const t = ts - ini - ESPERA;
      if (t < 0) { raf = requestAnimationFrame(quadro); return; }
      const dt = Math.min(64, t - tAnt); tAnt = t; pinta(t, dt);
      if (t >= total) { final(); return; }
      raf = requestAnimationFrame(quadro);
    };
    if (!window.__escManual) raf = requestAnimationFrame(quadro);
  }
}
