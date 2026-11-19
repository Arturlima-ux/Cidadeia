// Minha mesa: anotações do cliente sobre o cardápio. Marca o que quer enquanto navega, vê a soma
// dos preços e mostra a lista ao garçom. Nada é enviado: o pedido é feito com o garçom.
const CHAVE = "pitanga-minha-mesa";
let M = [], preco = x => x, esc = x => x, ITENS = new Map(), lista = {};
const $ = s => document.querySelector(s);

const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || "{}") || {}; } catch (e) { return {}; } };
const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) { } };
const dinheiro = n => String(preco(Math.round(n * 100) / 100));

const qtd = () => Object.values(lista).reduce((a, n) => a + n, 0);
const soma = () => Object.entries(lista).reduce((a, [id, n]) => a + (ITENS.get(id)?.i.preco ?? 0) * n, 0);
const semPreco = () => Object.keys(lista).some(id => ITENS.get(id)?.i.preco == null);
const itens = q => q + (q === 1 ? " item" : " itens");

function pinta() {
  document.querySelectorAll(".mk[data-id]").forEach(el => {
    const id = el.dataset.id, n = lista[id] || 0;
    if (!el.dataset.ok) {
      const nome = esc(ITENS.get(id)?.i.nome || "");
      el.innerHTML = `<button class="mn" data-mk="-" data-id="${id}" aria-label="Tirar um: ${nome}"><i></i></button><span class="q" aria-live="polite"></span><button class="vz" data-mk="+" data-id="${id}" aria-label="Marcar: ${nome}"><i></i></button>`;
      el.dataset.ok = "1";
    }
    el.classList.toggle("on", n > 0);
    if (n > 0) el.querySelector(".q").textContent = n;
    el.closest("li")?.classList.toggle("marcado", n > 0);
  });
  const q = qtd(), t = soma(), il = $("#mm-ilha");
  if (il) {
    il.classList.toggle("tem", q > 0);
    if (q > 0) {
      $("#mm-iq").textContent = itens(q);
      const v = il.querySelector(".vt"), txt = t ? "R$ " + dinheiro(t) : "";
      if (v.textContent !== txt) { v.textContent = txt; il.classList.remove("nota"); void il.offsetWidth; il.classList.add("nota"); }
    }
  }
  if (document.body.classList.contains("com-minha")) atualiza();
}

function grupos() {
  const g = new Map();
  Object.entries(lista).forEach(([id, n]) => {
    const it = ITENS.get(id); if (!it) return;
    if (!g.has(it.mod)) g.set(it.mod, []);
    g.get(it.mod).push({ ...it.i, n, id });
  });
  return [...M].map(m => [m.nome, g.get(m.nome)]).filter(([, l]) => l);
}

// ---- a comanda ----
let montados = "";
function monta() {
  const g = grupos(), vazio = !g.length;
  $("#mm-corpo").innerHTML = vazio
    ? `<p class="mm-vazio">Nada marcado ainda.<br>Toque no “+” ao lado de um prato ou bebida.</p>`
    : g.map(([nome, its]) => `<h4>${esc(nome)}</h4><ul>${its.map(i => `<li data-id="${i.id}"><span class="n">${esc(i.nome)}</span><u></u><span class="st"><button data-mk="-" data-id="${i.id}" aria-label="Tirar um: ${esc(i.nome)}">−</button><b></b><button data-mk="+" data-id="${i.id}" aria-label="Mais um: ${esc(i.nome)}">+</button></span><span class="v${i.preco == null ? " sp" : ""}"></span></li>`).join("")}</ul>`).join("");
  montados = Object.keys(lista).sort().join("|");
  $("#mm-pe").hidden = vazio;
  atualiza();
}

function totais() {
  $("#mm-vt").textContent = "R$ " + dinheiro(soma());
  $("#mm-nit").textContent = itens(qtd());
  $("#mm-nota").hidden = !semPreco();
}

function atualiza() {
  if (Object.keys(lista).sort().join("|") !== montados) { monta(); return; }
  document.querySelectorAll("#mm-corpo li[data-id]").forEach(li => {
    const id = li.dataset.id, n = lista[id], it = ITENS.get(id).i;
    if (!n) return;
    li.querySelector(".st b").textContent = n;
    li.querySelector(".v").textContent = it.preco != null ? dinheiro(it.preco * n) : "—";
  });
  totais();
}

const abreComanda = () => { monta(); document.body.classList.add("com-minha"); };
const fechaComanda = () => document.body.classList.remove("com-minha");

// ---- o cartão do garçom ----
let luz = null;
async function acorda(on) {
  try {
    if (on && navigator.wakeLock) luz = await navigator.wakeLock.request("screen");
    else if (luz) { await luz.release(); luz = null; }
  } catch (e) { }
}
function garcom() {
  const g = grupos(); let i = 0;
  $("#gc-lista").innerHTML = g.map(([nome, its]) => `<h4>${esc(nome)}</h4><ul>${its.map(x => `<li style="--i:${i++}"><b>${x.n}</b><span>${esc(x.nome)}</span></li>`).join("")}</ul>`).join("");
  const t = soma();
  $("#gc-hora").textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  $("#gc-total").textContent = t ? "R$ " + dinheiro(t) : "";
  $("#gc-tt").hidden = !t;
  $("#gc-nota").hidden = !semPreco();
  document.body.classList.add("com-garcom"); acorda(true);
}
const voltaGarcom = () => { document.body.classList.remove("com-garcom"); acorda(false); };

export function inicia(o) {
  M = o.MODS; preco = o.preco; esc = o.esc;
  M.forEach(m => m.secs.forEach(s => s.itens.forEach(i => ITENS.set(i.id, { i, mod: m.nome }))));
  lista = Object.fromEntries(Object.entries(ler()).filter(([id, n]) => ITENS.has(id) && n > 0));

  document.body.insertAdjacentHTML("beforeend", `
<button class="mm-ilha" id="mm-ilha" data-mm="abre" aria-label="Abrir minha mesa"><span class="tx"><small>Minha mesa</small><span id="mm-iq"></span></span><span class="vt"></span><span class="sg">Ver</span></button>
<aside class="mm" id="mm" role="dialog" aria-label="Minha mesa">
  <div class="mm-in">
    <button class="x" data-mm="fecha">Fechar</button>
    <span class="sc">Uma lista só sua</span><h3>Minha mesa</h3>
    <p class="mm-sub">O que você marcou no cardápio, reunido para mostrar ao garçom.</p>
    <div id="mm-corpo"></div>
  </div>
  <div class="mm-pe" id="mm-pe" hidden>
    <div class="mm-total"><small>Total <span id="mm-nit"></span></small><span class="vt" id="mm-vt"></span></div>
    <p class="mm-nota" id="mm-nota" hidden>Os itens do Menu Executivo não entram na soma: o valor é o do menu.</p>
    <button class="mm-prim" data-mm="garcom">Mostrar ao garçom</button>
    <button class="mm-lim" data-mm="limpa">Limpar tudo</button>
    <p class="mm-fim">O pedido é feito com o garçom. Esta lista fica só no seu celular.</p>
  </div>
</aside>
<section class="gc" id="gc" aria-label="Pedido para o garçom"><button class="x" data-mm="volta">Voltar</button>
  <div class="gc-card"><div class="gc-cab"><span class="logo">Pitanga</span><span class="sc">Gastrobar · Teresina</span></div><i class="perf"></i>
    <div id="gc-lista"></div><i class="perf"></i>
    <div class="gc-pe"><div><small>Lista às</small><b id="gc-hora"></b></div><div class="t" id="gc-tt"><small>Total</small><b id="gc-total"></b></div></div>
    <p class="gc-nota" id="gc-nota" hidden>Menu Executivo: o valor é o do menu.</p>
  </div></section>`);

  document.addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    const mk = t.dataset.mk, mm = t.dataset.mm;
    if (mk) {
      const id = t.dataset.id, n0 = lista[id] || 0, n = Math.max(0, Math.min(20, n0 + (mk === "+" ? 1 : -1)));
      if (n === n0) return;
      if (n) lista[id] = n; else delete lista[id];
      gravar(); navigator.vibrate?.(8);
      const li = document.querySelector(`#mm-corpo li[data-id="${id}"]`);
      if (!n && li && document.body.classList.contains("com-minha")) {
        li.classList.add("sai"); document.querySelectorAll(`.mk[data-id="${id}"]`).forEach(m => m.classList.remove("on")); totais();
        setTimeout(() => { pinta(); }, 520);
        pintaMarcadores(); return;
      }
      pinta(); return;
    }
    if (mm === "abre") abreComanda();
    else if (mm === "fecha") fechaComanda();
    else if (mm === "garcom") garcom();
    else if (mm === "volta") voltaGarcom();
    else if (mm === "limpa") {
      if (t.dataset.certo) { lista = {}; gravar(); pinta(); fechaComanda(); }
      else { t.dataset.certo = "1"; t.textContent = "Toque de novo para limpar"; setTimeout(() => { delete t.dataset.certo; t.textContent = "Limpar tudo"; }, 2600); }
    }
  });
  // atualiza só os marcadores do cardápio (sem remontar a comanda enquanto uma linha sai)
  const pintaMarcadores = () => document.querySelectorAll(".mk[data-id]").forEach(el => { const n = lista[el.dataset.id] || 0; el.classList.toggle("on", n > 0); el.closest("li")?.classList.toggle("marcado", n > 0); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { voltaGarcom(); fechaComanda(); } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && document.body.classList.contains("com-garcom")) acorda(true); });

  const idx = $("#idx"); if (idx) new MutationObserver(pinta).observe(idx, { childList: true });
  pinta();
}
