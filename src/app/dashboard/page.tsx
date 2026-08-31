import { contextoDashboard } from "@/lib/contexto-dashboard";
import { buscarHistoricoSnapshots, buscarAlertas } from "@/lib/dados-prefeitura";
import { atualizarSnapshot } from "./actions";
import Link from "next/link";
import BloqueioPlano from "@/components/BloqueioPlano";
import BadgePrioridade, { estiloPrioridade } from "@/components/BadgePrioridade";
import EstadoVazio from "@/components/EstadoVazio";
import BarraAlertasPrioridade from "@/components/BarraAlertasPrioridade";
import GaugeEficiencia from "@/components/GaugeEficiencia";
import { IconIA, IconDownload, IconSetaCima, IconSetaBaixo } from "@/components/icons";
import ValorAnimado from "@/components/ValorAnimado";
import InsightIA from "@/components/InsightIA";
import { gerarInsightIA } from "./insight-actions";
import { fusoDoEstado, saudacao, dataPorExtenso } from "@/lib/horario";

// A saudação e a data saem de lib/horario.ts, no fuso do estado da
// prefeitura. Calcular aqui com `new Date().getHours()` devolvia a hora do
// servidor da Vercel, que roda em UTC: às 22h no Ceará o painel dizia
// "Bom dia" e exibia a data do dia seguinte.

/** % de variação entre dois valores. null se não der pra calcular. */
function calcularDelta(atual: number | null, anterior: number | null): number | null {
  if (atual === null || anterior === null || anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export default async function DashboardPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  const { sessao, prefeitura } = ctx;

  // Antes eram dois `await` em sequência — não dependem um do outro.
  const [historico, todosAlertas] = await Promise.all([
    buscarHistoricoSnapshots(sessao.prefeituraId),
    buscarAlertas(sessao.prefeituraId),
  ]);
  const snapshot = historico[historico.length - 1] ?? null;
  const anterior = historico.length > 1 ? historico[historico.length - 2] : null;

  const listaAlertas = todosAlertas.filter((a) => !a.resolvido);
  const contagemPorPrioridade = listaAlertas.reduce<Record<string, number>>((acc, a) => {
    acc[a.prioridade] = (acc[a.prioridade] ?? 0) + 1;
    return acc;
  }, {});

  const temDadosFinanceiros =
    snapshot && (snapshot.receita !== null || snapshot.despesas !== null);

  const fuso = fusoDoEstado(prefeitura?.estado);

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted capitalize">
            {dataPorExtenso(fuso)}
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold mt-1">
            {saudacao(fuso)}, {prefeitura?.prefeito ? `Prefeito(a) ${prefeitura.prefeito}` : sessao?.nome}.
          </h1>
          <p className="text-muted text-sm mt-1.5">
            {listaAlertas.length > 0
              ? `Sua prefeitura possui ${listaAlertas.length} alerta${listaAlertas.length > 1 ? "s" : ""} em aberto.`
              : "Nenhum alerta em aberto no momento."}
          </p>
        </div>
        <a
          href="/api/relatorios/executivo"
          className="group shrink-0 flex items-center gap-2 border border-border bg-card rounded-lg px-4 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand transition shadow-elevated"
        >
          <IconDownload className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          Relatório executivo (PDF)
        </a>
      </div>

      <InsightIA acao={gerarInsightIA} modulo="geral" />

      {/* IA Central */}
      <Link
        href="/dashboard/ia"
        className="group card-interactive shadow-elevated bg-card border border-border arco-card p-5 flex items-start gap-4 hover:border-brand/40 transition"
      >
        <div
          className="arco-badge w-10 h-10 text-white flex items-center justify-center shrink-0"
          style={{ background: "var(--gradient-hero)" }}
        >
          <IconIA className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold inline-flex items-center gap-1">
            Converse com a IA Central
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
          </p>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            Pergunte sobre os indicadores e alertas registrados na sua prefeitura.
            As respostas usam só os dados reais já cadastrados — nada de números
            inventados.
          </p>
        </div>
      </Link>

      {/* VISÃO GERAL */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">
            Visão Geral
          </h2>
          <DetalhesSnapshotForm />
        </div>

        {temDadosFinanceiros ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CardMetrica
                label="Receita"
                valorNumerico={snapshot!.receita}
                tipo="moeda"
                cor="var(--brand)"
                delta={calcularDelta(snapshot!.receita, anterior?.receita ?? null)}
                upEhBom
              />
              <CardMetrica
                label="Despesas"
                valorNumerico={snapshot!.despesas}
                tipo="moeda"
                cor="var(--urgente)"
                delta={calcularDelta(snapshot!.despesas, anterior?.despesas ?? null)}
                upEhBom={false}
              />
              <CardMetrica
                label="Saldo"
                valorNumerico={snapshot!.saldo}
                tipo="moeda"
                cor="var(--accent)"
                delta={calcularDelta(snapshot!.saldo, anterior?.saldo ?? null)}
                upEhBom
              />
            </div>

            {snapshot!.indiceTransparencia !== null && (
              <div className="card-interactive shadow-elevated bg-card border border-border arco-card p-5 flex items-center justify-between flex-wrap gap-4">
                <GaugeEficiencia
                  valor={snapshot!.indiceTransparencia}
                  label="Eficiência da gestão"
                  sublabel="Baseado no Índice de Transparência mais recente registrado."
                />
                {(() => {
                  const delta = calcularDelta(
                    snapshot!.indiceTransparencia,
                    anterior?.indiceTransparencia ?? null
                  );
                  return delta !== null ? (
                    <div className="text-right">
                      <DeltaBadge percentual={delta} upEhBom />
                      <p className="text-[10px] text-muted mt-0.5">vs. registro anterior</p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        ) : (
          <EstadoVazio
            icone="indicadores"
            titulo="Nenhum indicador registrado ainda."
            descricao="Use “Atualizar indicadores” acima para adicionar os primeiros números da sua prefeitura."
          />
        )}
      </div>

      {/* ALERTAS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">
            Alertas
          </h2>
          <Link
            href="/dashboard/alertas"
            className="text-xs font-semibold text-brand hover:underline"
          >
            Ver todos →
          </Link>
        </div>

        {listaAlertas.length === 0 ? (
          <EstadoVazio icone="alertas" titulo="Nenhum alerta em aberto." />
        ) : (
          <div className="space-y-4">
            <BarraAlertasPrioridade contagens={contagemPorPrioridade} />
            <div className="space-y-2">
            {listaAlertas.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="card-interactive flex items-center justify-between arco-card-sm border border-border border-l-4 bg-card px-4 py-3 text-sm"
                style={{ borderLeftColor: estiloPrioridade(a.prioridade).cor }}
              >
                <div>
                  <p className="font-medium">{a.titulo}</p>
                  {a.descricao && (
                    <p className="text-xs text-muted mt-0.5">{a.descricao}</p>
                  )}
                </div>
                <BadgePrioridade prioridade={a.prioridade} className="ml-4" />
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CardMetrica({
  label,
  valorNumerico,
  tipo,
  cor,
  delta,
  upEhBom,
}: {
  label: string;
  valorNumerico: number | null;
  tipo: "moeda" | "percentual";
  cor: string;
  delta?: number | null;
  upEhBom?: boolean;
}) {
  return (
    <div className="card-interactive shadow-elevated relative overflow-hidden bg-card border border-border arco-card-sm p-4">
      <span
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: cor }}
      />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <div className="flex items-baseline gap-2 mt-1.5">
        {valorNumerico !== null ? (
          <ValorAnimado
            valor={valorNumerico}
            tipo={tipo}
            className="text-2xl font-serif font-bold leading-tight"
          />
        ) : (
          <p className="text-2xl font-serif font-bold leading-tight">—</p>
        )}
        {delta !== null && delta !== undefined && (
          <DeltaBadge percentual={delta} upEhBom={upEhBom ?? true} />
        )}
      </div>
      {delta !== null && delta !== undefined && (
        <p className="text-[10px] text-muted mt-0.5">vs. registro anterior</p>
      )}
    </div>
  );
}

function DeltaBadge({
  percentual,
  upEhBom,
}: {
  percentual: number;
  upEhBom: boolean;
}) {
  const subiu = percentual > 0;
  const neutro = Math.abs(percentual) < 0.05;
  const bom = subiu === upEhBom;
  const cor = neutro ? "#6b6b64" : bom ? "#0ca30c" : "#d03b3b";
  const Icone = subiu ? IconSetaCima : IconSetaBaixo;

  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold"
      style={{ color: cor }}
    >
      {!neutro && <Icone className="w-3 h-3" />}
      {Math.abs(percentual).toFixed(1)}%
    </span>
  );
}

function DetalhesSnapshotForm() {
  return (
    <details className="relative">
      <summary className="text-xs font-semibold text-brand hover:underline cursor-pointer list-none">
        Atualizar indicadores
      </summary>
      <form
        action={atualizarSnapshot}
        className="absolute right-0 z-10 mt-2 w-72 bg-card border border-border rounded-xl p-4 shadow-lg space-y-3"
      >
        <p className="text-xs text-muted">
          Inserção manual (Fase 1) — sem integração automática ainda.
        </p>
        <div>
          <label className="block text-xs font-medium mb-1">Receita (R$)</label>
          <input
            name="receita"
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Despesas (R$)</label>
          <input
            name="despesas"
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            Índice de Transparência (%)
          </label>
          <input
            name="indiceTransparencia"
            type="number"
            min={0}
            max={100}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full py-2 transition"
        >
          Salvar
        </button>
      </form>
    </details>
  );
}
