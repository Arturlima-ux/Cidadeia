// ── TETO DE DESPESA COM PESSOAL (LRF) ──
//
// A tela irmã dos mínimos constitucionais, com o sinal invertido: lá o risco é
// aplicar de menos, aqui é gastar demais. Vale dizer por que ela existe
// separada, e não como um terceiro cartão em "Mínimos".
//
// Misturar piso e teto na mesma lista é exatamente como o gestor erra a
// leitura. Nos mínimos, um número BAIXO é o problema e a ação é empenhar mais;
// aqui, um número ALTO é o problema e a ação é a oposta. Duas barras lado a
// lado, uma que precisa subir e outra que precisa descer, produzem decisão
// errada sob pressa — e a decisão errada aqui custa transferência voluntária.
//
// É também o número que mais derruba prefeito na prática: o piso de saúde e
// educação a prefeitura costuma cumprir sem esforço, porque a folha da rede já
// entra no cálculo. O teto de pessoal, não.
//
// Como nos mínimos, isto é ACOMPANHAMENTO, não o Relatório de Gestão Fiscal:
// a composição legal da despesa com pessoal e da RCL tem inclusões e exclusões
// que só o contador da prefeitura fecha.

/**
 * Limite máximo do Executivo municipal: 54% da Receita Corrente Líquida.
 *
 * Art. 20, III, "b" da Lei de Responsabilidade Fiscal. O art. 19, III fixa 60%
 * para o município inteiro e o art. 20 reparte: 6% para o Legislativo e 54%
 * para o Executivo. Quem usa este sistema é a prefeitura, então é o 54% que
 * importa — a câmara presta contas por conta própria.
 */
export const LIMITE_PESSOAL = 54;

/**
 * 95% do limite: daqui em diante valem as vedações do art. 22, parágrafo único.
 *
 * É o ponto que muda a vida administrativa do prefeito antes de qualquer
 * punição: ele ainda está dentro da lei, mas perde a caneta para nomear,
 * reajustar e criar cargo. Chegar aqui sem saber é o erro clássico.
 */
export const FRACAO_PRUDENCIAL = 0.95;

/**
 * 90% do limite: o Tribunal de Contas emite alerta (art. 59, § 1º, II).
 *
 * Não é sanção, é aviso formal — e é o primeiro momento em que o problema
 * deixa de ser interno e vira registro público. Por isso entra aqui: o valor
 * desta tela é chegar antes do ofício do TC, não depois dele.
 */
export const FRACAO_ALERTA = 0.9;

export const LIMITE_PRUDENCIAL = LIMITE_PESSOAL * FRACAO_PRUDENCIAL;
export const LIMITE_ALERTA = LIMITE_PESSOAL * FRACAO_ALERTA;

/**
 * Vedações que passam a valer no patamar prudencial.
 *
 * Art. 22, parágrafo único, incisos I a V. Ficam listadas porque a pergunta
 * que o prefeito faz ao ver o percentual não é "qual é o meu percentual", é
 * "então eu não posso mais nomear?".
 */
export const VEDACOES_PRUDENCIAL = [
  "Conceder vantagem, aumento, reajuste ou adequação de remuneração, salvo os derivados de sentença judicial ou de determinação legal ou contratual anterior.",
  "Criar cargo, emprego ou função.",
  "Alterar estrutura de carreira que implique aumento de despesa.",
  "Prover cargo público, admitir ou contratar pessoal a qualquer título, ressalvada a reposição decorrente de aposentadoria ou falecimento de servidores das áreas de educação, saúde e segurança.",
  "Contratar hora extra, salvo nas situações previstas na lei de diretrizes orçamentárias.",
] as const;

/**
 * O que o município perde se não reconduzir no prazo.
 *
 * Art. 23, § 3º. Diferente das vedações acima, estas não restringem a gestão
 * de pessoal — fecham a torneira que financia obra e convênio.
 */
export const SANCOES_PRAZO_ESGOTADO = [
  "Não poderá receber transferências voluntárias.",
  "Não poderá obter garantia, direta ou indireta, de outro ente.",
  "Não poderá contratar operações de crédito, ressalvadas as destinadas ao pagamento da dívida mobiliária e as que visem à redução das despesas com pessoal.",
] as const;

export const BASE_LEGAL_LIMITE =
  'Art. 20, III, "b" da Lei Complementar 101/2000 (LRF)';

export const CONSEQUENCIA_PESSOAL =
  "Além das restrições do art. 23, § 3º da LRF, deixar de promover a redução no prazo é infração administrativa punida com multa de 30% dos vencimentos anuais, nos termos do art. 5º, IV da Lei 10.028/2000.";

export type SituacaoPessoal = "confortavel" | "alerta" | "prudencial" | "excedido";

export const NOME_SITUACAO_PESSOAL: Record<SituacaoPessoal, string> = {
  confortavel: "Dentro do limite",
  alerta: "Alerta do Tribunal de Contas",
  prudencial: "Limite prudencial atingido",
  excedido: "Acima do limite legal",
};

export type PeriodoPessoal = {
  exercicio: number;
  /**
   * Mês em que se encerra a janela de doze meses (1 a 12).
   *
   * A despesa não é a do mês nem a do ano corrente: o art. 18, § 2º manda
   * somar o mês de referência com os onze imediatamente anteriores. Guardar o
   * mês final é o que permite ordenar os períodos e medir a recondução.
   *
   * A apuração oficial é quadrimestral (art. 22), e municípios com menos de
   * 50 mil habitantes podem publicar o RGF semestralmente. Aceitar qualquer
   * mês cobre os dois casos sem obrigar o gestor a mentir sobre a data.
   */
  mesReferencia: number;
  /** Receita Corrente Líquida dos doze meses, na forma do art. 2º, IV. */
  rcl: number;
  /** Despesa total com pessoal dos doze meses, na forma do art. 18. */
  despesa: number;
};

export type AvaliacaoPessoal = {
  percentual: number;
  situacao: SituacaoPessoal;
  /** Reais que ainda cabem até o limite legal. Zero quando já excedido. */
  margem: number;
  /** Reais acima do limite legal. Zero quando dentro. */
  excedente: number;
  /** Pontos percentuais acima do limite. Zero quando dentro. */
  excedentePontos: number;
  /**
   * Reais que ainda cabem até o patamar prudencial, onde as vedações começam.
   *
   * Separado da margem porque é a fronteira que chega primeiro e é a que muda
   * o dia a dia: um prefeito com 52% ainda está legal, mas já não nomeia.
   */
  margemAtePrudencial: number;
};

/**
 * Avalia um período de apuração.
 *
 * Devolve null quando não há RCL informada. Como nos mínimos, ausência de
 * informação não é zero: devolver 0% faria a tela dizer que a prefeitura não
 * gasta com pessoal, que é o oposto do risco real.
 */
export function avaliarDespesaPessoal(entrada: {
  rcl: number;
  despesa: number;
}): AvaliacaoPessoal | null {
  const { rcl } = entrada;
  if (!Number.isFinite(rcl) || rcl <= 0) return null;

  const despesa = Number.isFinite(entrada.despesa) && entrada.despesa > 0 ? entrada.despesa : 0;
  const percentual = (despesa / rcl) * 100;

  const tetoEmReais = (rcl * LIMITE_PESSOAL) / 100;
  const prudencialEmReais = (rcl * LIMITE_PRUDENCIAL) / 100;

  return {
    percentual,
    situacao: classificarPessoal(percentual),
    margem: Math.max(0, tetoEmReais - despesa),
    excedente: Math.max(0, despesa - tetoEmReais),
    excedentePontos: Math.max(0, percentual - LIMITE_PESSOAL),
    margemAtePrudencial: Math.max(0, prudencialEmReais - despesa),
  };
}

function classificarPessoal(percentual: number): SituacaoPessoal {
  if (percentual > LIMITE_PESSOAL) return "excedido";
  if (percentual >= LIMITE_PRUDENCIAL) return "prudencial";
  if (percentual >= LIMITE_ALERTA) return "alerta";
  return "confortavel";
}

export type Reconducao = {
  /** Período em que o limite foi ultrapassado pela primeira vez na sequência. */
  desde: { exercicio: number; mesReferencia: number };
  /** Excedente, em pontos percentuais, no período em que estourou. */
  excedenteInicialPontos: number;
  /**
   * Quantos períodos de apuração se passaram desde o estouro.
   * 0 = acabou de estourar; 1 = primeiro período seguinte; 2 = segundo.
   */
  periodosDecorridos: number;
  /**
   * Percentual máximo tolerado NESTE período pelo cronograma do art. 23.
   * Null no próprio período do estouro, quando ainda não há meta a cobrar.
   */
  metaDestePeriodo: number | null;
  /** Percentual máximo tolerado no PRÓXIMO período. */
  metaProximoPeriodo: number;
  percentualAtual: number;
  /** O percentual atual cabe na meta deste período. */
  noCronograma: boolean;
  /** Passaram-se os dois períodos e o excesso continua: valem as sanções. */
  prazoEsgotado: boolean;
};

/**
 * Acompanha o prazo de recondução do art. 23.
 *
 * O excedente deve ser eliminado nos dois quadrimestres seguintes, sendo pelo
 * menos um terço no primeiro. A conta é feita em PONTOS PERCENTUAIS, não em
 * reais, porque é assim que o artigo fala — e porque a RCL se move entre um
 * período e outro: um excedente medido em reais "sumiria" só com a receita
 * subindo, sem a prefeitura ter cortado nada.
 *
 * Recebe todos os períodos informados e olha para a sequência que termina no
 * mais recente. Se o município voltou para dentro do limite, não há prazo
 * correndo — e um estouro antigo já resolvido não deve reaparecer como alarme.
 */
export function avaliarReconducao(periodos: PeriodoPessoal[]): Reconducao | null {
  const ordenados = [...periodos]
    .filter((p) => Number.isFinite(p.rcl) && p.rcl > 0)
    .sort((a, b) => a.exercicio - b.exercicio || a.mesReferencia - b.mesReferencia);

  if (ordenados.length === 0) return null;

  const percentualDe = (p: PeriodoPessoal) => (p.despesa / p.rcl) * 100;

  const atual = ordenados[ordenados.length - 1];
  const percentualAtual = percentualDe(atual);
  if (percentualAtual <= LIMITE_PESSOAL) return null;

  // Recua enquanto os períodos anteriores também estiverem acima do limite: o
  // prazo conta do PRIMEIRO estouro da sequência, não do último período lido.
  let inicio = ordenados.length - 1;
  while (inicio > 0 && percentualDe(ordenados[inicio - 1]) > LIMITE_PESSOAL) {
    inicio -= 1;
  }

  const periodoInicial = ordenados[inicio];
  const excedenteInicialPontos = percentualDe(periodoInicial) - LIMITE_PESSOAL;
  const periodosDecorridos = ordenados.length - 1 - inicio;

  const metaPara = (n: number): number | null => {
    if (n <= 0) return null;
    if (n === 1) return LIMITE_PESSOAL + (excedenteInicialPontos * 2) / 3;
    return LIMITE_PESSOAL;
  };

  const metaDestePeriodo = metaPara(periodosDecorridos);

  return {
    desde: { exercicio: periodoInicial.exercicio, mesReferencia: periodoInicial.mesReferencia },
    excedenteInicialPontos,
    periodosDecorridos,
    metaDestePeriodo,
    metaProximoPeriodo: metaPara(periodosDecorridos + 1) as number,
    percentualAtual,
    noCronograma: metaDestePeriodo === null || percentualAtual <= metaDestePeriodo,
    prazoEsgotado: periodosDecorridos >= 2,
  };
}
