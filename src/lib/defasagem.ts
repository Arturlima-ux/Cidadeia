// ── QUÃO VELHO É O DADO ──
//
// Mínimos constitucionais e teto de pessoal têm a mesma fraqueza: os números
// são informados pelo contador, e nada obriga ninguém a voltar. Sem esta
// guarda, uma base lançada em março continua pintando "Dentro do limite" em
// verde, com duas casas decimais, em outubro — sobre uma medição de sete meses
// atrás. A prefeitura pode ter estourado em julho.
//
// Uma tela de conformidade que afirma com confiança sobre dado velho é PIOR
// que tela nenhuma: sem ela o gestor sabe que não sabe; com ela, ele acha que
// sabe. E é justamente na véspera do fechamento, quando a tela mais importa,
// que ela estaria mais errada.
//
// Então o dado envelhece em três estados e a tela muda de tom em cada um. O
// número nunca some — some a AFIRMAÇÃO sobre ele.

/**
 * Meses de atraso ainda normais para os mínimos.
 *
 * O RREO é bimestral e o contador fecha o bimestre no mês seguinte, então
 * dois a três meses de defasagem é o funcionamento correto da prefeitura, não
 * descuido. Alarmar aí treinaria o gestor a ignorar o aviso.
 */
export const TOLERANCIA_MINIMOS = 3;

/**
 * Idem para a despesa com pessoal, onde a apuração é quadrimestral (art. 22
 * da LRF): quatro meses de ciclo mais um de fechamento.
 */
export const TOLERANCIA_PESSOAL = 5;

/**
 * E para o município que publica o RGF semestralmente por ter menos de 50 mil
 * habitantes.
 *
 * Sem esta distinção, toda prefeitura pequena seria acusada de dado velho uma
 * vez por ciclo — exatamente por seguir a periodicidade que a lei lhe faculta.
 */
export const TOLERANCIA_PESSOAL_SEMESTRAL = 7;

/**
 * Margem adicional antes de o dado deixar de sustentar qualquer conclusão.
 *
 * Um ciclo inteiro perdido é atraso; dois é ausência de acompanhamento. A
 * partir daí a tela para de concluir em vez de concluir errado.
 */
const MARGEM_ATE_VENCER = 3;

export type SituacaoDado = "atual" | "desatualizado" | "vencido";

export type Defasagem = {
  /** Meses entre o fim do período medido e hoje. Nunca negativo. */
  mesesDecorridos: number;
  situacao: SituacaoDado;
};

export function avaliarDefasagem(entrada: {
  exercicio: number;
  /** Mês em que se encerra o período medido (1 a 12). */
  mesReferencia: number;
  hojeExercicio: number;
  hojeMes: number;
  toleranciaMeses: number;
}): Defasagem {
  const meses =
    (entrada.hojeExercicio - entrada.exercicio) * 12 + (entrada.hojeMes - entrada.mesReferencia);

  // Referência no futuro acontece: o contador lança o fechamento de dezembro
  // ainda em dezembro, ou alguém erra o seletor. Nada disso é dado velho, e
  // tratar como tal produziria o alarme que esta guarda existe para evitar.
  const mesesDecorridos = Math.max(0, meses);

  const tolerancia = Math.max(0, entrada.toleranciaMeses);

  let situacao: SituacaoDado = "atual";
  if (mesesDecorridos > tolerancia + MARGEM_ATE_VENCER) situacao = "vencido";
  else if (mesesDecorridos > tolerancia) situacao = "desatualizado";

  return { mesesDecorridos, situacao };
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function nomeDoMes(mes: number): string {
  return MESES[Math.min(12, Math.max(1, Math.trunc(mes))) - 1];
}

/**
 * Frase que a tela mostra no lugar do veredito.
 *
 * Diz TRÊS coisas, e nenhuma é dispensável: até quando o número vale, há
 * quanto tempo ninguém volta, e o que fazer. Um aviso que só diz "dado
 * desatualizado" transfere ao gestor o trabalho de descobrir o resto.
 */
export function descreverDefasagem(
  d: Defasagem,
  periodo: { exercicio: number; mesReferencia: number }
): string | null {
  if (d.situacao === "atual") return null;

  const ate = `${nomeDoMes(periodo.mesReferencia)} de ${periodo.exercicio}`;
  const tempo =
    d.mesesDecorridos === 1 ? "há um mês" : `há ${d.mesesDecorridos} meses`;

  if (d.situacao === "vencido") {
    return (
      `Este número mede até ${ate} e não é atualizado ${tempo}. ` +
      `Tempo demais para sustentar qualquer conclusão: a situação de hoje pode ser ` +
      `melhor ou pior, e a tela não tem como saber qual. Atualize antes de decidir com base nele.`
    );
  }

  return (
    `Este número mede até ${ate} e não é atualizado ${tempo}. ` +
    `Ainda serve de referência, mas já não descreve a situação de hoje.`
  );
}
