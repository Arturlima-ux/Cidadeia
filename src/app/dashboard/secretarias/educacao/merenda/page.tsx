import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { buscarComprasPnae, buscarRepassePnae } from "../merenda-actions";
import { FormularioCompra, FormularioRepasse, BotaoRemoverCompra } from "./FormulariosPnae";
import {
  apurarPnae,
  projetarFechamento,
  cobertura,
  rotuloModalidade,
  rotuloDispensaAf,
  anosPnae,
  PERCENTUAL_MINIMO_AF,
} from "@/lib/pnae";
import { formatarMoeda } from "@/lib/formatadores";

// ── OS 30% DA AGRICULTURA FAMILIAR ──
//
// O apontamento mais comum do FNDE e dos tribunais de contas na merenda, e
// o que ninguém acompanha durante o ano: descobre em janeiro, na prestação
// de contas, quando não dá mais para comprar nada.
//
// Aqui a conta anda junto com o ano: cada compra lançada muda o percentual
// na hora, e a projeção diz onde o ano fecha no ritmo de hoje.

export const metadata = { title: "Merenda e os 30% da agricultura familiar" };
export const dynamic = "force-dynamic";

const COR = {
  cumprido: "var(--accent)",
  perto: "var(--medio)",
  abaixo: "var(--urgente)",
  sem_base: "var(--muted)",
} as const;

const FUNDO = {
  cumprido: "var(--accent-tint)",
  perto: "var(--medio-tint)",
  abaixo: "var(--urgente-tint)",
  sem_base: "var(--card)",
} as const;

export default async function MerendaPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("educacao")) return <BloqueioPlano plano="educacao" />;

  const opcoes = anosPnae();
  const { ano: anoParam } = await searchParams;
  const ano = opcoes.find((a) => String(a) === anoParam) ?? opcoes[0]!;

  const [compras, repasse] = await Promise.all([
    buscarComprasPnae(ctx.sessao.prefeituraId, ano),
    buscarRepassePnae(ctx.sessao.prefeituraId, ano),
  ]);

  const apuracao = apurarPnae(compras, repasse?.valor ?? 0);
  const projecao = ano === new Date().getUTCFullYear() ? projetarFechamento(apuracao) : null;
  const coberturaDoRepasse = cobertura(apuracao);
  const cor = COR[apuracao.situacao];
  const fundo = FUNDO[apuracao.situacao];
  const daAf = compras.filter((c) => c.agriculturaFamiliar);

  // A barra mostra o quanto dos 30% já foi alcançado, não o percentual
  // absoluto: 15% de repasse é metade da meta, e é assim que se lê.
  const progresso = apuracao.percentual === null ? 0 : Math.min(100, (apuracao.percentual / PERCENTUAL_MINIMO_AF) * 100);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/secretarias/educacao" className="text-xs font-semibold text-muted hover:text-brand transition">
          ← Secretaria da Educação
        </Link>
        <h1 className="font-serif text-2xl font-bold mt-2">Merenda e os 30% da agricultura familiar</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          A Lei 11.947/2009, art. 14, manda aplicar no mínimo {PERCENTUAL_MINIMO_AF}% do repasse do PNAE em
          compra direta da agricultura familiar — com prioridade para assentamentos da reforma agrária e
          comunidades indígenas e quilombolas. Lance compra por compra durante o ano e a conta anda com
          você, em vez de aparecer na prestação de contas.
        </p>
      </div>

      {/* escolha do ano */}
      <div className="flex flex-wrap gap-2">
        {opcoes.map((a) => {
          const ativo = a === ano;
          return (
            <Link
              key={a}
              href={`/dashboard/secretarias/educacao/merenda?ano=${a}`}
              className={`text-xs font-semibold rounded-full px-3.5 py-1.5 border transition ${ativo ? "border-brand text-brand" : "border-border text-muted hover:border-brand"}`}
            >
              {a}
            </Link>
          );
        })}
      </div>

      {/* ── o número ── */}
      <section className="rounded-2xl border p-5" style={{ borderColor: cor, background: fundo }}>
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cor }}>
          Agricultura familiar em {ano}
        </p>
        <p className="font-serif text-3xl font-bold mt-1">
          {apuracao.percentual === null ? "—" : `${apuracao.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          <span className="text-sm font-sans font-normal text-muted"> do repasse do PNAE</span>
        </p>
        {apuracao.percentual !== null && (
          <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }} role="img" aria-label={`${Math.round(progresso)}% da meta de ${PERCENTUAL_MINIMO_AF}%`}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progresso}%`, background: cor }} />
          </div>
        )}
        <p className="text-sm mt-3 leading-relaxed">{apuracao.frase}</p>
        {projecao && <p className="text-sm mt-1.5 leading-relaxed text-muted">{projecao.frase}</p>}
        {repasse?.motivoDispensa && (
          <p className="text-xs mt-2 leading-relaxed">
            <strong>Motivo registrado para não alcançar os {PERCENTUAL_MINIMO_AF}%:</strong>{" "}
            {rotuloDispensaAf(repasse.motivoDispensa)} — art. 14, §2º. Guarde a comprovação: é ela que o
            FNDE pede.
          </p>
        )}
      </section>

      {/* ── os três números que sustentam a conta ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Numero rotulo="Repasse recebido" valor={apuracao.repasse > 0 ? formatarMoeda(apuracao.repasse) : "—"} />
        <Numero rotulo="Comprado no total" valor={formatarMoeda(apuracao.gastoTotal)} />
        <Numero
          rotulo="Da agricultura familiar"
          valor={formatarMoeda(apuracao.gastoAgriculturaFamiliar)}
          detalhe={`${daAf.length} compra(s)`}
        />
      </div>

      {coberturaDoRepasse !== null && coberturaDoRepasse < 60 && (
        <p className="text-sm leading-relaxed rounded-xl px-4 py-3 border" style={{ color: "var(--medio)", background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}>
          Só {coberturaDoRepasse.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% do repasse virou compra
          lançada aqui ({formatarMoeda(apuracao.naoAplicado)} sem lançamento). Ou falta registrar compra, ou
          sobrou recurso na conta do PNAE — os dois têm consequência na prestação de contas.
        </p>
      )}

      {/* ── o repasse ── */}
      <section>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-2">Repasse do ano</h2>
        <FormularioRepasse ano={ano} valorAtual={repasse?.valor ?? null} motivoAtual={repasse?.motivoDispensa ?? null} />
      </section>

      {/* ── as compras ── */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">Compras de {ano} ({compras.length})</h2>

        {compras.length > 0 && (
          <div className="overflow-x-auto rolagem-discreta rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-mono uppercase tracking-[0.12em] text-muted border-b border-border">
                  <th className="px-4 py-2.5 font-medium">Compra</th>
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Fornecedor</th>
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium text-right">Valor</th>
                  <th className="px-4 py-2.5 font-medium">Agric. familiar</th>
                  <th className="px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {compras.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{c.descricao}</span>
                      <span className="block text-xs text-muted">
                        {rotuloModalidade(c.modalidade)}
                        {c.documento ? ` · ${c.documento}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted hidden sm:table-cell">{c.fornecedor ?? "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted">{c.dataCompra.split("-").reverse().join("/")}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatarMoeda(c.valor)}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: c.agriculturaFamiliar ? "var(--accent)" : "var(--muted)" }}>
                      {c.agriculturaFamiliar ? "Sim" : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-right">{!ctx.sessao.demo && <BotaoRemoverCompra id={c.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Lançar compra</h3>
          <FormularioCompra ano={ano} />
        </div>
      </section>

      <p className="text-xs text-muted leading-relaxed">
        A compra da agricultura familiar se faz por <strong>chamada pública</strong>, dispensada a licitação
        (Lei 11.947/2009, art. 14, §1º). Quando o município não alcança os {PERCENTUAL_MINIMO_AF}%, a lei
        admite três motivos — impossibilidade de nota fiscal, fornecimento irregular e condição
        higiênico-sanitária inadequada (§2º) — e cada um precisa de comprovação guardada.
      </p>
    </div>
  );
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-lg font-serif font-bold tabular-nums">{valor}</p>
      <p className="text-xs text-muted mt-1">
        {rotulo}
        {detalhe ? ` · ${detalhe}` : ""}
      </p>
    </div>
  );
}
