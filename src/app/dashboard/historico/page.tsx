import { contextoDashboard } from "@/lib/contexto-dashboard";
import {
  buscarHistoricoSnapshots,
  buscarHistoricoSaude,
  buscarHistoricoEducacao,
} from "@/lib/dados-prefeitura";
import GraficoTendencia from "@/components/GraficoTendencia";
import SimuladorFinanceiro from "./SimuladorFinanceiro";
import BloqueioPlano from "@/components/BloqueioPlano";

export default async function HistoricoPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  const [snapshots, saude, educacao] = await Promise.all([
    buscarHistoricoSnapshots(ctx.sessao.prefeituraId),
    buscarHistoricoSaude(ctx.sessao.prefeituraId),
    buscarHistoricoEducacao(ctx.sessao.prefeituraId),
  ]);

  const ultimoSnapshot = snapshots[snapshots.length - 1] ?? null;

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Histórico e Simulação</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          Gráficos com o histórico real de cada atualização registrada. A
          partir de {" "}
          <span className="font-semibold">3 registros reais</span>, cada
          gráfico passa a mostrar também uma linha tracejada de{" "}
          <span className="font-semibold">projeção estatística simples</span>{" "}
          (regressão linear sobre o histórico — a mesma matemática de uma
          linha de tendência de planilha, não é IA). Uma previsão de verdade
          tipo "gêmeo digital" (ex: risco de superlotação, evasão escolar
          futura cruzando várias variáveis) exige meses/anos de dados
          históricos reais pra treinar um modelo confiável, que este sistema
          ainda está acumulando.
        </p>
      </div>

      <section>
        <h2 className="font-semibold text-sm text-muted mb-3">
          Financeiro
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <GraficoTendencia
            titulo="Receita"
            cor="var(--serie-3)"
            serie={snapshots.map((s) => ({ data: s.atualizadoEm, valor: s.receita }))}
          />
          <GraficoTendencia
            titulo="Despesas"
            cor="var(--serie-2)"
            serie={snapshots.map((s) => ({ data: s.atualizadoEm, valor: s.despesas }))}
          />
          <GraficoTendencia
            titulo="Saldo"
            cor="var(--serie-1)"
            serie={snapshots.map((s) => ({ data: s.atualizadoEm, valor: s.saldo }))}
          />
          <GraficoTendencia
            titulo="Índice de Transparência"
            cor="var(--serie-4)"
            sufixo="%"
            serie={snapshots.map((s) => ({
              data: s.atualizadoEm,
              valor: s.indiceTransparencia,
            }))}
          />
        </div>
        <div className="mt-4">
          <SimuladorFinanceiro
            receitaAtual={ultimoSnapshot?.receita ?? null}
            despesaAtual={ultimoSnapshot?.despesas ?? null}
          />
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-sm text-muted mb-3">
          Saúde
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <GraficoTendencia
            titulo="Tempo médio de atendimento"
            cor="var(--serie-6)"
            sufixo=" min"
            serie={saude.map((s) => ({
              data: s.atualizadoEm,
              valor: s.tempoMedioAtendimentoMin,
            }))}
          />
          <GraficoTendencia
            titulo="Faltas"
            cor="var(--serie-6)"
            sufixo="%"
            serie={saude.map((s) => ({ data: s.atualizadoEm, valor: s.faltasPercentual }))}
          />
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-sm text-muted mb-3">
          Educação
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <GraficoTendencia
            titulo="Frequência"
            cor="var(--serie-5)"
            sufixo="%"
            serie={educacao.map((e) => ({
              data: e.atualizadoEm,
              valor: e.frequenciaPercentual,
            }))}
          />
          <GraficoTendencia
            titulo="Nota média"
            cor="var(--serie-5)"
            serie={educacao.map((e) => ({ data: e.atualizadoEm, valor: e.notaMedia }))}
          />
        </div>
      </section>
    </div>
  );
}
