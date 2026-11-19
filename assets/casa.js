/* Abertura: o prato como retrato, a hora como luz. Só fotos reais da casa. */
const SL = {
  almoco: [["mar", "Mar Vermelho", "50% 45%"], ["salmao", null, "42% 50%"], ["pescada", null, "46% 48%"], ["carne", "Carne de Sol Grelhada", "50% 50%"]],
  tarde: [["gin", "Gin do Del", "50% 40%"], ["aperol", "Aperol Spritz", "52% 40%"], ["margarita", null, "50% 38%"]],
  jantar: [["carne", "Carne de Sol Grelhada", "50% 50%"], ["risoto", null, "50% 52%"]],
};
const RIT = { almoco: [9000, 1400], tarde: [16000, 3000], jantar: [22000, 4200] }; // intervalo, dissolução (ms)
const TOM = {
  almoco: ["#2A1410", "255,200,120", .22, .30],
  tarde: ["#25101B", "249,150,70", .24, .55],
  jantar: ["#140605", "30,6,5", .0, .9],
};
const css = `
.cz{position:absolute;inset:0;overflow:hidden;background:var(--czbg,#1E0605);transition:background 2.6s ease}
.cz-ph{position:absolute;left:0;right:0;top:0;height:var(--czh,62%);
 -webkit-mask-image:linear-gradient(#000 0,#000 var(--czm,58%),transparent 100%);mask-image:linear-gradient(#000 0,#000 var(--czm,58%),transparent 100%)}
.cz-s{position:absolute;inset:0;background-size:cover;opacity:0;transition:opacity var(--czd,2.2s) cubic-bezier(.4,0,.2,1);transform:scale(1);will-change:opacity}
.cz-s.on{opacity:1;animation:czk 26s cubic-bezier(.3,0,.3,1) forwards}
@keyframes czk{to{transform:scale(1.045) translate3d(0,-6px,0)}}
.cz-w{position:absolute;inset:0;background:rgba(var(--czw),var(--czwa,.1));mix-blend-mode:soft-light;pointer-events:none}
.cz-v{position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 28%,transparent 40%,rgba(30,6,5,var(--czv,.5)) 100%);pointer-events:none}
.cz-r{position:absolute;inset:0;background:linear-gradient(180deg,transparent 38%,rgba(var(--czr),.55) 62%,rgba(var(--czr2),.94) 84%,rgb(var(--czr2)) 100%);pointer-events:none}
.cz-top{position:absolute;left:0;right:0;top:0;height:230px;background:radial-gradient(90% 100% at 10% 38%,rgba(20,6,5,.62),transparent 70%),linear-gradient(180deg,rgba(20,6,5,.5),transparent);pointer-events:none}
.cz-cap{position:absolute;left:22px;top:92px;max-width:280px;color:#F3E3D3;transition:opacity .5s,transform .5s;text-shadow:0 1px 18px rgba(0,0,0,.45)}
.cz-cap b{display:block;font:italic 500 26px/1.05 var(--serif,"Cormorant Garamond")}
.cz[data-t=almoco] .cz-cap b{font:400 36px/1 Yellowtail,cursive;color:#FFD9A8}
.cz[data-t=tarde] .cz-cap b{font:italic 400 28px/1.05 var(--serif,"Cormorant Garamond");color:#F6D9B8}
.cz[data-t=jantar] .cz-cap b{font:500 10.5px/1.4 var(--sans,Manrope);letter-spacing:.3em;text-transform:uppercase;color:#E9D6C0}
.cz-cap.out{opacity:0;transform:translateY(-6px)}
.cz-ent{position:absolute;inset:0;background:#140605;animation:czent 1.2s .1s cubic-bezier(.2,.7,.2,1) forwards;pointer-events:none}
@keyframes czent{to{opacity:0;visibility:hidden}}
@media(prefers-reduced-motion:reduce){.cz-s.on{animation:none}.cz-s,.cz{transition:none}.cz-ent{animation-duration:.01s}}
`;
let st = null;
const turno = h => { const d = document.documentElement.dataset.tema; if (/^(almoco|tarde|jantar)$/.test(d)) return d; return (h >= 18 || h < 5) ? "jantar" : h >= 16 ? "tarde" : "almoco"; };
const url = n => `/assets/f/${n}-g.webp`;
const bg = n => `url(${url(n)})`;
async function mostra(S, i) {
  const [n, nome, pos] = S.lista[i];
  const img = new Image(); img.src = url(n);
  try { await img.decode() } catch (e) { return false }
  const alvo = S.camadas[S.atual ^ 1];
  alvo.style.backgroundImage = bg(n); alvo.style.backgroundPosition = pos;
  alvo.classList.remove("on"); void alvo.offsetWidth;
  alvo.classList.add("on"); S.camadas[S.atual].classList.remove("on");
  S.atual ^= 1; S.i = i;
  S.cap.classList.add("out");
  setTimeout(() => { S.cap.innerHTML = nome ? `<b>${nome}</b>` : ""; S.cap.classList.remove("out") }, 500);
  return true;
}
export default function () {
  if (!document.getElementById("cz-css")) { const s = document.createElement("style"); s.id = "cz-css"; s.textContent = css; document.head.appendChild(s) }
  return '<div class="cz"><div class="cz-ph"><div class="cz-s"></div><div class="cz-s"></div><div class="cz-w"></div></div><div class="cz-v"></div><div class="cz-r"></div><div class="cz-top"></div><div class="cz-cap"></div><div class="cz-ent"></div></div>';
}
export function hora(el, h) {
  const t = turno(h), root = el.querySelector(".cz");
  if (!root) return;
  const c = TOM[t];
  root.dataset.t = t; root.style.setProperty("--czd", RIT[t][1] + "ms"); root.style.setProperty("--czbg", c[0]); root.style.setProperty("--czw", c[1]); root.style.setProperty("--czwa", c[2]); root.style.setProperty("--czv", c[3]); root.style.setProperty("--czr", t==="jantar"?"122,26,20":t==="tarde"?"150,34,40":"162,38,30"); root.style.setProperty("--czr2", t==="jantar"?"26,7,6":t==="tarde"?"37,16,27":"42,16,12");
  root.style.setProperty("--czh", t === "almoco" ? "84%" : t === "tarde" ? "82%" : "78%");
  root.style.setProperty("--czm", t === "almoco" ? "46%" : t === "tarde" ? "42%" : "38%");
  root.style.filter = t === "jantar" ? "contrast(1.08) saturate(.88) brightness(.94)" : t === "tarde" ? "saturate(1.05) sepia(.1)" : "saturate(1.25) contrast(1.04) brightness(1.04)";
  if (st && st.t === t && st.root === root) return;
  if (st && st.tm) clearInterval(st.tm);
  const S = st = { t, root, lista: SL[t], camadas: [...root.querySelectorAll(".cz-s")], cap: root.querySelector(".cz-cap"), atual: 1, i: 0 };
  mostra(S, 0);
  const reduz = matchMedia("(prefers-reduced-motion:reduce)").matches;
  if (!reduz) setTimeout(() => { if (st === S) S.tm = setInterval(() => mostra(S, (S.i + 1) % S.lista.length), RIT[t][0]) }, 6000);
}
export function agora() {
  const q = (location.search.match(/[?&]hora=([\d.]+)/) || [])[1];
  if (q) return parseFloat(q);
  const p = new Intl.DateTimeFormat("pt-BR", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: "America/Fortaleza" }).formatToParts(new Date());
  return +p.find(x => x.type === "hour").value + +p.find(x => x.type === "minute").value / 60;
}
