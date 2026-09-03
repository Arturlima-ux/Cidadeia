import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import EstadoVazio from "@/components/EstadoVazio";
import { montarEficacia } from "@/lib/montar-eficacia";
import { totalEmRisco, type SituacaoEficacia } from "@/lib/eficacia";
import {
  buscarInvestimentos,
  registrarInvestimento,
  removerInvestimento,
  importarDoSiconfi,
} from "./actions";
import FormularioInvestimento from "./FormularioInvestimento";
import ImportarSiconfi from "./ImportarSiconfi";
import { formatarMoeda } from "@/lib/formatadores";
import { IconSaude, IconEducacao, IconObras, IconLicitacoes } from "@/components/icons";

const ICONE: Record<string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  saude: IconSaude,
  educacao: IconEducacao,
  obras: IconObras,
  licitacoes: IconLicitacoes,
};

const SITUACAO: Record<SituacaoEficacia, { label: string; cor: string; fundo: string; borda: string }> = {
  critico: {
    label: "Resultado abaixo do esperado",
    cor: "var(--urgente)",
    fundo: "var(--urgente-tint)",
    borda: "var(--urgente-borda)",
  },
  atencao: {
    label: "Requer atenção",
    cor: "var(--medio)",
    fundo: "var(--medio-tint)",
    borda: "var(--medio-borda)",
  },
  ok: {
    label: "Dentro do esperado",
    cor: "var(--info)",
    fundo: "var(--info-tint)",
    borda: "var(--info-borda)",
  },
  sem_dados: {
    label: "Sem dados suficientes",
    cor: "var(--muted)",
    fundo: "var(--sutil)",
    borda: "var(--border)",
  },
};

export default async function EficaciaPage() {
  const ctx = await contextoDashboard();
  if (ctx.sessao.cargo === "secretario") {
    return (
      <div className="max-w-lg">
        <p className="text-sm text-muted">
          O consolidado de investimentos é uma visão da prefeitura inteira —
          disponível só para o prefeito e administradores.
        </p>
      </div>
    );
  }
  if (!ctx.temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  const [analise, listaInvestimentos] = await Promise.all([
    montarEficacia(ctx.sessao.prefeituraId, ctx.prefeitura.planosContratados),
    buscarInvestimentos(ctx.sessao.prefeituraId),
  ]);

  const investimentoTotal = analise.reduce((acc, s) => acc + s.investimento, 0);
  const emRisco = totalEmRisco(analise);
  const areasComProblema = analise.filter(
    (s) => s.situacao === "critico" || s.situacao === "atencao"
  );

  async function remover(formData: FormData) {
    "use server";
    await removerInvestimento(String(formData.get("id")));
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            Investimento × Resultado
          </h1>
          <p className="text-muted text-sm mt-2 max-w-2xl leading-relaxed">
            Quanto de <strong>recurso público a prefeitura aplicou na cidade</strong> em
            cada secretaria, e o que esse dinheiro está entregando de resultado.
            Ordenado do pior para o melhor — o que precisa da sua atenção aparece
            primeiro.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 shrink-0 sm:items-end">
          <ImportarSiconfi acao={importarDoSiconfi} />
          <FormularioInvestimento acao={registrarInvestimento} />
        </div>
      </div>

      {analise.length === 0 ? (
        <EstadoVazio
          icone="indicadores"
          titulo="Nenhum módulo de secretaria contratado."
          descricao="Contrate Saúde, Educação, Obras ou Licitações para acompanhar investimento e resultado por área."
        />
      ) : (
        <>
          {/* RESUMO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border arco-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Aplicado na cidade
              </p>
              <p className="text-2xl font-serif font-bold mt-1.5 tabular-nums">
                {formatarMoeda(investimentoTotal)}
              </p>
              <p className="text-[11px] text-muted mt-1">
                recurso público nas {analise.length} área(s) contratada(s)
              </p>
            </div>
            <div
              className="arco-card p-4 border"
              style={{
                background: emRisco > 0 ? "var(--urgente-tint)" : "var(--card)",
                borderColor: emRisco > 0 ? "var(--urgente-borda)" : "var(--border)",
              }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: emRisco > 0 ? "var(--urgente)" : "var(--muted)" }}
              >
                Valor em risco
              </p>
              <p
                className="text-2xl font-serif font-bold mt-1.5 tabular-nums"
                style={{ color: emRisco > 0 ? "var(--urgente)" : undefined }}
              >
                {formatarMoeda(emRisco)}
              </p>
              <p className="text-[11px] text-muted mt-1">
                em obras atrasadas/paradas e processos com risco
              </p>
            </div>
            <div className="bg-card border border-border arco-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Áreas com problema
              </p>
              <p className="text-2xl font-serif font-bold mt-1.5 tabular-nums">
                {areasComProblema.length}
                <span className="text-base text-muted font-sans"> de {analise.length}</span>
              </p>
              <p className="text-[11px] text-muted mt-1">
                {areasComProblema.length === 0
                  ? "nenhuma área com sinal negativo"
                  : areasComProblema.map((a) => a.nome).join(", ")}
              </p>
            </div>
          </div>

          {/* POR SECRETARIA */}
          <div className="space-y-3">
            {analise.map((s) => {
              const Icone = ICONE[s.secretaria];
              const est = SITUACAO[s.situacao];
              const riscoArea = s.sinais.reduce((a, x) => a + (x.valorEmRisco ?? 0), 0);

              return (
                <div
                  key={s.secretaria}
                  className="card-interactive bg-card border arco-card p-5"
                  style={{ borderColor: s.situacao === "critico" ? est.borda : "var(--border)" }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="arco-badge w-10 h-10 text-white flex items-center justify-center shrink-0"
                        style={{ background: "var(--gradient-hero)" }}
                      >
                        <Icone className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{s.nome}</p>
                        <p className="text-sm text-muted mt-0.5">{s.resultado}</p>
                      </div>
                    </div>
                    <span
                      className="text-[11px] font-semibold border rounded-full px-2.5 py-1 self-start shrink-0 whitespace-nowrap"
                      style={{ color: est.cor, background: est.fundo, borderColor: est.borda }}
                    >
                      {est.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mt-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Investido
                      </p>
                      <p className="font-serif text-lg font-bold tabular-nums">
                        {formatarMoeda(s.investimento)}
                      </p>
                      {s.origemInvestimento.length > 0 && (
                        <p className="text-[11px] text-muted">
                          fonte: {s.origemInvestimento.join(" + ")}
                        </p>
                      )}
                      {s.investimento === 0 && (
                        <p className="text-[11px] text-muted">
                          nenhum investimento lançado ainda
                        </p>
                      )}
                    </div>
                    {riscoArea > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Em risco
                        </p>
                        <p
                          className="font-serif text-lg font-bold tabular-nums"
                          style={{ color: "var(--urgente)" }}
                        >
                          {formatarMoeda(riscoArea)}
                        </p>
                      </div>
                    )}
                  </div>

                  {s.sinais.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {s.sinais.map((sinal, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span style={{ color: est.cor }} className="shrink-0">
                            •
                          </span>
                          <span className="text-muted leading-relaxed">{sinal.texto}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted leading-relaxed border-t border-border pt-4">
            Como isto é calculado: Obras e Licitações somam automaticamente o valor
            dos contratos e dos processos homologados que você cadastrou. Saúde e
            Educação usam os lançamentos manuais acima. O julgamento de resultado
            compara sempre o registro mais recente com o anterior <strong>do próprio
            município</strong> — não existe comparação com média nacional, porque
            esse dado não está conectado ao sistema.
            <br />
            <br />
            Estes valores são o <strong>orçamento que a prefeitura aplica na cidade</strong>
            {" "}(contratos de obra, compras públicas, custeio, folha, programas). O
            que sua prefeitura paga pela assinatura da CidadeIA não entra nesta
            conta em nenhum momento.
          </p>
        </>
      )}

      {/* LANÇAMENTOS */}
      {listaInvestimentos.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
            Lançamentos de investimento ({listaInvestimentos.length})
          </h2>
          <div className="space-y-2">
            {listaInvestimentos.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">
                    {formatarMoeda(i.valor)} · {i.secretaria}
                    <span
                      className="ml-2 text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 align-middle"
                      style={
                        i.origem === "siconfi"
                          ? { color: "var(--brand)", background: "var(--brand-tint)" }
                          : { color: "var(--muted)", background: "var(--sutil)" }
                      }
                    >
                      {i.origem === "siconfi" ? "Tesouro Nacional" : "Manual"}
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {i.competencia}
                    {i.descricao ? ` — ${i.descricao}` : ""}
                  </p>
                </div>
                <form action={remover} className="shrink-0">
                  <input type="hidden" name="id" value={i.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold underline opacity-70 hover:opacity-100"
                    style={{ color: "var(--urgente)" }}
                  >
                    Remover
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/dashboard/central"
        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark transition"
      >
        Ver a Central Inteligente
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </Link>
    </div>
  );
}
