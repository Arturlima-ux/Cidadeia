import type { ImportacaoRgf } from "@/lib/siconfi-rgf";
import {
  avaliarDespesaPessoal,
  VEDACOES_PRUDENCIAL,
  SANCOES_PRAZO_ESGOTADO,
  LIMITE_PESSOAL,
  type SituacaoPessoal,
} from "@/lib/despesa-pessoal";
import { antecipacaoDoPessoal, type Antecipacao } from "@/lib/antecipacao";

// ── O QUE FICA ATRÁS DO CADASTRO ──
//
// Os três fatos do herói são abertos: é dado público, e cobrar por ele seria
// consulta pública capada — o cético vai embora achando que escondemos o
// número.
//
// Isto aqui é outra coisa. A trajetória medida sobre vários períodos, a data
// em que ela cruza a fronteira legal e o que ainda dá para fazer antes disso é
// trabalho do software, não dado da prefeitura. Cobrar por isso é justo.
//
// ── NENHUM NÚMERO REDONDO ──
//
// As ações são as que as regras produzem para AQUELE município. Se forem duas,
// são duas; se forem sete, sete. "Quatro ações pré-calculadas" seria número de
// marketing, e o produto inteiro foi construído para não ter nenhum.

export type Projecao = {
  /** Situação do período mais recente. Null quando não há série. */
  situacaoAtual: SituacaoPessoal | null;
  /** Percentual mais recente da série. Null quando não há série. */
  percentualAtual: number | null;
  /**
   * Quando a trajetória cruza a próxima fronteira legal.
   *
   * Null quando a série é curta, irregular, estável ou já cruzou — todas as
   * recusas de `lib/antecipacao.ts`, respeitadas aqui em vez de contornadas.
   */
  travessia: Antecipacao | null;
  /** O que ainda dá para fazer. Tamanho variável, por desenho. */
  acoes: string[];
  /** Quantas apurações entraram na conta. É o que permite desconfiar dela. */
  apuracoes: number;
};

function fimDoPeriodo(r: ImportacaoRgf): string {
  return new Date(
    Date.UTC(r.periodo.exercicio, Math.max(0, r.periodo.mesReferencia - 1), 28)
  ).toISOString();
}

export function montarProjecao(serie: ImportacaoRgf[]): Projecao {
  if (serie.length === 0) {
    return { situacaoAtual: null, percentualAtual: null, travessia: null, acoes: [], apuracoes: 0 };
  }

  const ultima = serie[serie.length - 1]!;
  const avaliacao = avaliarDespesaPessoal({
    rcl: ultima.rclAjustada,
    despesa: ultima.despesaTotal,
  });

  const leituras = serie.map((r) => ({
    valor: r.rclAjustada > 0 ? (r.despesaTotal / r.rclAjustada) * 100 : null,
    em: fimDoPeriodo(r),
  }));

  return {
    situacaoAtual: avaliacao?.situacao ?? null,
    percentualAtual: avaliacao?.percentual ?? null,
    travessia: antecipacaoDoPessoal(leituras),
    acoes: acoesPara(avaliacao?.situacao ?? null),
    apuracoes: serie.length,
  };
}

/**
 * O que ainda dá para fazer, pela situação.
 *
 * Cada faixa tem restrições diferentes, e por isso a lista tem tamanhos
 * diferentes: acima do teto o que vale são as sanções do prazo de recondução,
 * que fecham a torneira de convênio e crédito; no prudencial o que vale são as
 * vedações, que mudam o dia a dia da folha sem o município estar irregular.
 *
 * Nenhuma frase afirma enquadramento. Quem enquadra é o procurador.
 */
function acoesPara(situacao: SituacaoPessoal | null): string[] {
  if (situacao === null) return [];

  if (situacao === "excedido") {
    return [
      `A despesa passou do teto de ${LIMITE_PESSOAL}% da receita corrente líquida, e começa a ` +
        `contar o prazo de recondução do art. 23 da LRF: um terço do excesso no primeiro ` +
        `quadrimestre seguinte. Monte o cronograma de redução antes de precisar dele.`,
      ...SANCOES_PRAZO_ESGOTADO.map(
        (s) => `Enquanto o excesso não for eliminado no prazo, o município ${s.replace(/^Não poderá/, "não poderá")}`
      ),
    ];
  }

  if (situacao === "prudencial") {
    return [
      "No patamar prudencial a gestão continua regular, e cinco atos passam a ser vedados pelo " +
        "art. 22, parágrafo único da LRF. Decida o que acontece antes da fronteira — depois dela, " +
        "o ato é nulo, e nulo não se conserta com justificativa.",
      ...VEDACOES_PRUDENCIAL.map((v) => `Fica vedado: ${v.charAt(0).toLowerCase()}${v.slice(1)}`),
    ];
  }

  if (situacao === "alerta") {
    return [
      "Na faixa de alerta o Tribunal de Contas emite aviso formal, e é a hora barata de agir: " +
        "revisar contratações previstas e horas extras ainda cabe no orçamento do exercício, sem " +
        "mexer em quem já está na folha.",
    ];
  }

  return [
    "A despesa com pessoal está confortável na última apuração publicada. O que muda o resultado " +
      "do exercício é o ritmo, não o patamar de hoje — e é ele que a projeção acima mede.",
  ];
}
