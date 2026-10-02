import {
  MINIMOS,
  CONSEQUENCIA_LEGAL,
  type AreaMinimo,
  type AvaliacaoMinimo,
} from "@/lib/minimos-constitucionais";
import {
  LIMITE_PESSOAL,
  LIMITE_PRUDENCIAL,
  BASE_LEGAL_LIMITE,
  CONSEQUENCIA_PESSOAL,
  type AvaliacaoPessoal,
} from "@/lib/despesa-pessoal";

// ── A TELA DO PREFEITO ──
//
// O painel responde "o que decido hoje". Esta tela responde outra pergunta, a
// que não aparece em lugar nenhum do produto e é a única que tira um prefeito
// do cargo: **as contas deste exercício passam no Tribunal?**
//
// A diferença não é de grau. O que exige decisão hoje é uma lista de tarefas,
// e some quando a tarefa é feita. O que o Tribunal julga é um conjunto fixo de
// frentes — os mínimos da saúde e da educação, o piso do FUNDEB, o teto da
// despesa com pessoal, a transparência ativa, os relatórios fiscais —, e cada
// uma delas já está implementada no produto, cada uma em sua tela.
//
// Estar em telas separadas é o problema. O prefeito precisaria abrir seis
// telas e somar de cabeça para saber se o mandato está em risco, e ninguém faz
// isso. Aqui as seis viram uma lista, ordenada por gravidade, com a
// consequência escrita ao lado — a consequência que já vinha declarada em cada
// módulo, porque inventar sanção para assustar cliente é o oposto do que um
// produto de conformidade pode fazer.
//
// ── A REGRA QUE GOVERNA ESTE ARQUIVO ──
//
// Ausência de dado NUNCA é conformidade.
//
// Uma prefeitura que não lançou a base de cálculo da educação não está
// cumprindo os 25% — está sem saber. Pintar isso de verde seria o pior defeito
// possível num produto vendido justamente para evitar rejeição de contas: o
// cliente fecharia o exercício tranquilo olhando uma tela nossa. Por isso
// `sem_dado` é uma situação própria, e aparece ACIMA de "no caminho" na ordem.

export type SituacaoFrente =
  /** Verificado e em conformidade. */
  | "cumprido"
  /** Em conformidade, com folga pequena ou fronteira próxima. */
  | "acompanhar"
  /** Ainda dá para corrigir dentro do exercício, mas não no ritmo atual. */
  | "risco"
  /** Fechar o exercício assim é descumprimento. */
  | "critico"
  /** Não há dado lançado. Não se afirma nem cumprimento nem descumprimento. */
  | "sem_dado";

export const NOME_SITUACAO_FRENTE: Record<SituacaoFrente, string> = {
  cumprido: "Cumprido",
  acompanhar: "Acompanhar",
  risco: "Em risco",
  critico: "Crítico",
  sem_dado: "Sem dado lançado",
};

export type Frente = {
  chave: string;
  titulo: string;
  situacao: SituacaoFrente;
  /** Onde a frente está, em uma frase, com os números já formatados. */
  veredito: string;
  /**
   * Reais que separam a prefeitura da conformidade nesta frente.
   *
   * Null quando a frente não se mede em dinheiro (transparência, prazo de
   * entrega) ou quando não há dado para calcular.
   */
  falta: number | null;
  /** O tamanho do esforço, quando o módulo sabe calculá-lo. */
  esforco: string | null;
  /** O que acontece se o exercício fechar assim. Vem do módulo, não daqui. */
  consequencia: string;
  /** A norma. O prefeito cita isso ao secretário; o secretário, no processo. */
  fundamento: string;
  /** A tela onde se resolve. Sem destino, a lista informa e não serve. */
  destino: string;
};

function pct(v: number): string {
  return `${v.toFixed(2).replace(".", ",")}%`;
}

/** 2026-11-30 → 30/11/2026 */
export function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function vezes(fator: number): string {
  return `${fator.toFixed(1).replace(".", ",")}×`;
}

// ── MÍNIMOS CONSTITUCIONAIS ──

const SITUACAO_DO_MINIMO: Record<AvaliacaoMinimo["situacao"], SituacaoFrente> = {
  cumprido: "cumprido",
  no_caminho: "acompanhar",
  risco: "risco",
  critico: "critico",
};

/**
 * Uma frente por mínimo constitucional.
 *
 * `avaliacao` nula significa que não há base de cálculo lançada para o
 * exercício — e aí a frente é `sem_dado`, nunca cumprida. Ver a regra no topo
 * do arquivo.
 */
export function frenteDoMinimo(
  area: AreaMinimo,
  avaliacao: AvaliacaoMinimo | null,
  formatarReais: (v: number) => string
): Frente {
  const m = MINIMOS[area];
  const base = {
    chave: `minimo_${area}`,
    titulo: `${m.area} — mínimo de ${m.percentual}%`,
    consequencia: CONSEQUENCIA_LEGAL,
    fundamento: m.base,
    destino: "/dashboard/minimos",
  };

  if (!avaliacao) {
    return {
      ...base,
      situacao: "sem_dado",
      veredito:
        `Nenhuma base de cálculo lançada neste exercício. Sem ela não há como afirmar que ` +
        `os ${m.percentual}% foram aplicados — e ausência de dado não é conformidade para o ` +
        `Tribunal de Contas.`,
      falta: null,
      esforco: null,
    };
  }

  const situacao = SITUACAO_DO_MINIMO[avaliacao.situacao];

  if (situacao === "cumprido") {
    return {
      ...base,
      situacao,
      veredito:
        `Aplicou ${pct(avaliacao.percentualAtual)} em ${m.despesaLegal}. O mínimo de ` +
        `${m.percentual}% já está atingido sobre a base informada até agora.`,
      falta: null,
      esforco: null,
    };
  }

  // A falta projetada é a que importa para quem decide: a falta "de hoje" se
  // paga com um empenho e reaparece no mês seguinte, porque a base cresce
  // junto. Quando não há meses suficientes para projetar, a de hoje serve.
  const falta = avaliacao.faltaProjetadaNoAno ?? avaliacao.faltaSobreBaseAtual;

  return {
    ...base,
    situacao,
    veredito:
      `Aplicou ${pct(avaliacao.percentualAtual)} dos ${m.percentual}% exigidos. ` +
      `Faltam ${formatarReais(falta)} para fechar o exercício no mínimo, mantido o ritmo da base.`,
    falta,
    esforco:
      avaliacao.fatorAceleracao !== null && avaliacao.mesesRestantes > 0
        ? `${vezes(avaliacao.fatorAceleracao)} o ritmo mensal atual nos ${avaliacao.mesesRestantes} ` +
          `${avaliacao.mesesRestantes === 1 ? "mês" : "meses"} que restam`
        : null,
  };
}

// ── TETO DA DESPESA COM PESSOAL ──

/**
 * A frente que anda no sentido contrário das outras.
 *
 * Nos mínimos o número precisa subir; aqui precisa descer. Juntá-las numa
 * lista só exige que cada linha diga para onde, senão o prefeito lê "54%" ao
 * lado de "25%" e conclui o oposto do que a lei manda.
 */
export function frenteDoPessoal(
  avaliacao: AvaliacaoPessoal | null,
  formatarReais: (v: number) => string
): Frente {
  const base = {
    chave: "pessoal",
    titulo: `Despesa com pessoal — teto de ${LIMITE_PESSOAL}%`,
    consequencia: CONSEQUENCIA_PESSOAL,
    fundamento: BASE_LEGAL_LIMITE,
    destino: "/dashboard/pessoal",
  };

  if (!avaliacao) {
    return {
      ...base,
      situacao: "sem_dado",
      veredito:
        `Nenhum período de apuração lançado. O percentual sai da Receita Corrente Líquida ` +
        `dos doze meses, e sem ela não há como saber de que lado do teto a prefeitura está.`,
      falta: null,
      esforco: null,
    };
  }

  if (avaliacao.situacao === "excedido") {
    return {
      ...base,
      situacao: "critico",
      veredito:
        `${pct(avaliacao.percentual)} da Receita Corrente Líquida, acima do teto de ` +
        `${LIMITE_PESSOAL}%. São ${formatarReais(avaliacao.excedente)} a cortar, ou ` +
        `${pct(avaliacao.excedentePontos)} de excesso a eliminar em até oito quadrimestres.`,
      falta: avaliacao.excedente,
      esforco: null,
    };
  }

  if (avaliacao.situacao === "prudencial") {
    return {
      ...base,
      situacao: "risco",
      veredito:
        `${pct(avaliacao.percentual)} da Receita Corrente Líquida — dentro do teto legal, mas ` +
        `acima do patamar prudencial de ${pct(LIMITE_PRUDENCIAL)}. As vedações já valem: nomear, ` +
        `reajustar e criar cargo passam a ser atos nulos.`,
      falta: null,
      esforco: null,
    };
  }

  if (avaliacao.situacao === "alerta") {
    return {
      ...base,
      situacao: "acompanhar",
      veredito:
        `${pct(avaliacao.percentual)} da Receita Corrente Líquida. Ainda confortável, mas já na ` +
        `faixa em que o Tribunal de Contas emite alerta. Restam ` +
        `${formatarReais(avaliacao.margemAtePrudencial)} até as vedações começarem.`,
      falta: null,
      esforco: null,
    };
  }

  return {
    ...base,
    situacao: "cumprido",
    veredito:
      `${pct(avaliacao.percentual)} da Receita Corrente Líquida, com ` +
      `${formatarReais(avaliacao.margem)} de margem até o teto.`,
    falta: null,
    esforco: null,
  };
}

// ── TRANSPARÊNCIA ATIVA ──

/**
 * A frente que não se mede em reais.
 *
 * Deliberadamente não declara sanção específica: o que a LAI cria é o dever de
 * divulgar, e o que o Tribunal faz com o descumprimento varia por estado.
 * Prometer multa certa venderia melhor e seria falso.
 */
export function frenteDaTransparencia(
  cobertura: { nome: string; atendida: boolean }[]
): Frente {
  const base = {
    chave: "transparencia",
    titulo: "Transparência ativa no portal",
    consequencia:
      "Apontamento de descumprimento da transparência ativa nas fiscalizações do Tribunal de " +
      "Contas, e dever de divulgar que permanece exigível independentemente de pedido.",
    fundamento: "Art. 8º da Lei 12.527/2011 (Lei de Acesso à Informação)",
    destino: "/dashboard/publicacoes",
  };

  if (cobertura.length === 0) {
    return {
      ...base,
      situacao: "sem_dado",
      veredito: "Nenhuma exigência de conteúdo foi conferida.",
      falta: null,
      esforco: null,
    };
  }

  const descobertas = cobertura.filter((c) => !c.atendida);

  if (descobertas.length === 0) {
    return {
      ...base,
      situacao: "cumprido",
      veredito:
        `As ${cobertura.length} exigências de conteúdo do portal estão publicadas.`,
      falta: null,
      esforco: null,
    };
  }

  return {
    ...base,
    situacao: "risco",
    veredito:
      `${descobertas.length} de ${cobertura.length} exigências de conteúdo seguem sem publicação: ` +
      `${descobertas.map((d) => d.nome).join(", ")}.`,
    falta: null,
    esforco: null,
  };
}

// ── RELATÓRIOS FISCAIS ──

export type EntradaRelatorios = {
  /**
   * Prazos do exercício que já venceram e cuja entrega NÃO foi confirmada
   * nesta sessão.
   *
   * Não é o mesmo que atraso. A confirmação de entrega vem de consulta ao
   * SICONFI, que é feita sob demanda para não bater na API do Tesouro a cada
   * visita — então aqui só se sabe que o prazo passou.
   */
  vencidosSemConferencia: number;
  /** O próximo prazo que ainda não venceu. */
  proximo: { sigla: string; rotulo: string; vencimento: string; consequencia: string } | null;
};

/**
 * O calendário fiscal, sem acusar ninguém.
 *
 * Esta frente é a única que não pode ser `cumprido`: afirmar entrega exigiria
 * confirmação do Tesouro, e o calendário por si só não confirma nada. Dizer
 * "em atraso" sem conferir seria pior ainda — acusaria de omissão quem
 * publicou no dia.
 */
export function frenteDosRelatorios(entrada: EntradaRelatorios): Frente {
  const base = {
    chave: "relatorios",
    titulo: "Relatórios fiscais obrigatórios",
    fundamento: "Arts. 52 e 54 da Lei Complementar 101/2000 (Lei de Responsabilidade Fiscal)",
    destino: "/dashboard/minimos",
    falta: null,
    esforco: null,
  };

  if (entrada.vencidosSemConferencia > 0) {
    return {
      ...base,
      situacao: "sem_dado",
      consequencia:
        entrada.proximo?.consequencia ??
        "Suspensão de transferências voluntárias e de contratação de operações de crédito, " +
          "nos termos do art. 51, §2º da Lei Complementar 101/2000.",
      veredito:
        `${entrada.vencidosSemConferencia} ${entrada.vencidosSemConferencia === 1 ? "prazo" : "prazos"} ` +
        `deste exercício já ${entrada.vencidosSemConferencia === 1 ? "venceu" : "venceram"} e a entrega ` +
        `não foi conferida. A confirmação vem do próprio Tesouro, e a conferência é um clique na tela ` +
        `de mínimos.`,
    };
  }

  if (!entrada.proximo) {
    return {
      ...base,
      situacao: "sem_dado",
      consequencia:
        "Suspensão de transferências voluntárias e de contratação de operações de crédito, " +
        "nos termos do art. 51, §2º da Lei Complementar 101/2000.",
      veredito: "Nenhum prazo do exercício foi calculado para esta prefeitura.",
    };
  }

  return {
    ...base,
    situacao: "acompanhar",
    consequencia: entrada.proximo.consequencia,
    veredito:
      `Nenhum prazo vencido sem conferência. O próximo é o ${entrada.proximo.sigla} do ` +
      `${entrada.proximo.rotulo}, em ${dataBr(entrada.proximo.vencimento)}.`,
  };
}

/**
 * Como introduzir a consequência legal, por situação.
 *
 * Não é enfeite. A frase era "Se o exercício fechar assim:" em toda linha, e
 * numa frente CUMPRIDA isso afirmava o contrário do verdadeiro: fechar o
 * exercício "assim" — com os 25% aplicados — é exatamente o que evita a
 * rejeição das contas. O texto acusava de rejeição quem estava em
 * conformidade, e foi a tela rodando sobre dado real que mostrou isso.
 *
 * Numa frente sem dado também não cabe: não se sabe como ela vai fechar.
 */
export function rotuloDaConsequencia(situacao: SituacaoFrente): string {
  switch (situacao) {
    case "critico":
      return "Se o exercício fechar assim";
    case "risco":
      return "Se o ritmo não mudar";
    case "sem_dado":
      return "O que está em jogo aqui";
    default:
      return "O que esta frente evita";
  }
}

// ── IDADE DO DADO ──

/**
 * Dado velho não sustenta veredito verde.
 *
 * As telas de mínimos e de despesa com pessoal já tiram a cor do veredito
 * quando a última medição envelhece, e a razão é a mesma aqui: uma base de
 * março continuaria dizendo "cumprido" em outubro, em verde, com duas casas
 * decimais, sobre um número que ninguém confirma desde o primeiro trimestre.
 *
 * A degradação é de mão única. Uma frente crítica continua crítica: medição
 * velha não melhora descumprimento, e aplicar pouco em março não deixa de ser
 * aplicar pouco porque o dado é antigo. Só o verde cai.
 */
export function degradarPorIdade(frente: Frente, aviso: string | null): Frente {
  if (!aviso) return frente;

  if (frente.situacao !== "cumprido" && frente.situacao !== "acompanhar") {
    return { ...frente, veredito: `${frente.veredito} ${aviso}` };
  }

  return {
    ...frente,
    situacao: "sem_dado",
    veredito:
      `${frente.veredito} ${aviso} Sobre medição dessa idade não se afirma cumprimento.`,
  };
}

// ── A ORDEM ──

/**
 * Gravidade primeiro, e `sem_dado` acima de `acompanhar`.
 *
 * A posição do `sem_dado` é uma decisão, não um descuido: "não sabemos se a
 * educação cumpre os 25%" é mais urgente que "a saúde está no caminho". A
 * primeira é um exercício que pode fechar em rejeição sem ninguém perceber; a
 * segunda está sob controle.
 */
export const PESO_SITUACAO: Record<SituacaoFrente, number> = {
  critico: 0,
  risco: 1,
  sem_dado: 2,
  acompanhar: 3,
  cumprido: 4,
};

export function ordenarFrentes(frentes: Frente[]): Frente[] {
  return [...frentes].sort(
    (a, b) => PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao]
  );
}

/**
 * Quanto dinheiro separa a prefeitura da conformidade.
 *
 * Soma apenas as frentes que estão fora de conformidade E sabem dizer quanto.
 * Uma frente cumprida não entra (não falta nada), e uma `sem_dado` também não
 * — somar zero por ela produziria um total que parece completo e não é.
 */
export function totalQueFalta(frentes: Frente[]): { reais: number; frentes: number } {
  const contam = frentes.filter(
    (f) => (f.situacao === "critico" || f.situacao === "risco") && f.falta !== null
  );
  return {
    reais: contam.reduce((s, f) => s + (f.falta ?? 0), 0),
    frentes: contam.length,
  };
}

export type Veredito = { tom: SituacaoFrente; frase: string };

/**
 * A frase que o prefeito lê antes de qualquer número.
 *
 * Reporta sempre a situação mais grave presente, e trata `sem_dado` como algo
 * a dizer em voz alta mesmo quando todo o resto está verde — porque é
 * exatamente nessa combinação que uma tela tranquiliza quem não deveria estar
 * tranquilo.
 */
export function vereditoGeral(frentes: Frente[]): Veredito {
  if (frentes.length === 0) {
    return {
      tom: "sem_dado",
      frase: "Nenhuma frente foi verificada: não há dado lançado para avaliar as contas.",
    };
  }

  const conta = (s: SituacaoFrente) => frentes.filter((f) => f.situacao === s).length;
  const criticos = conta("critico");
  const riscos = conta("risco");
  const semDado = conta("sem_dado");

  const semDadoFrase =
    semDado === 0
      ? ""
      : semDado === 1
      ? " Uma frente está sem dado lançado."
      : ` ${semDado} frentes estão sem dado lançado.`;

  if (criticos > 0) {
    const riscoFrase =
      riscos === 0
        ? ""
        : riscos === 1
        ? " Outra ainda dá para corrigir."
        : ` Outras ${riscos} ainda dão para corrigir.`;
    return {
      tom: "critico",
      frase:
        `${criticos === 1 ? "1 frente está" : `${criticos} frentes estão`} em situação de ` +
        `descumprimento se o exercício fechar assim.` +
        riscoFrase +
        semDadoFrase,
    };
  }

  if (riscos > 0) {
    return {
      tom: "risco",
      frase:
        `Nenhuma frente está em descumprimento, mas ${riscos === 1 ? "1 não fecha" : `${riscos} não fecham`} ` +
        `o exercício no ritmo atual.` + semDadoFrase,
    };
  }

  if (semDado > 0) {
    return {
      tom: "sem_dado",
      frase:
        `Nada no que está lançado aponta descumprimento — mas ` +
        `${semDado === 1 ? "uma frente está" : `${semDado} frentes estão`} sem dado, e ausência de dado ` +
        `não é conformidade para o Tribunal de Contas.`,
    };
  }

  if (conta("acompanhar") > 0) {
    return {
      tom: "acompanhar",
      frase: `As ${frentes.length} frentes estão em conformidade, com ${conta("acompanhar")} em faixa de atenção.`,
    };
  }

  return {
    tom: "cumprido",
    frase: `As ${frentes.length} frentes verificadas estão cumpridas sobre o dado lançado até agora.`,
  };
}
