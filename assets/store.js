// Sincronização das mesas.
// Com /config.js preenchido (Supabase), sincroniza entre aparelhos em tempo real.
// Sem ele, sincroniza entre abas e janelas do mesmo navegador (modo demonstração).
import * as CFG from "/config.js";

const KEY = n => `pitanga:v2:mesa:${n}`;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export { uid };

export const vazia = n => ({
  mesa: n, membros: {}, carrinho: [], combos: [], pedidos: [], chamados: [],
  ritmo: { principal: "segurar", final: "segurar" },
  conta: { pedida: false, paga: false, pessoas: null },
  avaliacao: null, atualizado: 0,
});

const remoto = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
export const MODO = remoto ? "online" : "demo";

let sb = null;
async function client() {
  if (!sb) {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.4");
    sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { realtime: { params: { eventsPerSecond: 20 } } });
  }
  return sb;
}

const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("pitanga-mesa") : null;
const ouvintes = new Set(); // (estado) => void, para qualquer mesa
bc && bc.addEventListener("message", e => { if (e.data?.mesa != null) ouvintes.forEach(f => f(e.data)); });
addEventListener("storage", e => { if (e.key?.startsWith("pitanga:v2:mesa:") && e.newValue) { try { const s = JSON.parse(e.newValue); ouvintes.forEach(f => f(s)); } catch {} } });

function lerLocal(n) { try { return JSON.parse(localStorage.getItem(KEY(n))) || vazia(n); } catch { return vazia(n); } }
function gravarLocal(s) { try { localStorage.setItem(KEY(s.mesa), JSON.stringify(s)); } catch {} bc && bc.postMessage(s); }
async function salvar(s) {
  s.atualizado = Date.now();
  gravarLocal(s);
  if (remoto) { const c = await client(); await c.from("mesas").upsert({ id: s.mesa, estado: s, atualizado: new Date().toISOString() }); }
  return s;
}

// Uma mesa: get / update(fn) / subscribe(cb)
export function mesa(n) {
  n = Number(n);
  let atual = lerLocal(n);
  const subs = new Set();
  const emitir = s => { if (s.mesa !== n) return; if (s.atualizado < atual.atualizado) return; atual = s; subs.forEach(f => f(atual)); };
  ouvintes.add(emitir);

  if (remoto) {
    client().then(async c => {
      const { data } = await c.from("mesas").select("estado").eq("id", n).maybeSingle();
      if (data?.estado) emitir(data.estado);
      c.channel("mesa-" + n)
        .on("postgres_changes", { event: "*", schema: "public", table: "mesas", filter: `id=eq.${n}` }, p => p.new?.estado && emitir(p.new.estado))
        .subscribe();
    });
  }

  return {
    get: () => atual,
    subscribe(f) { subs.add(f); f(atual); return () => subs.delete(f); },
    async update(fn) {
      const s = structuredClone(atual);
      fn(s);
      s.atualizado = Date.now();
      atual = s;
      subs.forEach(f => f(atual));
      return salvar(s);
    },
  };
}

// Todas as mesas (painel da casa)
export function todas(cb, faixa = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
  const mapa = new Map(faixa.map(n => [n, lerLocal(n)]));
  const emitir = () => cb([...mapa.values()]);
  const on = s => { const a = mapa.get(s.mesa); if (!a || s.atualizado >= a.atualizado) { mapa.set(s.mesa, s); emitir(); } };
  ouvintes.add(on);
  if (remoto) {
    client().then(async c => {
      const { data } = await c.from("mesas").select("estado");
      (data || []).forEach(r => r.estado && on(r.estado));
      c.channel("casa").on("postgres_changes", { event: "*", schema: "public", table: "mesas" }, p => p.new?.estado && on(p.new.estado)).subscribe();
    });
  }
  emitir();
  return {
    update(n, fn) { const s = structuredClone(mapa.get(n) || vazia(n)); fn(s); s.atualizado = Date.now(); mapa.set(n, s); emitir(); return salvar(s); },
  };
}

export const zerar = n => salvar(vazia(n));

// Coleções de documentos (reservas, configurações). Mesmo esquema: local + Supabase (tabela "docs").
const CK = c => `pitanga:v2:col:${c}`;
const colOuv = new Set();
bc && bc.addEventListener("message", e => { if (e.data?.col) colOuv.forEach(f => f(e.data)); });
addEventListener("storage", e => { if (e.key?.startsWith("pitanga:v2:col:") && e.newValue) { try { const col = e.key.slice(15); colOuv.forEach(f => f({ col, mapa: JSON.parse(e.newValue) })); } catch {} } });
export function colecao(nome, cb) {
  let mapa = {};
  try { mapa = JSON.parse(localStorage.getItem(CK(nome))) || {}; } catch {}
  const emit = () => cb && cb(Object.values(mapa));
  colOuv.add(m => { if (m.col === nome) { mapa = m.mapa; emit(); } });
  const local = () => { try { localStorage.setItem(CK(nome), JSON.stringify(mapa)); } catch {} bc && bc.postMessage({ col: nome, mapa }); };
  if (remoto) {
    client().then(async c => {
      const { data } = await c.from("docs").select("id,dados").eq("colecao", nome);
      (data || []).forEach(r => { mapa[r.id] = r.dados; }); local(); emit();
      c.channel("col-" + nome).on("postgres_changes", { event: "*", schema: "public", table: "docs", filter: `colecao=eq.${nome}` },
        p => { if (p.new?.id) { mapa = { ...mapa, [p.new.id]: p.new.dados }; local(); emit(); } }).subscribe();
    });
  }
  emit();
  return {
    todos: () => Object.values(mapa),
    get: id => mapa[id],
    async salvar(doc) {
      doc.atualizado = Date.now(); mapa = { ...mapa, [doc.id]: doc }; local(); emit();
      if (remoto) { const c = await client(); await c.from("docs").upsert({ id: doc.id, colecao: nome, dados: doc, atualizado: new Date().toISOString() }); }
      return doc;
    },
  };
}
