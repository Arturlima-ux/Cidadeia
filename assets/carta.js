import { SECOES, PRATOS, porId } from "/assets/data.js";

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
const forcado = (new URLSearchParams(location.search).get("tema") || "").match(/^(almoco|tarde|jantar)$/)?.[0];
const relogio = () => { const h = +new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Fortaleza" }).slice(0, 2); return forcado || (h >= 5 && h < 16 ? "almoco" : h >= 16 && h < 18 ? "tarde" : "jantar"); };
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
  heroi: { almoco: "salmao", tarde: "gin", jantar: "mignon" },
  porta: { visita: "aperol", livro: "mar" },
  modulo: { executivo: ["pescada", "50% 45%"], comes: ["mar", "50% 50%"], bebes: ["margarita", "50% 42%"], vinhos: ["mignon", "92% 18%"] },
  item: { "ex-pescada": "pescada", "ex-bacalhau": "risoto", "ex-maria-maria": "churros", "mar-vermelho": "mar", "carne-de-sol-grelhada": "carne" },
};
// Cada foto existe em dois tamanhos; o navegador escolhe a nítida para a tela do aparelho
const src = n => (window.FOTOS_INLINE || {})[n] || `/assets/f/${n}-g.webp`;
const foto = (n, larg = "100vw") => (window.FOTOS_INLINE || {})[n] ? `src="${src(n)}"` : `src="/assets/f/${n}-g.webp" srcset="/assets/f/${n}-m.webp 720w, /assets/f/${n}-g.webp 1170w" sizes="${larg}"`;
function heroi() {
  if (SIS !== "foto") return;
  const n = FOTO.heroi[agora], h = $("#heroi");
  if (h.dataset.n === n) return;
  h.dataset.n = n; h.innerHTML = `<img ${foto(n)} alt="" decoding="async" fetchpriority="high">`;
}
// Mudança de foco: o que foi tocado fica nítido e acende; todo o resto perde o foco e sai, como uma câmera que reajusta.
let foco = [];
const desfoca = (els, dur = 560) => els.forEach((el, i) => foco.push(el.animate(
  [{ opacity: 1, filter: "blur(0px)", transform: "translateY(0)" }, { opacity: 0, filter: "blur(9px)", transform: "translateY(-10px)" }],
  { duration: dur, delay: i * 45, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" })));
const refoca = () => { foco.forEach(a => a.cancel()); foco = []; };
function acende(t, fim) {
  t.classList.add("abre");
  foco.push(t.animate([{ transform: "scale(1)" }, { transform: "scale(1.035)" }], { duration: 700, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }));
  setTimeout(fim, 680);
}
const PORTA = [["visita", "Escrever a visita", "Três toques e a casa escreve uma carta para você"], ["livro", "Folhear a carta", "Executivo, comes, bebes, vinhos e crepes"]];
function portas() {
  const el = document.querySelector(".portas"); if (SIS === "estante") return;
  if (SIS === "foto") el.innerHTML = PORTA.map(([ir, b, sm], k) => `<button class="vd" data-ir="${ir}" data-porta><span class="ft"><img ${foto(FOTO.porta[ir])} alt=""></span><span class="br"></span><small>${ROM[k]}</small><b>${b}</b><i>${sm}</i></button>`).join("");
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
      desfoca([...document.querySelectorAll("#abertura>.col>.sc, #abertura .verso, #abertura .orn, #abertura .pergunta, #abertura .onde-l"), ...[...document.querySelectorAll(".portas .vd")].filter(x => x !== t)]);
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
  const t = v.momento || agora;
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
const linha = i => `<li${FOTO.item[i.id] && SIS === "foto" ? ` class="cf"><figure><img ${foto(FOTO.item[i.id])} alt="${esc(i.nome)}" loading="lazy"></figure` : ""}><div class="l"><h4>${nomeHTML(i.nome)}</h4>${i.preco != null ? `<span class="pc">${preco(i.preco)}</span>` : ""}</div>${i.desc ? `<p>${esc(i.desc)}</p>` : ""}</li>`;
const secao = (x, n) => {
  const curta = x.sub && x.sub.length < 24, so = x.itens.every(i => !i.desc);
  return `<section class="sec${so ? " so" : ""}" id="s-${n}" data-n="${n}"><header><span class="sc">${String(n + 1).padStart(2, "0")}${curta ? " · " + esc(x.sub) : ""}</span><h3>${esc(x.nome)}</h3>${x.sub && !curta ? `<p>${esc(x.sub)}</p>` : ""}</header><ul>${x.itens.map(linha).join("")}</ul></section>`;
};
// Rodapé de livro: um fio com um traço por capítulo (o atual aceso) e o sumário completo a um toque.
let capAt = 0;
function rodape(m) {
  $("#caps").innerHTML = `<div><div class="fio-c">${m.secs.map((x, k) => `<button data-cap="${k}" aria-label="${esc(x.nome)}"><i></i></button>`).join("")}</div>
    <button class="rod" data-indice aria-label="Abrir o sumário"><span class="rm"></span><b></b><span class="su">Sumário</span></button></div>`;
  marca(0, true);
}
function marca(n, ja) {
  const m = MODS.find(x => x.id === mod); if (!m || !m.secs[n] || (n === capAt && !ja)) return;
  capAt = n;
  document.querySelectorAll("#caps .fio-c button").forEach((b, k) => { b.className = k < n ? "f" : k === n ? "a" : ""; });
  $("#caps .rm").textContent = ROM[n];
  const b = $("#caps .rod b"); b.textContent = m.secs[n].nome; b.classList.remove("troca"); void b.offsetWidth; b.classList.add("troca");
}
const vaiCap = n => document.getElementById("s-" + n)?.scrollIntoView({ behavior: calmo ? "auto" : "smooth", block: "start" });
function indice(on) {
  const m = MODS.find(x => x.id === mod);
  if (on && m) { $("#ind-t").textContent = m.nome; $("#ind-l").innerHTML = m.secs.map((x, n) => `<li style="animation-delay:${(.12 + .06 * n).toFixed(2)}s"><button data-cap="${n}" aria-current="${n === capAt}"><span>${ROM[n]}</span><b>${esc(x.nome)}</b><u></u><i>${x.itens.length}</i></button></li>`).join(""); }
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
  if (calmo || !("IntersectionObserver" in window)) return secs.forEach(x => x.classList.add("v"));
  const surge = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("v"); surge.unobserve(e.target); } }), { root: $("#livro"), rootMargin: "0px 0px -8% 0px" });
  espia = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && marca(+e.target.dataset.n)), { root: $("#livro"), rootMargin: "-22% 0px -72% 0px" });
  secs.forEach(x => { surge.observe(x); espia.observe(x); });
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

// ---------- Toques ----------
document.addEventListener("click", e => {
  if (cena === "abertura" && !document.body.classList.contains("pula")) document.body.classList.add("pula");
  if (e.target.closest("[data-mapa-fecha]") || (document.body.classList.contains("com-mapa") && !e.target.closest(".mapa"))) return mapa(false);
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset;
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
document.addEventListener("keydown", e => { if (e.key === "Escape") { mapa(false); indice(false); } if (e.key === "Enter" && e.target.id === "nome") { e.target.blur(); $("#escrever")?.click(); } });

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
