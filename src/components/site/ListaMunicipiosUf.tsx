"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// ── OS MUNICÍPIOS DE UM ESTADO, EM BLOCOS E COM BUSCA ──
//
// O servidor entrega os primeiros (os maiores — os mais procurados) já
// no HTML, para o Google e para quem abre no celular. Os demais chegam da
// API quando a pessoa pede "ver todos" ou começa a digitar. Assim a página
// de Minas cai de 964 KB para uma fração, sem esconder município nenhum.

export type LinhaMunicipio = { codigo: string; nome: string; populacao: number; faixa: string; caminho: string };

const n = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function ListaMunicipiosUf({ uf, iniciais, total }: { uf: string; iniciais: LinhaMunicipio[]; total: number }) {
  const [todos, setTodos] = useState<LinhaMunicipio[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  async function carregarTodos() {
    if (todos || carregando) return;
    setCarregando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/municipios/${uf.toLowerCase()}`);
      if (!r.ok) throw new Error(`resposta ${r.status}`);
      const j = (await r.json()) as { municipios: LinhaMunicipio[] };
      setTodos(j.municipios);
    } catch {
      setErro("Não foi possível carregar a lista completa agora. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  // Digitou: precisa da lista inteira para procurar.
  useEffect(() => {
    if (busca.trim().length > 0 && !todos) void carregarTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const base = todos ?? iniciais;
  const visiveis = useMemo(() => {
    const q = semAcento(busca.trim());
    if (!q) return base;
    return base.filter((m) => semAcento(m.nome).includes(q));
  }, [base, busca]);

  const faltam = total - base.length;

  return (
    <div className="mt-6">
      <label htmlFor="busca-municipio" className="block text-sm font-medium mb-1.5">
        Procurar município
      </label>
      <input
        id="busca-municipio"
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={`Digite o nome — ${total} municípios`}
        autoComplete="off"
        className="w-full sm:max-w-sm rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand transition"
      />
      {busca && carregando && <p className="text-xs text-muted mt-2">Carregando a lista completa…</p>}

      <div className="mt-4 overflow-x-auto rolagem-discreta rounded-2xl border border-border" style={{ background: "var(--card)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-mono uppercase tracking-[0.12em] text-muted border-b border-border">
              <th className="px-4 py-3 font-medium w-10">#</th>
              <th className="px-4 py-3 font-medium">Município</th>
              <th className="px-4 py-3 font-medium text-right">Habitantes</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Faixa</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((m) => (
              <tr key={m.codigo} className="border-b border-border last:border-0 hover:bg-white/[0.03] transition">
                <td className="px-4 py-2.5 text-muted tabular-nums">{base.indexOf(m) + 1}</td>
                <td className="px-4 py-2.5">
                  <Link href={m.caminho} className="font-semibold hover:text-brand-claro transition">
                    {m.nome}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{n(m.populacao)}</td>
                <td className="px-4 py-2.5 text-muted hidden sm:table-cell">{m.faixa}</td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                  Nenhum município com esse nome{todos ? "" : " entre os maiores — a lista completa está carregando"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!todos && faltam > 0 && !busca && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void carregarTodos()}
            disabled={carregando}
            className="border border-border hover:border-brand font-semibold text-sm rounded-xl px-5 py-2.5 transition disabled:opacity-60"
          >
            {carregando ? "Carregando…" : `Ver todos os ${total} municípios`}
          </button>
          <p className="text-xs text-muted">Mostrando os {base.length} maiores.</p>
        </div>
      )}
      {erro && (
        <p role="alert" className="text-sm mt-3" style={{ color: "var(--urgente)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
