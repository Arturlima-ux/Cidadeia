import { CASA, ETAPAS, porId, brl } from "./data.js";
import { todas, MODO, vazia } from "./store.js";
import { I } from "./icons.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ini = n => (n || "?").trim().charAt(0).toUpperCase();
const params = new URLSearchParams(location.search);
let aba = ["salao", "cozinha", "bar"].includes(params.get("v")) ? params.get("v") : "salao";
let mesas = [], aberta = null, confirmar = null, API = null;
const min = ts => Math.max(0, Math.floor((Date.now() - ts) / 60000));
const tempo = ts => { const m = min(ts); return m < 1 ? "agora" : `${m} min`; };
function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, 2200); }

const CH = { garcom: ["Chamou o garçom", I.sino], agua: ["Pediu água", I.agua], conta: ["Pediu a conta", I.conta] };

const totalMesa = m => (m.combos.reduce((a, c) => a + c.preco, 0) + m.pedidos.reduce((a, p) => a + (p.preco || 0), 0)) * (1 + CASA.servico);
const ocupada = m => Object.keys(m.membros).length || m.pedidos.length || m.carrinho.length;

function abas() {
  const kNovos = mesas.reduce((a, m) => a + m.pedidos.filter(p => p.curso !== "bebida" && p.status === "recebido").length, 0);
  const bNovos = mesas.reduce((a, m) => a + m.pedidos.filter(p => p.curso === "bebida" && p.status === "recebido").length, 0);
  const cham = mesas.reduce((a, m) => a + m.chamados.filter(c => c.status === "aberto").length, 0);
  const b = (id, nome, n) => `<button data-aba="${id}" aria-pressed="${aba === id}">${nome}${n ? `<span class="n num">${n}</span>` : ""}</button>`;
  $("#abas").innerHTML = b("salao", "Salão", cham) + b("cozinha", "Cozinha", kNovos) + b("bar", "Bar", bNovos);
}

function vSalao() {
  const cham = mesas.flatMap(m => m.chamados.filter(c => c.status === "aberto").map(c => ({ m, c }))).sort((a, b) => a.c.em - b.c.em);
  return `<div class="salao"><div class="mesas">${mesas.map(m => {
    const oc = ocupada(m), chama = m.chamados.some(c => c.status === "aberto");
    const desde = Math.min(...Object.values(m.membros).map(x => x.desde), Date.now());
    const flag = m.conta.paga ? `<span class="st st-pronto">Paga</span>` : m.conta.pedida ? `<span class="st st-preparo">Conta</span>` : m.pedidos.some(p => p.status === "pronto") ? `<span class="st st-pronto">Prato pronto</span>` : "";
    return `<button class="m ${oc ? "" : "livre"} ${chama ? "chama" : ""}" data-mesa="${m.mesa}" aria-label="Mesa ${m.mesa}">
      <span class="eyebrow">Mesa</span><span class="n num">${m.mesa}</span><span class="flag">${flag}</span>
      <div class="rod">${oc ? `<span class="muted" style="font-size:.82rem">${Object.keys(m.membros).length} ${Object.keys(m.membros).length === 1 ? "pessoa" : "pessoas"} · ${tempo(desde)}</span><b class="num">${brl(totalMesa(m))}</b>` : `<span class="muted" style="font-size:.82rem">Livre</span>`}</div></button>`;
  }).join("")}</div>
  <aside class="lado"><h2>Chamados</h2>${cham.length ? cham.map(({ m, c }) => `<div class="cham"><span class="ic">${CH[c.tipo]?.[1] || I.sino}</span><div><b>Mesa ${m.mesa}</b><small>${CH[c.tipo]?.[0] || c.tipo}${c.por && m.membros[c.por] ? ` · ${esc(m.membros[c.por].nome)}` : ""} · ${tempo(c.em)}</small></div><button class="btn btn-c btn-sm" data-atender="${m.mesa}:${c.uid}">Atender</button></div>`).join("") : `<div class="vazio">Nenhum chamado. Quando uma mesa chamar, aparece aqui na hora.</div>`}</aside></div>`;
}

// Tickets: agrupa por mesa + curso + status
function tickets(filtro) {
  const g = new Map();
  for (const m of mesas) for (const p of m.pedidos) {
    if (!filtro(p) || p.status === "servido") continue;
    const k = `${m.mesa}|${p.curso}|${p.status}`;
    if (!g.has(k)) g.set(k, { mesa: m.mesa, curso: p.curso, status: p.status, em: p.em, itens: [], m });
    const t = g.get(k); t.itens.push(p); t.em = Math.min(t.em, p.em);
  }
  return [...g.values()].sort((a, b) => a.em - b.em);
}
const ACAO = { recebido: ["preparo", "Começar preparo"], preparo: ["pronto", "Marcar pronto"], pronto: ["servido", "Servido na mesa"] };
const CURSO = { bebida: "Bebidas", entrada: "Entrada", principal: "Principal", final: "Final" };
function vKDS(bar) {
  const ts = tickets(p => bar ? p.curso === "bebida" : p.curso !== "bebida");
  const cols = bar ? [["recebido", "Novos"], ["preparo", "Preparando"], ["pronto", "Prontos"]] : [["aguardando", "Em espera"], ["recebido", "Novos"], ["preparo", "No fogo"], ["pronto", "Prontos"]];
  return `<div class="kds" style="${bar ? "grid-template-columns:repeat(3,minmax(0,1fr))" : ""}">${cols.map(([s, nome]) => {
    const l = ts.filter(t => t.status === s);
    return `<div class="col"><div class="col-h"><h2>${nome}</h2><span class="eyebrow num">${l.length}</span></div>
      ${l.length ? l.map(t => {
        const agrup = new Map(); t.itens.forEach(p => { const k = p.id + "|" + (p.obs || ""); agrup.set(k, [...(agrup.get(k) || []), p]); });
        const atraso = s !== "aguardando" && min(t.em) >= (bar ? 8 : 15);
        return `<article class="tk" data-s="${s}"><div class="tk-h"><b>Mesa ${t.mesa}</b><span class="eyebrow">${CURSO[t.curso]}</span><span class="t num ${atraso ? "atraso" : ""}">${tempo(t.em)}</span></div>
          <ul>${[...agrup.values()].map(ps => `<li><span class="q num">${ps.length}×</span><span>${esc(porId(ps[0].id).nome)}${ps[0].obs ? `<em>${esc(ps[0].obs)}</em>` : ""}</span></li>`).join("")}</ul>
          ${s === "aguardando" ? `<small class="muted">A mesa avisa quando quiser. Você pode adiantar a mise en place.</small>` : `<button class="btn ${s === "pronto" ? "btn-g" : "btn-c"} btn-sm" data-avancar="${t.mesa}|${t.curso}|${s}">${ACAO[s][1]}</button>`}
        </article>`;
      }).join("") : `<div class="vazio">${s === "aguardando" ? "Nada em espera." : "Livre."}</div>`}</div>`;
  }).join("")}</div>`;
}

function gaveta(n) {
  const m = mesas.find(x => x.mesa === n); if (!m) return "";
  const st = { aguardando: "Em espera", recebido: "Recebido", preparo: "Em preparo", pronto: "Pronto", servido: "Servido" };
  return `<div class="gaveta" data-fechar-fundo><div class="g" role="dialog" aria-label="Mesa ${n}">
    <div style="display:flex;justify-content:space-between;align-items:start"><div><span class="eyebrow">Mesa</span><h2 class="num">${n}</h2></div><button class="btn btn-g btn-sm" data-fechar>Fechar</button></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${Object.values(m.membros).map(p => `<span class="chip"><span class="av" style="background:${p.cor};width:20px;height:20px;font-size:.6rem">${esc(ini(p.nome))}</span>${esc(p.nome)}</span>`).join("") || `<span class="muted">Ninguém sentado.</span>`}</div>
    <div><div class="eyebrow" style="margin-bottom:6px">Pedidos</div>${m.pedidos.length ? m.pedidos.map(p => `<div class="l"><span>${esc(porId(p.id).nome)}<br><small class="muted">${CURSO[p.curso]}${p.por && m.membros[p.por] ? " · " + esc(m.membros[p.por].nome) : ""}</small></span><span class="st st-${p.status}">${st[p.status]}</span></div>`).join("") : `<p class="muted">Sem pedidos.</p>`}</div>
    ${m.carrinho.length ? `<p class="muted">${m.carrinho.length} ${m.carrinho.length === 1 ? "item ainda não enviado" : "itens ainda não enviados"} pela mesa.</p>` : ""}
    <div class="l" style="border:0"><span class="eyebrow">Total com serviço</span><b class="serif num" style="font-size:1.8rem;font-weight:400">${brl(totalMesa(m))}</b></div>
    ${m.conta.paga ? `<span class="st st-pronto">Paga pelo app${m.avaliacao ? ` · avaliou ${m.avaliacao}/5` : ""}</span>` : ""}
    <button class="btn ${confirmar === n ? "btn-p" : "btn-g"}" data-liberar="${n}">${confirmar === n ? "Confirmar: liberar mesa e apagar pedidos" : "Liberar mesa"}</button>
  </div></div>`;
}

function render() {
  abas();
  $("#modo").textContent = MODO === "online" ? "Ao vivo" : "Demonstração";
  $("#main").innerHTML = aba === "salao" ? vSalao() : vKDS(aba === "bar");
  $("#camada").innerHTML = aberta ? gaveta(aberta) : "";
}

document.addEventListener("click", e => {
  const t = e.target.closest("button,[data-fechar-fundo]"); if (!t) return;
  if (t.matches("[data-fechar-fundo]") && e.target !== t) return;
  const d = t.dataset;
  if (d.aba) { aba = d.aba; history.replaceState(null, "", "?v=" + aba); render(); }
  else if (d.mesa) { aberta = +d.mesa; confirmar = null; render(); }
  else if (d.fechar !== undefined || d.fecharFundo !== undefined) { aberta = null; render(); }
  else if (d.atender) { const [n, u] = d.atender.split(":"); API.update(+n, s => { const c = s.chamados.find(x => x.uid === u); if (c) { c.status = "atendido"; c.atendidoEm = Date.now(); } }); }
  else if (d.avancar) {
    const [n, curso, s] = d.avancar.split("|"); const prox = ACAO[s][0];
    API.update(+n, m => m.pedidos.forEach(p => { if (p.curso === curso && p.status === s) { p.status = prox; if (prox !== "servido") p.em = Date.now(); } }));
  }
  else if (d.liberar) {
    const n = +d.liberar;
    if (confirmar !== n) { confirmar = n; render(); return; }
    API.update(n, m => Object.assign(m, vazia(n))); aberta = null; confirmar = null; toast(`Mesa ${n} liberada.`);
  }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && aberta) { aberta = null; render(); } });
API = todas(lista => {
  const antes = mesas; mesas = lista;
  const novos = lista.flatMap(m => m.chamados.filter(c => c.status === "aberto" && !antes.find(a => a.mesa === m.mesa)?.chamados.some(x => x.uid === c.uid)).map(c => ({ m: m.mesa, c })));
  if (antes.length && novos.length) toast(`Mesa ${novos[0].m}: ${CH[novos[0].c.tipo]?.[0].toLowerCase() || "chamado"}`);
  render();
});
const relogio = () => $("#relogio").textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
relogio(); setInterval(() => { relogio(); render(); }, 30000);
