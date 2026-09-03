// ── MÍNIMOS CONSTITUCIONAIS DE EDUCAÇÃO E SAÚDE ──
//
// Aplicar menos que o mínimo em ensino ou em saúde é a causa mais comum de
// rejeição de contas municipais, e rejeição por irregularidade insanável abre
// inelegibilidade. O prefeito costuma descobrir o problema quando o bimestre
// fecha e o contador entrega o demonstrativo — em novembro, sem tempo de
// corrigir dentro do exercício.
//
// O que este módulo faz é o que falta: acompanhar durante o ano e dizer
// QUANTO FALTA, em reais, enquanto ainda dá para empenhar.
//
// ── O QUE ISTO NÃO É ──
//
// Não é o demonstrativo oficial. O cálculo legal do MDE e do ASPS tem
// inclusões e exclusões (restos a pagar, FUNDEB, receita de multas de
// impostos, despesas que não contam como ASPS) que só o contador da
// prefeitura fecha. Verificamos: os anexos oficiais do RREO que trariam esse
// número pronto — Anexo 08 para ensino, Anexo 12 para saúde — voltam VAZIOS
// na API do Tesouro para todos os municípios que testamos.
//
// Então a peça é deliberadamente de acompanhamento, não de fechamento, e a
// tela precisa dizer isso. Um número apresentado como oficial que depois não
// bate com o do contador destrói a confiança inteira do produto — e, pior,
// pode fazer um prefeito parar de empenhar achando que já cumpriu.

/**
 * Percentuais mínimos e a norma que os cria.
 *
 * Ficam com a base legal ao lado do número porque é assim que a informação é
 * usada: o secretário precisa citar a norma no processo, e nós precisamos
 * saber o que reler se algum dia mudar.
 */
export const MINIMOS = {
  educacao: {
    percentual: 25,
    area: "Educação",
    despesaLegal: "Manutenção e Desenvolvimento do Ensino (MDE)",
    base: "Art. 212 da Constituição Federal",
    incideSobre: "receita resultante de impostos, compreendida a proveniente de transferências",
  },
  saude: {
    percentual: 15,
    area: "Saúde",
    despesaLegal: "Ações e Serviços Públicos de Saúde (ASPS)",
    base: "Art. 7º da Lei Complementar 141/2012",
    incideSobre: "produto da arrecadação dos impostos a que se refere o art. 156 da Constituição",
  },
  // Um piso DENTRO da educação, não ao lado dela: o município pode cumprir os
  // 25% do art. 212 com folga e mesmo assim descumprir este, porque aqui não
  // se pergunta quanto foi para o ensino, e sim quanto do FUNDEB virou
  // remuneração de professor. É o erro que passa despercebido justamente
  // porque o número grande está verde.
  //
  // A EC 108/2020 subiu o piso de 60% para 70% e alargou o destinatário: era
  // "profissionais do magistério", passou a ser "profissionais da educação
  // básica" — quem lembra da regra antiga aplica o percentual errado sobre a
  // base errada.
  fundeb: {
    percentual: 70,
    area: "FUNDEB",
    despesaLegal: "remuneração dos profissionais da educação básica em efetivo exercício",
    base: "Art. 212-A, XI da Constituição Federal, regulamentado pelo art. 26 da Lei 14.113/2020",
    incideSobre: "recursos anuais totais recebidos do FUNDEB, incluída a complementação da União",
  },
} as const;

export type AreaMinimo = keyof typeof MINIMOS;

export const AREAS_MINIMO: AreaMinimo[] = ["educacao", "saude", "fundeb"];

/** Consequência de fechar o exercício abaixo do mínimo. */
export const CONSEQUENCIA_LEGAL =
  "Rejeição das contas pelo Tribunal de Contas e possível inelegibilidade, nos termos do art. 1º, I, g, da Lei Complementar 64/1990.";

export type Situacao = "cumprido" | "no_caminho" | "risco" | "critico";

export const NOME_SITUACAO: Record<Situacao, string> = {
  cumprido: "Mínimo já atingido",
  no_caminho: "No caminho",
  risco: "Abaixo do ritmo",
  critico: "Risco de rejeição",
};

export type EntradaMinimo = {
  area: AreaMinimo;
  /**
   * Base de cálculo acumulada no exercício, em reais. Vem do contador da
   * prefeitura — é o número que só ele fecha.
   */
  base: number;
  /** Despesa já aplicada na área, acumulada no exercício, em reais. */
  aplicado: number;
  /**
   * Quantos meses do exercício já se passaram (1 a 12). É o que permite
   * separar "aplicou pouco" de "ainda é março".
   */
  mesesDecorridos: number;
};

export type AvaliacaoMinimo = {
  area: AreaMinimo;
  exigido: number;
  /** Percentual aplicado até agora sobre a base informada. */
  percentualAtual: number;
  /** Reais que faltam para atingir o mínimo SOBRE A BASE DE HOJE. */
  faltaSobreBaseAtual: number;
  /**
   * Projeção do percentual no fim do exercício, mantido o ritmo atual.
   * Null quando não há meses decorridos suficientes para projetar.
   *
   * Note que ele coincide com `percentualAtual`, e isso não é um descuido: se
   * base e despesa crescem no mesmo ritmo, o percentual não se move. É
   * justamente por isso que ficar abaixo do mínimo em junho JÁ é ficar abaixo
   * em dezembro — só acelerar o gasto muda o resultado.
   */
  percentualProjetado: number | null;
  /**
   * Reais que faltam para fechar o ano no mínimo, se a base crescer no mesmo
   * ritmo. Null pelo mesmo motivo acima.
   */
  faltaProjetadaNoAno: number | null;
  /**
   * Quantas vezes o ritmo mensal atual precisa ser multiplicado, nos meses que
   * restam, para fechar o exercício no mínimo.
   *
   * É o número mais acionável do módulo: "1,8x" diz ao secretário o tamanho do
   * esforço, coisa que um percentual sozinho não diz. Null quando não há o que
   * acelerar (mínimo já atingido) ou quando não resta mês para isso.
   */
  fatorAceleracao: number | null;
  /** Meses que ainda restam no exercício. */
  mesesRestantes: number;
  situacao: Situacao;
};

/**
 * Meses decorridos abaixo dos quais não projetamos.
 *
 * Com um ou dois meses o ritmo ainda não significa nada — janeiro costuma ter
 * despesa baixa em toda prefeitura, e extrapolar isso para o ano produziria um
 * alarme falso logo na primeira tela que o prefeito abre.
 */
const MESES_MINIMOS_PARA_PROJETAR = 3;

/**
 * Faixas do fator de aceleração.
 *
 * Abaixo de 1,15x o ajuste cabe na variação normal de um cronograma de
 * empenho — não é notícia. Acima de 1,5x a prefeitura precisaria gastar meio
 * ano a mais em metade do tempo, o que raramente acontece sem remanejamento
 * orçamentário; aí é urgente, não é acompanhamento.
 */
const ACELERACAO_CONFORTAVEL = 1.15;
const ACELERACAO_GRAVE = 1.5;

export function avaliarMinimo(entrada: EntradaMinimo): AvaliacaoMinimo {
  const { area, base, aplicado } = entrada;
  const exigido = MINIMOS[area].percentual;
  const meses = Math.min(12, Math.max(0, Math.trunc(entrada.mesesDecorridos)));

  // Base zerada não é "0% aplicado", é ausência de informação. Devolver 0
  // faria a tela acusar o gestor de descumprir algo que ninguém mediu.
  const mesesRestantes = 12 - meses;

  if (!Number.isFinite(base) || base <= 0) {
    return {
      area,
      exigido,
      percentualAtual: 0,
      faltaSobreBaseAtual: 0,
      percentualProjetado: null,
      faltaProjetadaNoAno: null,
      fatorAceleracao: null,
      mesesRestantes,
      situacao: "no_caminho",
    };
  }

  const aplicadoValido = Number.isFinite(aplicado) && aplicado > 0 ? aplicado : 0;
  const percentualAtual = (aplicadoValido / base) * 100;
  const faltaSobreBaseAtual = Math.max(0, (base * exigido) / 100 - aplicadoValido);

  let percentualProjetado: number | null = null;
  let faltaProjetadaNoAno: number | null = null;
  let fatorAceleracao: number | null = null;

  if (meses >= MESES_MINIMOS_PARA_PROJETAR) {
    // Base e despesa crescem pelo MESMO fator, então o percentual projetado
    // coincide com o atual. Sem conhecer a sazonalidade real de cada
    // município, inventar uma curva seria chutar. O que a projeção acrescenta
    // é o VALOR em reais que falta empenhar até dezembro — e o esforço que
    // isso representa.
    const fatorAno = 12 / meses;
    const baseProjetada = base * fatorAno;
    const aplicadoProjetado = aplicadoValido * fatorAno;

    percentualProjetado = (aplicadoProjetado / baseProjetada) * 100;
    faltaProjetadaNoAno = Math.max(0, (baseProjetada * exigido) / 100 - aplicadoProjetado);

    if (faltaProjetadaNoAno > 0 && mesesRestantes > 0 && aplicadoValido > 0) {
      const ritmoAtualMensal = aplicadoValido / meses;
      const ritmoNecessarioMensal = faltaProjetadaNoAno / mesesRestantes + ritmoAtualMensal;
      fatorAceleracao = ritmoNecessarioMensal / ritmoAtualMensal;
    }
  }

  return {
    area,
    exigido,
    percentualAtual,
    faltaSobreBaseAtual,
    percentualProjetado,
    faltaProjetadaNoAno,
    fatorAceleracao,
    mesesRestantes,
    situacao: classificar({
      percentualAtual,
      exigido,
      meses,
      mesesRestantes,
      fatorAceleracao,
    }),
  };
}

/**
 * Regra de severidade.
 *
 * Não classifica pelo percentual, e sim pelo TAMANHO DO ESFORÇO que ainda
 * corrige o ano. É o que separa um município que precisa de um ajuste fino de
 * outro que precisaria dobrar o gasto em quatro meses — dois casos que o
 * percentual sozinho mostra igual.
 */
function classificar(e: {
  percentualAtual: number;
  exigido: number;
  meses: number;
  mesesRestantes: number;
  fatorAceleracao: number | null;
}): Situacao {
  if (e.percentualAtual >= e.exigido) return "cumprido";

  // Exercício encerrado e abaixo do mínimo: não há mais o que acelerar.
  if (e.mesesRestantes <= 0) return "critico";

  // Cedo demais para julgar ritmo. Janeiro e fevereiro têm despesa baixa em
  // toda prefeitura, e acusar isso geraria alarme em todo município do país.
  if (e.fatorAceleracao === null) {
    return e.meses < MESES_MINIMOS_PARA_PROJETAR ? "no_caminho" : "risco";
  }

  if (e.fatorAceleracao <= ACELERACAO_CONFORTAVEL) return "no_caminho";
  if (e.fatorAceleracao >= ACELERACAO_GRAVE) return "critico";

  // Esforço intermediário: vira crítico só quando o tempo aperta.
  return e.mesesRestantes <= 3 ? "critico" : "risco";
}

/**
 * Frase pronta para a tela e para o relatório em PDF.
 *
 * Sai daqui, e não do componente, porque o mesmo texto precisa aparecer no
 * painel, no alerta e no relatório — e três cópias divergem.
 */
export function resumirAvaliacao(a: AvaliacaoMinimo, formatarReais: (v: number) => string): string {
  const { area, percentualAtual, exigido } = a;
  const nome = MINIMOS[area].area;
  const atual = percentualAtual.toFixed(2).replace(".", ",");

  if (a.situacao === "cumprido") {
    return `${nome} está em ${atual}% da base de cálculo, acima do mínimo de ${exigido}%.`;
  }

  const falta = a.faltaProjetadaNoAno ?? a.faltaSobreBaseAtual;
  return (
    `${nome} está em ${atual}%, abaixo do mínimo de ${exigido}%. ` +
    `Faltam ${formatarReais(falta)} para fechar o exercício dentro do limite.`
  );
}
