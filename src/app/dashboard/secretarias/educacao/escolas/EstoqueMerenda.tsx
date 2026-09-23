"use client";

import { useRef, useState, useTransition } from "react";
import { registrarContagemMerenda, removerItemMerenda } from "../merenda-actions";
import {
  CATALOGO_MERENDA,
  NOME_CATEGORIA_MERENDA,
  ROTULO_SITUACAO_MERENDA,
  diasDeAula,
  situacaoDoItemMerenda,
  contagemVelhaMerenda,
  cabeNaAgriculturaFamiliar,
  type SituacaoMerenda,
} from "@/lib/merenda";

type Linha = {
  id: string;
  item: string;
  categoria: "hortifruti" | "proteina" | "graos" | "laticinio" | "panificacao" | "mercearia" | "outro";
  unidadeMedida: string;
  saldo: number;
  consumoDiario: number;
  atualizadoPor: string;
  atualizadoEm: string;
};

const COR: Record<SituacaoMerenda, string> = {
  falta: "var(--urgente)",
  critico: "var(--urgente)",
  atencao: "var(--medio)",
  ok: "var(--accent)",
  sem_consumo: "var(--muted)",
};
const ORDEM: Record<SituacaoMerenda, number> = { falta: 0, critico: 1, atencao: 2, sem_consumo: 3, ok: 4 };

export default function EstoqueMerenda({ escolaId, linhas, fuso }: { escolaId: string; linhas: Linha[]; fuso: string }) {
  // Função não atravessa a fronteira servidor→cliente; o fuso vem como texto.
  const fusoData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit" });
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [aberto, setAberto] = useState(linhas.length === 0);
  const form = useRef<HTMLFormElement>(null);
  const campo = "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

  const ordenadas = [...linhas]
    .map((l) => ({ ...l, situacao: situacaoDoItemMerenda(l.saldo, l.consumoDiario), dias: diasDeAula(l.saldo, l.consumoDiario) }))
    .sort((a, b) => ORDEM[a.situacao] - ORDEM[b.situacao] || a.item.localeCompare(b.item, "pt-BR"));
  const precisando = ordenadas.filter((l) => l.situacao === "falta" || l.situacao === "critico" || l.situacao === "atencao").length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">Merenda na cozinha</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed max-w-2xl">
            Saldo e quanto sai por dia de aula → dá para quantos dias. Escola não serve almoço no sábado:
            a conta aqui é em dia letivo, não em mês.
            {precisando > 0 && (
              <span className="font-semibold" style={{ color: "var(--medio)" }}> {precisando} item(ns) para repor.</span>
            )}
          </p>
        </div>
        {!aberto && (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="text-sm font-semibold border border-border rounded-full px-4 py-2 hover:border-brand hover:text-brand transition"
          >
            Lançar contagem
          </button>
        )}
      </div>

      {aberto && (
        <form
          ref={form}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setMsg(null);
            iniciar(async () => {
              const r = await registrarContagemMerenda(fd);
              if (r.ok) {
                setMsg({ tipo: "ok", texto: "Contagem registrada." });
                form.current?.reset();
              } else setMsg({ tipo: "erro", texto: r.erro });
            });
          }}
          className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] items-end"
        >
          <input type="hidden" name="escolaId" value={escolaId} />
          <div>
            <label htmlFor="mer-item" className="block text-xs font-medium mb-1">Item</label>
            <input id="mer-item" name="item" list="catalogo-merenda" required className={campo} placeholder="Feijão" />
            <datalist id="catalogo-merenda">
              {CATALOGO_MERENDA.map((c) => (
                <option key={c.nome} value={c.nome}>
                  {NOME_CATEGORIA_MERENDA[c.categoria]} · {c.unidade}
                  {c.agriculturaFamiliar ? " · agricultura familiar" : ""}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="mer-saldo" className="block text-xs font-medium mb-1">Saldo hoje</label>
            <input id="mer-saldo" name="saldo" type="number" min={0} step="any" required inputMode="decimal" className={campo} />
          </div>
          <div>
            <label htmlFor="mer-consumo" className="block text-xs font-medium mb-1">Sai por dia de aula</label>
            <input id="mer-consumo" name="consumoDiario" type="number" min={0} step="any" required inputMode="decimal" className={campo} />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pendente}
              className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60 whitespace-nowrap"
            >
              {pendente ? "…" : "Lançar"}
            </button>
            {linhas.length > 0 && (
              <button type="button" onClick={() => setAberto(false)} className="text-sm text-muted hover:text-foreground px-2">
                Fechar
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted sm:col-span-4">
            Item fora da lista entra em “outro”, medido em kg. Item da lista já vem com categoria e
            unidade certas. Lançar de novo o mesmo item corrige a contagem.
          </p>
        </form>
      )}
      {msg && (
        <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-sm" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
          {msg.texto}
        </p>
      )}

      {ordenadas.length > 0 && (
        <div className="overflow-x-auto rolagem-discreta rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-[0.12em] text-muted border-b border-border">
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 font-medium text-right">Saldo</th>
                <th className="px-4 py-2.5 font-medium text-right">Sai/dia</th>
                <th className="px-4 py-2.5 font-medium text-right">Dá para</th>
                <th className="px-4 py-2.5 font-medium">Situação</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">Contagem</th>
                <th className="px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{l.item}</span>
                    <span className="text-xs text-muted"> · {l.unidadeMedida}</span>
                    {cabeNaAgriculturaFamiliar(l.item) && (
                      <span className="text-[10px] font-semibold ml-1.5 rounded-full px-1.5 py-0.5" style={{ color: "var(--accent)", background: "var(--accent-tint)" }}>
                        agric. familiar
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{l.saldo}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{l.consumoDiario}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold" style={{ color: COR[l.situacao] }}>
                    {l.dias === null ? "—" : `${l.dias} dia(s) de aula`}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: COR[l.situacao] }}>
                    {ROTULO_SITUACAO_MERENDA[l.situacao]}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted hidden md:table-cell">
                    {fusoData(l.atualizadoEm)} · {l.atualizadoPor}
                    {contagemVelhaMerenda(l.atualizadoEm) && <span style={{ color: "var(--medio)" }}> · contagem velha</span>}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() => {
                        if (!confirm(`Remover "${l.item}" do estoque desta escola?`)) return;
                        iniciar(async () => {
                          const r = await removerItemMerenda(l.id);
                          if (!r.ok) setMsg({ tipo: "erro", texto: r.erro });
                        });
                      }}
                      className="text-xs text-muted hover:text-[color:var(--urgente)] transition"
                      aria-label={`Remover ${l.item}`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
