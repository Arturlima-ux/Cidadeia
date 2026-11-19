// Fundo da marca: o vermelho-pitanga do Pitanga com um ramo de pitangas desenhado em traço fino.
// Desenho original. Sem fotos, sem efeitos: só cor, luz suave e um balanço quase imperceptível.
const fruto = `<g id="fr"><path d="M0 -34 C -6 -52 -14 -56 -24 -54" fill="none" stroke="#C9D15A" stroke-width="1.4" stroke-linecap="round"/>
<circle r="34" fill="url(#gf)" stroke="#FFD9CF" stroke-width="1.3"/>
<path d="M0 -33 C -13 -16 -13 16 0 33M0 -33 C 13 -16 13 16 0 33M0 -33 C -25 -14 -25 14 0 33M0 -33 C 25 -14 25 14 0 33" fill="none" stroke="#FFD9CF" stroke-opacity=".45" stroke-width="1"/>
<path d="M-7 -33 L0 -27 L7 -33M-4 -34 L0 -22 L4 -34" fill="none" stroke="#C9D15A" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M-20 -12 C -22 -3 -20 5 -15 11" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.2" stroke-linecap="round"/></g>`;
const folha = `<g id="fo"><path d="M0 0 C 26 -26 80 -28 116 0 C 80 28 26 26 0 0Z" fill="url(#gl)" stroke="#D9DE7A" stroke-width="1.2"/>
<path d="M0 0 C 40 -2 78 -2 116 0M30 -2 L52 -14M52 -2 L76 -14M30 -1 L52 11M52 0 L76 11" fill="none" stroke="#F4F6C8" stroke-opacity=".55" stroke-width="1"/></g>`;
const svg = `<svg class="ramo" viewBox="0 0 800 800" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">
<defs>
<radialGradient id="gf" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#FF7A64"/><stop offset=".5" stop-color="#F94F3D"/><stop offset="1" stop-color="#B8301F"/></radialGradient>
<linearGradient id="gl" x1="0" x2="1"><stop offset="0" stop-color="#8E9722"/><stop offset="1" stop-color="#B7BE34"/></linearGradient>
${fruto}${folha}
</defs>
<g fill="none" stroke="#C9D15A" stroke-width="1.6" stroke-linecap="round"><path d="M-40 760 C 120 640 250 590 380 430 S 600 150 760 40"/><path d="M380 430 C 440 470 500 470 560 440" stroke-width="1.2"/><path d="M250 590 C 200 560 150 560 100 580" stroke-width="1.2"/></g>
<use href="#fo" transform="translate(150 636) rotate(-52) scale(.9)"/>
<use href="#fo" transform="translate(300 520) rotate(-118) scale(.85)"/>
<use href="#fo" transform="translate(420 380) rotate(-40) scale(1.05)"/>
<use href="#fo" transform="translate(500 270) rotate(-125) scale(.9)"/>
<use href="#fo" transform="translate(600 170) rotate(-30) scale(1)"/>
<use href="#fo" transform="translate(690 90) rotate(-100) scale(.8)"/>
<g stroke="#C9D15A" stroke-width="1.3" fill="none"><path d="M560 440 L 566 478"/><path d="M100 580 L 92 622"/><path d="M345 505 L 330 560"/></g>
<use href="#fr" transform="translate(570 500) rotate(8) scale(1.15)"/>
<use href="#fr" transform="translate(88 650) rotate(-6) scale(.95)"/>
<use href="#fr" transform="translate(326 592) rotate(5) scale(1.05)"/>
<use href="#fr" transform="translate(468 556) rotate(-10) scale(.8)" opacity=".9"/>
</svg>`;
const morros = `<svg class="morros" viewBox="0 0 300 340" preserveAspectRatio="none" aria-hidden="true">
<path d="M0 238 C50 204 112 230 170 210 S262 196 300 218 V340 H0Z" fill="var(--m1)"/>
<path d="M0 270 C70 244 130 276 196 254 S272 246 300 262 V340 H0Z" fill="var(--m2)"/>
<g fill="#7C8620" opacity=".75"><use href="#fo" transform="translate(-6 322) rotate(-62) scale(.9)"/><use href="#fo" transform="translate(40 336) rotate(-40) scale(.8)"/><use href="#fo" transform="translate(306 318) rotate(-118) scale(.9)"/><use href="#fo" transform="translate(262 336) rotate(-140) scale(.8)"/></g></svg>`;
const fotoArco = `<div class="arco"><img src="/assets/f/casa-1-g.webp" srcset="/assets/f/casa-1-m.webp 720w, /assets/f/casa-1-g.webp 1170w" sizes="70vw" alt="" decoding="async"><i></i><b class="lamp"></b></div>`;
const ceuArco = `<div class="arco ceu"><div class="sky"></div><b class="halo"></b><svg class="solsvg" viewBox="-60 -62 120 124" aria-hidden="true"><use href="#fr" transform="scale(1.6)"/></svg>${morros}</div>`;
const dia = `<div class="dia"><svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
<defs><g id="lg"><path d="M0 0 C40 -50 130 -50 180 0 C130 50 40 50 0 0Z"/><path d="M0 0 C60 -2 120 -2 180 0" fill="none" stroke="#6E7618" stroke-width="3" stroke-linecap="round"/></g>
<g id="fd"><circle r="1" /></g></defs>
<g class="sol"><circle cx="322" cy="104" r="118" fill="#FFC857"/><circle cx="322" cy="104" r="84" fill="#FFD97A" opacity=".75"/></g>
<g fill="#A8B028"><use href="#lg" transform="translate(-30 130) rotate(-24) scale(.95)" class="b1"/><use href="#lg" transform="translate(400 214) rotate(-122) scale(1.1)" class="b2"/>
<use href="#lg" transform="translate(-14 336) rotate(-28) scale(1.05)" class="b3"/><use href="#lg" transform="translate(402 400) rotate(152) scale(.95)" class="b1"/><use href="#lg" transform="translate(130 470) rotate(-72) scale(.8)" class="b2"/></g>
<g class="fr"><g class="p0" transform="translate(252 196)"><g><circle r="46" fill="#B8241B"/><path d="M0 -44 C -18 -23 -18 23 0 44M0 -44 C 18 -23 18 23 0 44M0 -44 C -34 -18 -34 18 0 44M0 -44 C 34 -18 34 18 0 44" fill="none" stroke="#FFE1D2" stroke-opacity=".55" stroke-width="2"/><path d="M-28 -9 C -29 5 -21 18 -12 27" fill="none" stroke="#FFF1DC" stroke-width="4" stroke-linecap="round" opacity=".85"/><path d="M-9 -43 L0 -32 L9 -43" fill="none" stroke="#A8B028" stroke-width="3" stroke-linejoin="round"/></g></g><g class="p1" transform="translate(118 262)"><g><circle r="38" fill="#B8241B"/><path d="M0 -36 C -15 -19 -15 19 0 36M0 -36 C 15 -19 15 19 0 36M0 -36 C -28 -15 -28 15 0 36M0 -36 C 28 -15 28 15 0 36" fill="none" stroke="#FFE1D2" stroke-opacity=".55" stroke-width="2"/><path d="M-23 -8 C -24 4 -17 15 -10 22" fill="none" stroke="#FFF1DC" stroke-width="4" stroke-linecap="round" opacity=".85"/><path d="M-9 -35 L0 -24 L9 -35" fill="none" stroke="#A8B028" stroke-width="3" stroke-linejoin="round"/></g></g><g class="p2" transform="translate(312 334)"><g><circle r="54" fill="#B8241B"/><path d="M0 -52 C -22 -27 -22 27 0 52M0 -52 C 22 -27 22 27 0 52M0 -52 C -40 -22 -40 22 0 52M0 -52 C 40 -22 40 22 0 52" fill="none" stroke="#FFE1D2" stroke-opacity=".55" stroke-width="2"/><path d="M-32 -11 C -33 5 -24 22 -14 31" fill="none" stroke="#FFF1DC" stroke-width="4" stroke-linecap="round" opacity=".85"/><path d="M-9 -51 L0 -40 L9 -51" fill="none" stroke="#A8B028" stroke-width="3" stroke-linejoin="round"/></g></g><g class="p3" transform="translate(186 392)"><g><circle r="34" fill="#B8241B"/><path d="M0 -32 C -14 -17 -14 17 0 32M0 -32 C 14 -17 14 17 0 32M0 -32 C -26 -14 -26 14 0 32M0 -32 C 26 -14 26 14 0 32" fill="none" stroke="#FFE1D2" stroke-opacity=".55" stroke-width="2"/><path d="M-20 -7 C -21 3 -15 14 -8 20" fill="none" stroke="#FFF1DC" stroke-width="4" stroke-linecap="round" opacity=".85"/><path d="M-9 -31 L0 -20 L9 -31" fill="none" stroke="#A8B028" stroke-width="3" stroke-linejoin="round"/></g></g></g>
<g fill="#FFF1DC"><circle cx="38" cy="214" r="5"/><circle cx="196" cy="70" r="4"/><circle cx="352" cy="150" r="6"/><circle cx="60" cy="430" r="4"/><circle cx="250" cy="474" r="5"/><circle cx="170" cy="300" r="3"/></g></svg></div>`;
const noite = `<div class="noite"><svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><defs>
<path id="lf" d="M0 0 C22 -22 68 -24 98 0 C68 24 22 22 0 0Z"/>
<linearGradient id="ouro" x1="0" x2="1"><stop offset="0" stop-color="#EBC9A8"/><stop offset=".5" stop-color="#D9A58A"/><stop offset="1" stop-color="#B98064"/></linearGradient></defs>
<g fill="none" stroke="url(#ouro)" stroke-linecap="round" stroke-linejoin="round">

<path class="dr" pathLength="1" d="M-20 520 C 110 430 190 340 250 238 S 330 84 414 30" stroke-width="1.2"/>
<path class="dr" pathLength="1" d="M250 238 C 300 262 340 262 372 244" stroke-width="1"/><path class="dr" pathLength="1" d="M168 370 C 130 356 100 360 70 380" stroke-width="1"/>
<g class="dr" stroke-width="1"><use href="#lf" transform="translate(150 410) rotate(-50) scale(1.05)"/><use href="#lf" transform="translate(214 306) rotate(-128) scale(1)"/><use href="#lf" transform="translate(262 214) rotate(-50) scale(1.15)"/><use href="#lf" transform="translate(300 150) rotate(-132) scale(1)"/><use href="#lf" transform="translate(344 86) rotate(-48) scale(.95)"/></g>
<g stroke-width="1"><circle cx="372" cy="280" r="30" fill="#4A100E" fill-opacity=".7" class="dr" pathLength="1"/><circle cx="70" cy="414" r="26" fill="#4A100E" fill-opacity=".7" class="dr" pathLength="1"/><circle cx="216" cy="190" r="22" fill="#4A100E" fill-opacity=".7" class="dr" pathLength="1"/></g>
<path d="M372 250 L372 232M70 388 L70 372M216 168 L216 152" stroke-width="1" opacity=".8"/></g>
<g fill="#EBC9A8"><path d="M200 8 l4 6 -4 6 -4 -6z"/></g></svg></div>`;
const pn = [[40, 30], [210, 30], [40, 210], [210, 210], [40, 390], [210, 390]].map(([x, y]) => `<rect x="${x}" y="${y}" width="150" height="160" rx="3"/>`).join("");
const sombra = `<g class="br" fill="#000"><path d="M470 560 C330 440 270 330 120 210" fill="none" stroke="#000" stroke-width="5"/>
<path id="sf" d="M0 0 C26 -26 80 -28 116 0 C80 28 26 26 0 0Z"/>
<use href="#sf" transform="translate(400 470) rotate(-130) scale(.95)"/><use href="#sf" transform="translate(330 400) rotate(-45) scale(1.05)"/>
<use href="#sf" transform="translate(300 340) rotate(-140) scale(.9)"/><use href="#sf" transform="translate(240 290) rotate(-50) scale(1.1)"/>
<use href="#sf" transform="translate(200 250) rotate(-150) scale(.85)"/><use href="#sf" transform="translate(150 215) rotate(-60) scale(.9)"/>
<circle cx="360" cy="330" r="34"/><circle cx="262" cy="404" r="28"/><circle cx="176" cy="318" r="30"/></g>`;
const parede = `<div class="parede"><svg class="luzj" viewBox="0 0 400 560" aria-hidden="true"><defs><filter id="bl" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.4"/></filter>
<mask id="lm" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="560"><g fill="#fff">${pn}</g>${sombra}</mask></defs>
<g filter="url(#bl)"><rect width="400" height="560" mask="url(#lm)" style="fill:var(--lc,#E8B070);opacity:var(--lz,.5)"/></g></svg><i class="abajur"></i>
<svg class="grao" aria-hidden="true"><filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/></filter><rect width="100%" height="100%" filter="url(#gr)"/></svg></div>`;
export default (v = "a") => v === "d" ? `<div class="marca">${dia}${noite}</div>` : v === "c" ? `<div class="marca"><i class="brilho"></i>${parede}</div>` : `<div class="marca"><i class="brilho"></i><div class="arcow">${v === "b" ? ceuArco : fotoArco}</div>${svg}</div>`;

// A cor da casa acompanha o relógio, do almoço à janta, sem degraus.
const K = [
  [11, "#F2905F", "#D8482F", "#8E2620", "#F6C79B", "#FFE3C2"],
  [13, "#F4A06C", "#DC5A38", "#A2261E", "#F2B27C", "#FFE9CE"],
  [16.5, "#E29A48", "#BE5A2A", "#8A2B1C", "#E8A25A", "#FFD08A"],
  [18.5, "#C2493A", "#8E2620", "#4A100E", "#B9473A", "#F08A5A"],
  [20.5, "#7A1F1B", "#3E0D0B", "#160505", "#2A0A12", "#6B1E1A"]];
const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => "#" + a.map((x, i) => Math.round(x + (b[i] - x) * t).toString(16).padStart(2, "0")).join("");
const num = (a, b, t) => a + (b - a) * t;
const suave = t => t * t * (3 - 2 * t);
export function hora(el, h) {
  h = Math.min(20.5, Math.max(11, h));
  let i = 0; while (i < K.length - 2 && h >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], t = suave((h - a[0]) / (b[0] - a[0]));
  const c = [1, 2, 3, 4, 5].map(k => mix(rgb(a[k]), rgb(b[k]), t));
  const u = (h - 11) / 9, st = el.style;
  [["--c1", c[0]], ["--c2", c[1]], ["--c3", c[2]], ["--s1", c[3]], ["--s2", c[4]],
  ["--m1", mix(rgb(c[2]), [10, 3, 3], .55)], ["--m2", mix(rgb(c[2]), [10, 3, 3], .8)],
  ["--sx", (18 + 64 * u).toFixed(1) + "%"], ["--sy", (82 - 62 * Math.sin(Math.PI * Math.min(1, u))).toFixed(1) + "%"],
  ["--lamp", String(Math.min(1, Math.max(0, (h - 16.5) / 3.5)).toFixed(2))],
  ["--halo", (.35 + .6 * Math.min(1, Math.max(0, (h - 16) / 4))).toFixed(2)],
  ["--lx", (-12 + 26 * Math.min(1, u)).toFixed(1) + "%"], ["--sk", (-14 + 34 * Math.min(1, u)).toFixed(1) + "deg"],
  ["--lz", (.62 - .62 * Math.min(1, Math.max(0, (h - 16.5) / 4))).toFixed(2)], ["--lc", mix(rgb("#FFE2B0"), rgb("#FF9A55"), Math.min(1, Math.max(0, (h - 13) / 6)))],
  ["--dia", (1 - suave(Math.min(1, Math.max(0, (h - 16.5) / 2.5)))).toFixed(3)],
  ["--bri", (1.14 - .32 * Math.min(1, Math.max(0, (h - 12) / 8.5))).toFixed(2)]].forEach(([k, v]) => st.setProperty(k, v));
}
export const agora = () => { const q = (location.search.match(/[?&]hora=([\d.]+)/) || [])[1], d = new Date(); return q ? parseFloat(q) : d.getHours() + d.getMinutes() / 60; };
