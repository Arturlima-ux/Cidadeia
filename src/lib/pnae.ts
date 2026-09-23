// ── OS 30% DA AGRICULTURA FAMILIAR ──
//
// Lei 11.947/2009, art. 14: do total dos recursos repassados pelo FNDE no
// âmbito do PNAE, no mínimo 30% devem ser usados na compra de gêneros
// alimentícios direto da agricultura familiar e do empreendedor familiar
// rural, ou de suas organizações — com prioridade para assentamentos da
// reforma agrária e comunidades tradicionais indígenas e quilombolas.
//
// É o apontamento mais comum do FNDE e dos tribunais de contas na
// merenda. E quase ninguém acompanha isso durante o ano: descobre em
// janeiro, na prestação de contas, quando não dá mais para comprar nada.
//
// ── A BASE DA CONTA ──
// O percentual é sobre o REPASSE RECEBIDO, não sobre o total gasto. Um
// município que gastou pouco e comprou tudo da agricultura familiar ainda
// pode estar abaixo dos 30%. Por isso o repasse do ano é informado aqui:
// é o denominador, e inventá-lo seria vender certeza que não temos.

export const PERCENTUAL_MINIMO_AF = 30;

/** As três hipóteses do art. 14, §2º, em que a lei dispensa os 30%. */
export const MOTIVOS_DISPENSA_AF = [
  { chave: "sem_nota", rotulo: "Impossibilidade de emissão de documento fiscal pelo produtor" },
  { chave: "sem_regularidade", rotulo: "Inviabilidade de fornecimento regular e constante" },
  { chave: "sanitario", rotulo: "Condições higiênico-sanitárias inadequadas" },
] as const;

export type MotivoDispensaAf = (typeof MOTIVOS_DISPENSA_AF)[number]["chave"];

export function rotuloDispensaAf(chave: string): string {
  return MOTIVOS_DISPENSA_AF.find((m) => m.chave === chave)?.rotulo ?? chave;
}

/** A compra da agricultura familiar se faz por chamada pública (art. 14, §1º). */
export const MODALIDADES_COMPRA = [
  { chave: "chamada_publica", rotulo: "Chamada pública (agricultura familiar)" },
  { chave: "pregao", rotulo: "Pregão" },
  { chave: "dispensa", rotulo: "Dispensa" },
  { chave: "outra", rotulo: "Outra" },
] as const;

export type ModalidadeCompra = (typeof MODALIDADES_COMPRA)[number]["chave"];

export function rotuloModalidade(chave: string): string {
  return MODALIDADES_COMPRA.find((m) => m.chave === chave)?.rotulo ?? chave;
}

export type SituacaoAf = "cumprido" | "perto" | "abaixo" | "sem_base";

export type CompraPnae = {
  valor: number;
  agriculturaFamiliar: boolean;
  dataCompra: string;
};

export type ApuracaoPnae = {
  /** Repasse do ano informado pelo município; 0 quando não informado. */
  repasse: number;
  gastoTotal: number;
  gastoAgriculturaFamiliar: number;
  /** Sobre o repasse, como a lei manda. null quando o repasse não foi informado. */
  percentual: number | null;
  /** Quanto ainda falta comprar da agricultura familiar para chegar aos 30%. */
  faltaEmReais: number;
  /** Repasse que ainda não virou compra registrada. */
  naoAplicado: number;
  situacao: SituacaoAf;
  frase: string;
};

/** Meio ponto de folga: 29,7% arredondado vira 30% na prestação de contas, mas não é margem para dormir. */
const MARGEM_PERTO = 5;

export function apurarPnae(compras: CompraPnae[], repasse: number): ApuracaoPnae {
  const gastoTotal = compras.reduce((s, c) => s + c.valor, 0);
  const gastoAgriculturaFamiliar = compras.filter((c) => c.agriculturaFamiliar).reduce((s, c) => s + c.valor, 0);

  if (repasse <= 0) {
    return {
      repasse: 0,
      gastoTotal,
      gastoAgriculturaFamiliar,
      percentual: null,
      faltaEmReais: 0,
      naoAplicado: 0,
      situacao: "sem_base",
      frase:
        "Informe o repasse do PNAE recebido no ano: os 30% da Lei 11.947/2009 são calculados sobre o repasse, não sobre o total gasto.",
    };
  }

  const percentual = (gastoAgriculturaFamiliar / repasse) * 100;
  const alvo = repasse * (PERCENTUAL_MINIMO_AF / 100);
  const faltaEmReais = Math.max(0, alvo - gastoAgriculturaFamiliar);
  const naoAplicado = Math.max(0, repasse - gastoTotal);

  const situacao: SituacaoAf =
    percentual >= PERCENTUAL_MINIMO_AF ? "cumprido" : percentual >= PERCENTUAL_MINIMO_AF - MARGEM_PERTO ? "perto" : "abaixo";

  const frase =
    situacao === "cumprido"
      ? `${arredondar(percentual)}% do repasse do PNAE foi comprado da agricultura familiar — o mínimo legal de ${PERCENTUAL_MINIMO_AF}% está cumprido.`
      : situacao === "perto"
        ? `${arredondar(percentual)}% do repasse foi comprado da agricultura familiar. Faltam ${moeda(faltaEmReais)} para fechar os ${PERCENTUAL_MINIMO_AF}% que a Lei 11.947/2009 exige.`
        : `Só ${arredondar(percentual)}% do repasse foi comprado da agricultura familiar. Faltam ${moeda(faltaEmReais)} para os ${PERCENTUAL_MINIMO_AF}% do art. 14 — e comprar isso em dezembro não dá.`;

  return { repasse, gastoTotal, gastoAgriculturaFamiliar, percentual, faltaEmReais, naoAplicado, situacao, frase };
}

/**
 * No ritmo de hoje, onde o ano fecha.
 *
 * O PNAE acompanha o ano letivo, não o calendário: o repasse cobre os dias
 * de aula, que se concentram entre fevereiro e dezembro. A projeção usa a
 * fração do ano já corrida — grosseira de propósito, e dita como
 * estimativa, não como número de prestação de contas.
 */
export function projetarFechamento(apuracao: ApuracaoPnae, hoje: Date = new Date()): { percentualProjetado: number; frase: string } | null {
  if (apuracao.percentual === null) return null;
  const inicio = Date.UTC(hoje.getUTCFullYear(), 0, 1);
  const fim = Date.UTC(hoje.getUTCFullYear() + 1, 0, 1);
  const fracao = (hoje.getTime() - inicio) / (fim - inicio);
  // Antes de fevereiro quase não houve dia letivo: projetar aí é chute.
  if (fracao < 0.12) return null;

  const percentualProjetado = apuracao.percentual / fracao;
  const frase =
    percentualProjetado >= PERCENTUAL_MINIMO_AF
      ? `No ritmo de compra deste ano, o município fecha por volta de ${arredondar(percentualProjetado)}% — acima do mínimo.`
      : `No ritmo de compra deste ano, o município fecha por volta de ${arredondar(percentualProjetado)}%, abaixo dos ${PERCENTUAL_MINIMO_AF}%. Dá para corrigir agora; em dezembro, não.`;
  return { percentualProjetado, frase };
}

/** Quanto do repasse já virou compra registrada — aponta lançamento faltando, não só sobra de caixa. */
export function cobertura(apuracao: ApuracaoPnae): number | null {
  if (apuracao.repasse <= 0) return null;
  return (apuracao.gastoTotal / apuracao.repasse) * 100;
}

function arredondar(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function moeda(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}

/** Anos que valem oferecer na tela: o corrente e os dois anteriores. */
export function anosPnae(hoje: Date = new Date()): number[] {
  const ano = hoje.getUTCFullYear();
  return [ano, ano - 1, ano - 2];
}
