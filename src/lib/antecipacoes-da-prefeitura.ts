import { db } from "@/db";
import { despesaPessoal, dashboardSnapshots } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatarMoeda } from "@/lib/formatadores";
import {
  antecipacaoDoPessoal,
  antecipacaoDoSaldo,
  ordenarAntecipacoes,
  type Antecipacao,
} from "@/lib/antecipacao";

// ── DE ONDE SAEM AS SÉRIES ──
//
// lib/antecipacao.ts é pura e testada; aqui só se lê o banco e se entrega a
// ela. A separação existe porque a parte difícil é a matemática da recusa, e
// matemática que depende de banco não se testa.

/**
 * Quantas apurações entram na série.
 *
 * Doze porque a despesa com pessoal é quadrimestral na regra geral: doze
 * apurações são quatro anos, um mandato inteiro. Mais que isso traria a gestão
 * anterior para dentro do ritmo medido, e a folha de quem saiu não prevê a
 * trajetória de quem entrou.
 */
const APURACOES = 12;

/**
 * A data de uma apuração é o FIM DO PERÍODO, nunca o dia em que foi digitada.
 *
 * Não é preciosismo. Um contador que lança quatro quadrimestres atrasados numa
 * tarde produziria quatro leituras no mesmo instante: a regressão veria
 * variação sem tempo decorrido, a inclinação sairia zero e a antecipação
 * simplesmente nunca apareceria — em silêncio, na prefeitura que mais precisa
 * dela, porque é justamente a que lança tudo de uma vez.
 */
function fimDoPeriodo(exercicio: number, mesReferencia: number): string {
  const mes = Math.min(12, Math.max(1, Math.trunc(mesReferencia)));
  // Dia 1 do mês seguinte menos um instante seria o último dia do mês; o dia 28
  // basta e nunca escorrega de mês, que é o que importa para medir ritmo.
  return new Date(Date.UTC(exercicio, mes - 1, 28)).toISOString();
}

export async function antecipacoesDaPrefeitura(prefeituraId: string): Promise<Antecipacao[]> {
  // As duas leituras não dependem uma da outra.
  const [periodos, snapshots] = await Promise.all([
    db
      .select({
        exercicio: despesaPessoal.exercicio,
        mesReferencia: despesaPessoal.mesReferencia,
        rcl: despesaPessoal.rcl,
        despesa: despesaPessoal.despesa,
      })
      .from(despesaPessoal)
      .where(eq(despesaPessoal.prefeituraId, prefeituraId))
      .orderBy(desc(despesaPessoal.exercicio), desc(despesaPessoal.mesReferencia))
      .limit(APURACOES),
    db
      .select({ saldo: dashboardSnapshots.saldo, atualizadoEm: dashboardSnapshots.atualizadoEm })
      .from(dashboardSnapshots)
      .where(eq(dashboardSnapshots.prefeituraId, prefeituraId))
      .orderBy(desc(dashboardSnapshots.atualizadoEm))
      .limit(APURACOES),
  ]);

  const seriePessoal = periodos.map((p) => ({
    // RCL zerada não vira 0% — vira leitura ausente. Zero diria que a
    // prefeitura não gasta com pessoal, o oposto do risco real.
    valor: p.rcl > 0 ? (p.despesa / p.rcl) * 100 : null,
    em: fimDoPeriodo(p.exercicio, p.mesReferencia),
  }));

  // O snapshot é medido no dia em que é registrado, então aqui a data de
  // atualização É a data da medição — ao contrário da apuração de pessoal.
  const serieSaldo = snapshots.map((s) => ({ valor: s.saldo, em: s.atualizadoEm }));

  const lista = [
    antecipacaoDoPessoal(seriePessoal),
    antecipacaoDoSaldo(serieSaldo, formatarMoeda),
  ].filter((a): a is Antecipacao => a !== null);

  return ordenarAntecipacoes(lista);
}
