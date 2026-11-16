import { CASA, EXECUTIVO, ETAPAS, PRATOS, SECOES, CARTA, porId, brl } from "./data.js";
import { mesa as abrirMesa, uid, MODO } from "./store.js";
import { aura, pintar } from "./aura.js";
import { I } from "./icons.js";
import { refDe } from "./refs.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const N = Math.max(1, Math.min(99, parseInt(new URLSearchParams(location.search).get("m")) || 7));
const M = abrirMesa(N);
const CORES = ["#F4B9A8", "#C9D27A", "#F0C873", "#9EC3FF", "#E7A6D0", "#9FE0C9"];
const ini = n => (n || "?").trim().charAt(0).toUpperCase();

// Quem sou eu nesta mesa (lembrado neste aparelho)
const P = new URLSearchParams(location.search).get("p"); // aparelho simulado na demonstração
const EU_KEY = `pitanga:eu:${N}${P ? ":" + P : ""}`;
let eu = null;
try { eu = JSON.parse(localStorage.getItem(EU_KEY)); } catch {}
const salvarEu = () => { try { localStorage.setItem(EU_KEY, JSON.stringify(eu)); } catch {} };

let S = M.get();
let aba = "cardapio", segCard = "executivo";
const escolha = { entrada: null, principal: null, final: null };
let somMsgs = null, somOcupado = false;
let estrelas = 0;

function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, 2400); }
const membro = id => S.membros[id] || { nome: "Alguém", cor: "#888" };
const av = id => { const m = membro(id); return `<span class="av" style="background:${m.cor}" title="${esc(m.nome)}">${esc(ini(m.nome))}</span>`; };
// Sem foto: cada prato é uma página. Inicial em serifa com as cores dos ingredientes.
const inicial = n => (n || "?").replace(/^(mini|o|a|le|la)\s+/i, "").trim().charAt(0).toUpperCase();
const media = (it, cls = "") => {
  if (it.foto) return `<img src="${esc(it.foto)}" alt="" class="${cls}" loading="lazy">`;
  if (it.video) return `<video src="${esc(it.video)}" class="${cls}" autoplay muted loop playsinline></video>`;
  const a = it.aura || ["#E8473A"];
  return `<div class="pag ${cls}" style="--c1:${a[0]};--c2:${a[1] || a[0]};--c3:${a[2] || a[0]}" aria-hidden="true"><span class="pag-l">${esc(inicial(it.nome))}</span><span class="pag-d"><i></i><i></i><i></i></span></div>`;
};
const ilustrativo = () => "";
const refHTML = (it, cls = "ref") => refDe(it.id) ? `<span class="${cls}">${esc(refDe(it.id))}</span>` : "";

/* ================= Boas-vindas ================= */
function boasVindas() {
  const h = new Date().getHours();
  const saud = h < 12 ? "Bom dia." : h < 18 ? "Boa tarde." : "Boa noite.";
  $("#boas-h").innerHTML = `${saud}<br><em>Sua mesa</em> já está pronta.`;
  $("#boas-mesa").textContent = `Mesa ${N} · ${CASA.cidade}`;
  aura($("#boas-aura"), ["#E8473A", "#A0241F", "#B5C24F", "#F0C873"], "boas-" + N);
  const outros = Object.values(S.membros);
  if (outros.length) { const el = $("#boas-sentados"); el.hidden = false; el.innerHTML = `<span class="pilha">${Object.keys(S.membros).map(av).join("")}</span> ${outros.map(o => esc(o.nome)).join(", ")} já ${outros.length > 1 ? "estão" : "está"} na mesa`; }
  $("#boas-f").addEventListener("submit", e => {
    e.preventDefault();
    const nome = $("#boas-nome").value.trim().slice(0, 24); if (!nome) return;
    eu = { id: uid(), nome }; salvarEu();
    M.update(s => { s.membros[eu.id] = { nome, cor: CORES[Object.keys(s.membros).length % CORES.length], desde: Date.now() }; });
    $("#boas").animate([{ opacity: 1 }, { opacity: 0, transform: "scale(1.04)" }], { duration: 500, easing: "ease-out" }).finished.then(() => $("#boas").hidden = true);
    toast(`Bem-vindo, ${nome}.`);
  });
}

/* ================= Navegação ================= */
const ABAS = [
  { id: "cardapio", nome: "Cardápio", ic: I.menu },
  { id: "sommelier", nome: "Sommelier", ic: I.vinho },
  { id: "mesa", nome: "Mesa", ic: I.mesa },
  { id: "conta", nome: "Conta", ic: I.conta },
];
function nav() {
  const pend = S.carrinho.length, prontos = S.pedidos.filter(p => p.status === "pronto").length;
  $("#nav").innerHTML = ABAS.map(a => {
    const b = a.id === "mesa" && (pend || prontos) ? `<span class="badge num">${pend || prontos}</span>` : "";
    return `<button data-aba="${a.id}" ${aba === a.id ? 'aria-current="page"' : ""}>${a.ic}<span>${a.nome}</span>${b}</button>`;
  }).join("");
}
$("#nav").addEventListener("click", e => { const b = e.target.closest("[data-aba]"); if (b) ir(b.dataset.aba); });
function ir(a) { aba = a; nav(); render(); scrollTo({ top: 0 }); }

function topo() {
  $("#mesa-n").textContent = N;
  $("#pilha").innerHTML = Object.keys(S.membros).map(av).join("");
}

/* ================= Cardápio ================= */
function vCardapio() {
  const seg = `<div class="seg" role="group" aria-label="Cardápio">
    ${[["executivo", "Executivo"], ["carta", "Carta"], ["bebida", "Bebidas"], ["vinho", "Vinhos"]].map(([k, n]) => `<button data-seg="${k}" aria-pressed="${segCard === k}">${n}</button>`).join("")}</div>`;
  if (segCard !== "executivo") {
    const secs = SECOES.filter(s => s.tipo === segCard);
    return seg + `<div class="sugs" style="margin:-10px 0 18px">${secs.map(s => `<button data-ir-sec="${s.id}">${esc(s.nome)}</button>`).join("")}</div>` +
      secs.map(s => `<div class="grupo" id="sec-${s.id}"><h3>${esc(s.nome)}</h3>${s.sub ? `<p class="muted" style="margin:-4px 0 6px;font-size:.84rem">${esc(s.sub)}</p>` : ""}${s.itens.map(b => `
        <div class="linha"><button class="sw" data-ver="${b.id}" aria-label="Ver ${esc(b.nome)}" style="border:0;padding:0">${media(b)}</button>
        <button data-ver="${b.id}" style="all:unset;cursor:pointer;min-width:0"><b>${esc(b.nome)}</b>${refHTML(b, "ref ref-l")}${b.desc ? `<small>${esc(b.desc)}</small>` : ""}</button>
        <div class="pr"><span class="num">${brl(b.preco)}</span><button class="mais" data-add="${b.id}" aria-label="Adicionar ${esc(b.nome)}">${I.mais}</button></div></div>`).join("")}</div>`).join("");
  }
  const feito = ["entrada", "principal", "final"].filter(e => escolha[e]).length;
  return seg + `
    <div class="exec-head"><div><div class="eyebrow">Três tempos</div><h2>Menu Executivo</h2></div><div class="preco num">${brl(EXECUTIVO.preco)}</div></div>
    <p class="muted" style="margin:0">Monte o seu percurso: uma entrada, um principal e um final.</p>
    <div class="percurso">${["entrada", "principal", "final"].map(e => `<button data-ir-etapa="${e}" class="${escolha[e] ? "ok" : ""}"><span class="eyebrow">${ETAPAS[e].nome}</span><span class="n">${escolha[e] ? esc(porId(escolha[e]).nome) : "escolher"}</span></button>`).join("")}</div>
    ${["entrada", "principal", "final"].map(e => `
      <section class="etapa" id="et-${e}">
        <div class="etapa-t"><h3>${ETAPAS[e].nome}</h3><span class="eyebrow">${PRATOS.filter(p => p.etapa === e).length} opções</span></div>
        <div class="trilho">${PRATOS.filter(p => p.etapa === e).map(p => `
          <button class="card ${escolha[e] === p.id ? "esc" : ""}" data-ver="${p.id}" aria-label="${esc(p.nome)}">
            ${media(p)}<div class="sombra"></div>${ilustrativo(p)}
            ${escolha[e] === p.id ? `<span class="marca">${I.ok}</span>` : ""}
            <div class="txt">${refHTML(p, "ref ref-c")}<b>${esc(p.nome)}</b><span>${esc(p.desc)}</span></div>
          </button>`).join("")}</div>
      </section>`).join("")}
    <div class="add-exec" ${feito ? "" : "hidden"}><button class="btn btn-p" id="add-exec" ${feito < 3 ? "disabled" : ""}>${feito < 3 ? `Escolha ${3 - feito} ${3 - feito === 1 ? "item" : "itens"} para completar` : `Levar o percurso para a mesa · ${brl(EXECUTIVO.preco)}`}</button></div>`;
}

function ficha(id) {
  const it = porId(id); if (!it) return;
  const prato = !!it.etapa;
  const pares = (it.par || []).map(porId).filter(Boolean);
  const harmon = pares.length ? pares : [...PRATOS, ...CARTA].filter(p => (p.par || []).includes(it.id)).slice(0, 4);
  const camada = $("#camada");
  camada.innerHTML = `<div class="folha" role="dialog" aria-modal="true" aria-label="${esc(it.nome)}">
    <div class="hero">${media(it)}<div class="sombra"></div>${ilustrativo(it)}<button class="fechar" data-fechar aria-label="Fechar">${I.x}</button></div>
    <div class="corpo wrap">
      <div class="eyebrow">${prato ? `Menu Executivo · ${ETAPAS[it.etapa].nome}` : esc(it.grupo)}</div>
      <h2>${esc(it.nome)}</h2>
      ${refHTML(it, "ref ref-f")}
      ${it.desc ? `<p class="desc">${esc(it.desc)}</p>` : ""}
      <div class="ings">${(it.ing || []).map(i => `<span class="chip">${esc(i)}</span>`).join("")}${(it.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      ${harmon.length ? `<div class="par"><div class="eyebrow">${pares.length ? "O sommelier sugere" : "Vai bem com"}</div>
        <div class="par-l">${harmon.map(h => `<div class="par-i"><div class="sw">${media(h)}</div><div><b>${esc(h.nome)}</b><br><small class="muted">${h.preco ? brl(h.preco) : ETAPAS[h.etapa]?.nome || ""}</small></div>
        ${h.preco ? `<button class="mais" data-add="${h.id}" aria-label="Adicionar ${esc(h.nome)}">${I.mais}</button>` : `<button class="mais" data-ver="${h.id}" aria-label="Ver ${esc(h.nome)}">${I.seta}</button>`}</div>`).join("")}</div></div>` : ""}
      ${prato ? "" : `<textarea class="obs" id="obs-f" rows="1" placeholder="Alguma observação? Ex.: ponto da carne, sem gelo"></textarea>`}
    </div>
    <div class="acao"><div class="wrap">${prato
      ? `<button class="btn btn-p btn-block" data-escolher="${it.id}">${escolha[it.etapa] === it.id ? "Escolhido para o seu percurso ✓" : `Escolher como ${ETAPAS[it.etapa].nome.toLowerCase()}`}</button>`
      : `<button class="btn btn-p btn-block" data-add="${it.id}" data-fecha="1">Adicionar à mesa · ${brl(it.preco)}</button>`}</div></div>
  </div>`;
  pintar(camada, porId);
  document.body.style.overflow = "hidden";
}
function fecharCamada() { $("#camada").innerHTML = ""; document.body.style.overflow = ""; }

function addBebida(id, obs = "") {
  if (!eu) return;
  M.update(s => { s.carrinho.push({ uid: uid(), tipo: "item", id, por: eu.id, obs }); });
  toast(`${porId(id).nome} na mesa. Envie quando quiser.`);
}
function addPercurso() {
  if (!eu || !escolha.entrada || !escolha.principal || !escolha.final) return;
  const itens = { ...escolha };
  M.update(s => { s.carrinho.push({ uid: uid(), tipo: "combo", itens, por: eu.id, obs: "" }); });
  escolha.entrada = escolha.principal = escolha.final = null;
  toast("Percurso na mesa. Falta só enviar.");
  ir("mesa");
}

/* ================= Sommelier ================= */
const CHIPS = ["Algo leve e cítrico", "Um tinto para a carne", "Sem álcool, por favor", "O que combina com o que pedimos?", "Me surpreenda"];
function vSommelier() {
  if (!somMsgs) somMsgs = [{ de: "ele", texto: `${eu ? esc(eu.nome) + ", " : ""}boa ${new Date().getHours() < 18 ? "tarde" : "noite"}. Me conte o que você vai comer ou o que está com vontade de beber, e eu sugiro o que a casa tem de melhor para isso.`, sug: [] }];
  return `<div class="som">
    <div class="som-head"><div class="selo"><canvas id="selo-aura"></canvas></div><div><div class="eyebrow">Sommelier da casa</div><h2>Harmonização</h2></div></div>
    <div class="msgs" id="msgs">${somMsgs.map(msgHTML).join("")}${somOcupado ? `<div class="msg ele digitando"><i></i><i></i><i></i></div>` : ""}</div>
    <div class="sugs">${CHIPS.map(c => `<button data-chip="${esc(c)}">${esc(c)}</button>`).join("")}</div>
    <form class="som-in" id="som-f"><input id="som-t" placeholder="Pergunte ao sommelier…" autocomplete="off" aria-label="Mensagem para o sommelier"><button aria-label="Enviar">${I.enviar}</button></form>
  </div>`;
}
function msgHTML(m) {
  if (m.de === "eu") return `<div class="msg eu">${esc(m.texto)}</div>`;
  const sug = (m.sug || []).map(porId).filter(Boolean);
  return `<div class="msg ele">${esc(m.texto)}${sug.length ? `<div class="sug">${sug.map(h => `<div class="par-i"><div class="sw">${media(h)}</div><div><b>${esc(h.nome)}</b><br><small class="muted">${h.preco ? brl(h.preco) : "Menu Executivo"}</small></div>
    ${h.preco ? `<button class="mais" data-add="${h.id}" aria-label="Adicionar ${esc(h.nome)}">${I.mais}</button>` : `<button class="mais" data-ver="${h.id}" aria-label="Ver ${esc(h.nome)}">${I.seta}</button>`}</div>`).join("")}</div>` : ""}</div>`;
}
function contextoMesa() {
  const ids = [];
  [...S.carrinho, ...S.pedidos].forEach(c => { if (c.tipo === "combo") ids.push(...Object.values(c.itens)); else if (c.id) ids.push(c.id); });
  return [...new Set(ids)];
}
async function perguntar(texto) {
  if (somOcupado || !texto.trim()) return;
  somMsgs.push({ de: "eu", texto }); somOcupado = true; render();
  let r = null;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 14000);
    const res = await fetch("/api/sommelier", { method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({ mensagens: somMsgs.slice(-8).map(m => ({ role: m.de === "eu" ? "user" : "assistant", content: m.texto })), mesa: contextoMesa(), nome: eu?.nome }) });
    clearTimeout(t);
    if (res.ok) { const j = await res.json(); if (j?.texto) r = { texto: j.texto, sug: (j.sugestoes || []).filter(porId).slice(0, 3) }; }
  } catch {}
  if (!r) r = somLocal(texto);
  somMsgs.push({ de: "ele", ...r }); somOcupado = false;
  if (aba === "sommelier") { render(); requestAnimationFrame(() => scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })); }
}
// Resposta de reserva, sem IA, a partir das harmonizações cadastradas.
function somLocal(t) {
  const q = t.toLowerCase();
  const pedidos = contextoMesa().map(porId).filter(x => x?.etapa || x?.tipo === "carta");
  if (/sem [áa]lcool|n[ãa]o bebo|zero/.test(q)) return { texto: "Sem álcool, a cajuína é a escolha da terra. Se quiser um drink, o Virginia Woolf é o autoral sem álcool da casa: limão, abacaxi, gengibre e hibisco.", sug: ["cajuina", "virginia-woolf", "agua-mineral-com-gas"] };
  if (/tinto|carne|encorpad/.test(q)) return { texto: "Para carne, um tinto com fruta e taninos macios. Se for só para você, o Mancura Cabernet de 187 ml; para a mesa, o Dom Nicolas Malbec ou o Errazuriz Carménère.", sug: ["mancura-cabernet-sauvignon-187-ml-chl", "dom-nicolas-malbec-arg", "errazuriz-reserva-carmenere-chl"] };
  if (/leve|c[íi]tric|fresc|peixe/.test(q)) return { texto: "Leve e cítrico: um Sauvignon Blanc chileno vai muito bem com peixes e camarões. Se preferir um drink, a Clarice Lispector, de gin, limão e graviola, é fresca e aromática.", sug: ["mancura-sauvignon-blanc-187-ml-chl", "clarice-lispector", "picaron-sauvigon-blanc-chl"] };
  if (/cerveja|chopp/.test(q)) return { texto: "Uma cerveja bem gelada acompanha tudo que é crocante e salgado, como as Batatinhas do Pitanga e os Croquetes.", sug: ["heineken-600-ml", "stella-pure-gold"] };
  if (/doce|sobremesa/.test(q)) return { texto: "Para fechar, o Negro Amor com um espresso é um final clássico. Se a mesa gosta de algo mais leve, a Anunciação com um Moscatel é uma ótima surpresa.", sug: ["negro-amor", "anunciacao", "valmarino-moscatel-bra"] };
  if (pedidos.length) {
    const p = pedidos.find(x => x.etapa === "principal" || x.curso === "principal") || pedidos[0];
    const sug = (p.par || []).slice(0, 2);
    if (sug.length) return { texto: `Com ${p.nome} na mesa, eu iria de ${sug.map(s => porId(s).nome).join(" ou ")}. Realça o prato sem pesar.`, sug };
  }
  return { texto: "Para começar, um drink autoral: a Simone de Beauvoir leva gin, clitória, pêssego e tônica, e chega à mesa em tom violeta. Com o Carpaccio Torquato, é um ótimo começo de prosa.", sug: ["simone-de-beauvoir", "carpaccio-torquato"] };
}

/* ================= Mesa ================= */
const STATUS = { aguardando: "Em espera", recebido: "Recebido", preparo: "Em preparo", pronto: "Pronto", servido: "Servido" };
const PASSO = { aguardando: 0, recebido: 1, preparo: 2, pronto: 3, servido: 4 };
function vMesa() {
  const car = S.carrinho;
  const meuTotal = car.reduce((a, c) => a + (c.tipo === "combo" ? EXECUTIVO.preco : porId(c.id).preco), 0);
  const carrinho = car.length ? `<section class="secao"><h2>Ainda não enviado</h2><p>Todos na mesa veem e podem completar o pedido.</p>
    <div class="bloco">${car.map(c => c.tipo === "combo" ? `<div class="it">${av(c.por)}<div class="nm"><b>Menu Executivo</b><small>${["entrada", "principal", "final"].map(e => esc(porId(c.itens[e]).nome)).join(" · ")}</small></div><div style="display:flex;align-items:center;gap:4px"><span class="num">${brl(EXECUTIVO.preco)}</span><button class="x" data-tirar="${c.uid}" aria-label="Remover">${I.x}</button></div></div>`
      : `<div class="it">${av(c.por)}<div class="nm"><b>${esc(porId(c.id).nome)}</b>${c.obs ? `<small>${esc(c.obs)}</small>` : ""}</div><div style="display:flex;align-items:center;gap:4px"><span class="num">${brl(porId(c.id).preco)}</span><button class="x" data-tirar="${c.uid}" aria-label="Remover">${I.x}</button></div></div>`).join("")}</div>
    ${car.some(c => c.tipo === "combo" || ["principal", "final"].includes(porId(c.id)?.curso)) ? `<div class="ritmo"><div class="eyebrow" style="margin-top:6px">Ritmo da mesa</div>
      ${["principal", "final"].map(e => `<div class="ritmo-l"><span>${ETAPAS[e].nome}</span><div class="tg"><button data-ritmo="${e}:sequencia" aria-pressed="${S.ritmo[e] === "sequencia"}">Em sequência</button><button data-ritmo="${e}:segurar" aria-pressed="${S.ritmo[e] === "segurar"}">Quando pedirmos</button></div></div>`).join("")}</div>` : ""}
    <button class="btn btn-p btn-block" id="enviar" style="margin-top:16px">${I.chef} Enviar para a cozinha · <span class="num">${brl(meuTotal)}</span></button></section>` : "";

  const ped = S.pedidos;
  const cursos = [["bebida", "Bebidas"], ["entrada", "Entradas"], ["principal", "Principais"], ["final", "Finais"]].map(([k, nome]) => {
    const l = ped.filter(p => p.curso === k); if (!l.length) return "";
    const segura = l.some(p => p.status === "aguardando");
    const prog = l.reduce((a, p) => a + PASSO[p.status], 0) / (l.length * 4) * 100;
    return `<div class="curso"><div class="curso-h"><h3>${nome}</h3><span class="eyebrow num">${l.filter(p => p.status === "servido").length}/${l.length} servidos</span></div>
      <div class="bloco">${l.map(p => `<div class="it">${av(p.por)}<div class="nm"><b>${esc(porId(p.id).nome)}</b>${p.obs ? `<small>${esc(p.obs)}</small>` : ""}</div><span class="st st-${p.status}">${STATUS[p.status]}</span></div>`).join("")}</div>
      <div class="barra-p"><i style="width:${prog}%"></i></div>
      ${segura ? `<button class="btn btn-c liberar" data-liberar="${k}">${I.fogo} Pode trazer ${k === "final" ? "os finais" : "os principais"}</button>` : ""}</div>`;
  }).join("");

  const chamadoAberto = t => S.chamados.some(c => c.tipo === t && c.status === "aberto");
  const ultimaRodada = ped.filter(p => p.curso === "bebida");
  return `${carrinho}
    <section class="secao"><h2>Na cozinha</h2><p>${ped.length ? "Acompanhe cada prato em tempo real." : ""}</p>
      ${ped.length ? cursos : `<div class="vazio"><span class="serif">Nada pedido ainda.</span>Monte seu percurso no cardápio ou peça uma bebida.</div>`}</section>
    <section class="secao"><h2>Serviço</h2><p>Um toque e o salão é avisado.</p>
      <div class="servico">
        <button data-chamar="garcom" class="${chamadoAberto("garcom") ? "on" : ""}">${I.sino}<div><b>${chamadoAberto("garcom") ? "Garçom a caminho" : "Chamar o garçom"}</b><br><small>${chamadoAberto("garcom") ? "Já avisamos o salão" : "Para qualquer coisa"}</small></div></button>
        <button data-chamar="rodada" ${ultimaRodada.length ? "" : "disabled style='opacity:.4'"}>${I.repetir}<div><b>Mais uma rodada</b><br><small>${ultimaRodada.length ? "Repete as bebidas da mesa" : "Peça a primeira bebida"}</small></div></button>
        <button data-chamar="agua" class="${chamadoAberto("agua") ? "on" : ""}">${I.agua}<div><b>Água para a mesa</b><br><small>${chamadoAberto("agua") ? "A caminho" : "O garçom traz"}</small></div></button>
        <button data-ir="conta">${I.conta}<div><b>Fechar a conta</b><br><small>Pix na mesa ou com o garçom</small></div></button>
      </div></section>`;
}
function enviar() {
  if (!S.carrinho.length) return;
  M.update(s => {
    for (const c of s.carrinho) {
      if (c.tipo === "combo") {
        const cid = uid();
        s.combos.push({ cid, por: c.por, preco: EXECUTIVO.preco });
        for (const e of ["entrada", "principal", "final"]) {
          const segura = e !== "entrada" && s.ritmo[e] === "segurar";
          s.pedidos.push({ uid: uid(), id: c.itens[e], curso: e, cid, por: c.por, obs: c.obs, preco: 0, status: segura ? "aguardando" : "recebido", em: Date.now() });
        }
      } else {
        const curso = porId(c.id).curso || "bebida";
        const segura = (curso === "principal" || curso === "final") && s.ritmo[curso] === "segurar";
        s.pedidos.push({ uid: uid(), id: c.id, curso, por: c.por, obs: c.obs, preco: porId(c.id).preco, status: segura ? "aguardando" : "recebido", em: Date.now() });
      }
    }
    s.carrinho = [];
  });
  toast("Pedido na cozinha. Acompanhe aqui.");
}

/* ================= Conta ================= */
let divisao = "igual";
function totais() {
  const sub = S.combos.reduce((a, c) => a + c.preco, 0) + S.pedidos.reduce((a, p) => a + (p.preco || 0), 0);
  const serv = Math.round(sub * CASA.servico * 100) / 100;
  return { sub, serv, total: sub + serv };
}
function porPessoa() {
  const m = {};
  S.combos.forEach(c => m[c.por] = (m[c.por] || 0) + c.preco);
  S.pedidos.forEach(p => { if (p.preco) m[p.por] = (m[p.por] || 0) + p.preco; });
  Object.keys(m).forEach(k => m[k] = m[k] * (1 + CASA.servico));
  return m;
}
function vConta() {
  if (S.conta.paga) return `<div class="fim"><div class="logo" style="font-size:3rem">Pitanga</div><h2>Obrigado${eu ? ", " + esc(eu.nome) : ""}.</h2><p class="muted" style="max-width:30ch;margin:0">Conta encerrada. Como foi a sua experiência hoje?</p>
    <div class="estrelas">${[1, 2, 3, 4, 5].map(n => `<button data-estrela="${n}" class="${n <= (S.avaliacao || estrelas) ? "on" : ""}" aria-label="${n} estrela${n > 1 ? "s" : ""}">${I.estrela}</button>`).join("")}</div>
    ${S.avaliacao ? `<p class="muted">Obrigado pela avaliação. Volte sempre.</p>` : ""}</div>`;
  const { sub, serv, total } = totais();
  if (!sub) return `<section class="secao"><h2>Conta</h2><div class="vazio"><span class="serif">Ainda não há consumo.</span>Quando a mesa pedir, a conta aparece aqui, item por item.</div></section>`;
  const linhas = [
    ...S.combos.map(c => ({ por: c.por, nome: "Menu Executivo", v: c.preco })),
    ...S.pedidos.filter(p => p.preco).map(p => ({ por: p.por, nome: porId(p.id).nome, v: p.preco })),
  ];
  const pessoas = S.conta.pessoas || Math.max(1, Object.keys(S.membros).length);
  const pp = porPessoa();
  return `<section class="secao"><h2>Conta</h2><p>Mesa ${N} · ${Object.keys(S.membros).length} ${Object.keys(S.membros).length === 1 ? "pessoa" : "pessoas"}</p>
    <div class="bloco">${linhas.map(l => `<div class="it">${av(l.por)}<div class="nm"><b>${esc(l.nome)}</b></div><span class="num">${brl(l.v)}</span></div>`).join("")}</div>
    <div style="padding:10px 4px 0">
      <div class="lin-c"><span>Subtotal</span><span class="num">${brl(sub)}</span></div>
      <div class="lin-c"><span>Serviço (${Math.round(CASA.servico * 100)}%)</span><span class="num">${brl(serv)}</span></div>
      <div class="total"><span class="eyebrow">Total</span><b class="num">${brl(total)}</b></div>
    </div></section>
    <section class="secao"><h2 style="font-size:1.6rem">Dividir</h2>
      <div class="div-op"><button data-div="igual" aria-pressed="${divisao === "igual"}">Em partes iguais</button><button data-div="cada" aria-pressed="${divisao === "cada"}">Cada um o seu</button><button data-div="tudo" aria-pressed="${divisao === "tudo"}">Eu pago tudo</button></div>
      ${divisao === "igual" ? `<div class="passo"><button data-pessoas="-1" aria-label="Menos uma pessoa">${I.menos}</button><span class="num"><b class="serif" style="font-size:1.6rem">${pessoas}</b> ${pessoas === 1 ? "pessoa" : "pessoas"}</span><button data-pessoas="1" aria-label="Mais uma pessoa">${I.mais}</button></div>
        <p class="muted" style="text-align:center;margin:4px 0 0">Cada um paga <b class="num" style="color:var(--cream)">${brl(total / pessoas)}</b></p>` : ""}
      ${divisao === "cada" ? `<div class="cada">${Object.entries(pp).map(([id, v]) => `<div>${av(id)} <span style="flex:1;margin-left:10px">${esc(membro(id).nome)}${eu && id === eu.id ? " (você)" : ""}</span><b class="num">${brl(v)}</b></div>`).join("")}</div>` : ""}
    </section>
    <button class="btn btn-p btn-block" id="pagar">${I.qr} Pagar com Pix · <span class="num">${brl(valorMeu())}</span></button>
    <button class="btn btn-g btn-block" data-chamar="conta" style="margin-top:10px">${S.chamados.some(c => c.tipo === "conta" && c.status === "aberto") ? "Garçom trazendo a conta" : "Prefiro pagar com o garçom"}</button>`;
}
function valorMeu() {
  const { total } = totais();
  if (divisao === "tudo") return total;
  if (divisao === "cada") return eu ? (porPessoa()[eu.id] || 0) : 0;
  return total / (S.conta.pessoas || Math.max(1, Object.keys(S.membros).length));
}
async function abrirPix() {
  const v = valorMeu();
  const c = $("#camada");
  c.innerHTML = `<div class="pix" data-fechar-fundo><div class="p" role="dialog" aria-modal="true" aria-label="Pagamento com Pix">
    <div class="eyebrow">Pix · Pitanga Gastrobar</div><b class="serif num" style="font-size:2.6rem;line-height:1">${brl(v)}</b>
    <div class="qr"><canvas id="qr"></canvas><div class="demo">DEMONSTRAÇÃO</div></div>
    <p class="muted" style="margin:0;max-width:32ch;font-size:.85rem">Modo demonstração: nenhum valor é cobrado. Na versão final, este código vem do banco da casa e a confirmação chega sozinha.</p>
    <button class="btn btn-c btn-block" id="pix-ok">Simular pagamento confirmado</button>
    <button class="btn btn-g btn-block" data-fechar>Voltar</button></div></div>`;
  try {
    if (!window.qrcode) await new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    const q = qrcode(0, "M"); q.addData(`DEMONSTRACAO-PITANGA-MESA${N}-SEM-VALOR`); q.make();
    const n = q.getModuleCount(), cv = $("#qr"), x = cv.getContext("2d"); cv.width = cv.height = n;
    x.fillStyle = "#fff"; x.fillRect(0, 0, n, n); x.fillStyle = "#120B0A";
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(k, r, 1, 1);
  } catch {}
}

/* ================= Render ================= */
function render() {
  topo(); nav();
  const main = $("#main");
  const html = aba === "cardapio" ? vCardapio() : aba === "sommelier" ? vSommelier() : aba === "mesa" ? vMesa() : vConta();
  main.innerHTML = `<div class="vista">${html}</div>`;
  pintar(main, porId);
  if (aba === "sommelier") { const c = $("#selo-aura"); c && aura(c, ["#8E1F3A", "#E8473A", "#F0C873"], "som", { animar: true }); }
}
// Atualiza sem perder rolagem quando outra pessoa mexe na mesa
function aoMudar(novo) {
  const antes = S; S = novo;
  if (eu && antes.membros[eu.id] && !novo.membros[eu.id]) { // a casa liberou a mesa
    try { localStorage.removeItem(EU_KEY); } catch {}
    location.reload(); return;
  }
  topo(); nav();
  if (aba === "mesa" || aba === "conta") { const y = scrollY; render(); scrollTo({ top: y }); }
  // avisos
  const prontos = novo.pedidos.filter(p => p.status === "pronto" && antes.pedidos.find(a => a.uid === p.uid)?.status !== "pronto");
  if (prontos.length && antes.atualizado) { toast(`${porId(prontos[0].id).nome} está pronto e a caminho.`); navigator.vibrate?.(60); }
  const atendido = novo.chamados.find(c => c.status === "atendido" && antes.chamados.find(a => a.uid === c.uid)?.status === "aberto");
  if (atendido) toast(atendido.tipo === "agua" ? "Água a caminho." : "O garçom já está vindo.");
  if (novo.conta.paga && !antes.conta.paga && aba !== "conta") ir("conta");
}

/* ================= Eventos ================= */
document.addEventListener("click", e => {
  const t = e.target.closest("button,[data-fechar-fundo]"); if (!t) return;
  if (t.matches("[data-fechar-fundo]") && e.target !== t) return;
  const d = t.dataset;
  if (d.seg) { segCard = d.seg; render(); }
  else if (d.ver) ficha(d.ver);
  else if (d.fechar !== undefined || d.fecharFundo !== undefined) fecharCamada();
  else if (d.irSec) $("#sec-" + d.irSec)?.scrollIntoView({ behavior: "smooth", block: "start" });
  else if (d.irEtapa) $("#et-" + d.irEtapa)?.scrollIntoView({ behavior: "smooth", block: "start" });
  else if (d.escolher) {
    const it = porId(d.escolher); escolha[it.etapa] = it.id; fecharCamada(); render();
    const prox = ["entrada", "principal", "final"].find(e => !escolha[e]);
    if (prox) { toast(`${ETAPAS[it.etapa].nome} escolhida. Agora, ${ETAPAS[prox].nome.toLowerCase()}.`); setTimeout(() => $("#et-" + prox)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); }
    else { toast("Percurso completo."); setTimeout(() => $("#add-exec")?.scrollIntoView({ behavior: "smooth", block: "center" }), 120); }
  }
  else if (d.add) { addBebida(d.add, $("#obs-f")?.value.trim() || ""); if (d.fecha) fecharCamada(); }
  else if (t.id === "add-exec") addPercurso();
  else if (d.chip) perguntar(d.chip);
  else if (d.tirar) M.update(s => { s.carrinho = s.carrinho.filter(c => c.uid !== d.tirar); });
  else if (d.ritmo) { const [e, v] = d.ritmo.split(":"); M.update(s => { s.ritmo[e] = v; }); }
  else if (t.id === "enviar") enviar();
  else if (d.liberar) { M.update(s => { s.pedidos.forEach(p => { if (p.curso === d.liberar && p.status === "aguardando") { p.status = "recebido"; p.em = Date.now(); } }); }); toast("Avisamos a cozinha. Já vai sair."); }
  else if (d.chamar) {
    if (d.chamar === "rodada") {
      const bebidas = S.pedidos.filter(p => p.curso === "bebida");
      const ultimas = [...new Map(bebidas.map(b => [b.id + b.por, b])).values()];
      M.update(s => ultimas.forEach(b => s.pedidos.push({ ...b, uid: uid(), status: "recebido", em: Date.now() })));
      toast(`Mais uma rodada: ${ultimas.length} ${ultimas.length === 1 ? "bebida" : "bebidas"} a caminho.`);
    } else if (!S.chamados.some(c => c.tipo === d.chamar && c.status === "aberto")) {
      M.update(s => { s.chamados.push({ uid: uid(), tipo: d.chamar, por: eu?.id, em: Date.now(), status: "aberto" }); if (d.chamar === "conta") s.conta.pedida = true; });
      toast(d.chamar === "agua" ? "Pedimos água para a mesa." : d.chamar === "conta" ? "O garçom vai trazer a conta." : "O salão foi avisado.");
    }
  }
  else if (d.ir) ir(d.ir);
  else if (d.div) { divisao = d.div; render(); }
  else if (d.pessoas) M.update(s => { s.conta.pessoas = Math.max(1, Math.min(20, (s.conta.pessoas || Object.keys(s.membros).length || 1) + Number(d.pessoas))); });
  else if (t.id === "pagar") abrirPix();
  else if (t.id === "pix-ok") { fecharCamada(); M.update(s => { s.conta.paga = true; s.conta.pagoEm = Date.now(); s.conta.valor = totais().total; }); }
  else if (d.estrela) { estrelas = +d.estrela; M.update(s => { s.avaliacao = estrelas; }); }
});
document.addEventListener("submit", e => { if (e.target.id === "som-f") { e.preventDefault(); const i = $("#som-t"); const v = i.value; i.value = ""; perguntar(v); } });
document.addEventListener("keydown", e => { if (e.key === "Escape") fecharCamada(); });

/* ================= Início ================= */
const nomeAuto = new URLSearchParams(location.search).get("nome");
if (!eu && nomeAuto) { eu = { id: uid(), nome: nomeAuto.slice(0, 24) }; salvarEu(); }
// A página de apresentação pode trocar a aba deste celular
addEventListener("message", e => { if (e.origin === location.origin && e.data?.pitanga === "aba" && ABAS.some(a => a.id === e.data.aba)) { if (e.data.seg) segCard = e.data.seg; ir(e.data.aba); } });
if (!eu || !S.membros[eu.id]) {
  if (eu && !S.membros[eu.id]) { // mesa foi liberada e reaberta: senta de novo com o mesmo nome
    M.update(s => { s.membros[eu.id] = { nome: eu.nome, cor: CORES[Object.keys(s.membros).length % CORES.length], desde: Date.now() }; });
    $("#boas").hidden = true;
  } else boasVindas();
} else $("#boas").hidden = true;
M.subscribe(aoMudar);
render();
document.documentElement.dataset.modo = MODO;
