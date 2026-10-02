import { regressaoLinear } from "@/lib/projecao";
import { FUSO_PADRAO } from "@/lib/horario";
import {
  LIMITE_PESSOAL,
  LIMITE_PRUDENCIAL,
  LIMITE_ALERTA,
  BASE_LEGAL_LIMITE,
} from "@/lib/despesa-pessoal";

// ── O QUE FALTAVA: A TRAJETÓRIA ──
//
// Tudo que o produto avisa hoje dispara quando o problema JÁ chegou. A despesa
// com pessoal vira alerta ao passar de 48,6% da receita; a obra vira achado
// depois de 14 dias parada; o saldo vira alerta quando já está negativo.
// Todas são regras sobre o estado de hoje, e todas são corretas — e nenhuma
// delas serve para quem precisava ter agido antes.
//
// Uma prefeitura em 46% da receita subindo 1,2 pontos por quadrimestre não
// dispara regra nenhuma. Está confortável por qualquer limiar. E vai bater no
// patamar prudencial — onde nomear passa a ser ato nulo — dentro de um ano,
// num momento em que a folha já foi contratada e não há como desfazer.
//
// Este módulo responde "QUANDO", e só isso. O "o quê" já tem dono em
// deteccao-automatica.ts, e o "como está" em analise-local.ts.
//
// ── POR QUE ISTO NÃO É A PROJEÇÃO QUE JÁ EXISTE ──
//
// lib/projecao.ts responde "quanto vale no mês que vem". É uma pergunta mais
// fácil e menos útil: o gestor não decide sobre o valor do mês seguinte, ele
// decide sobre o momento em que cruza uma fronteira que tem consequência
// legal. A reta é a mesma — importada de lá, não reescrita.
//
// ── A HONESTIDADE QUE ESTE ARQUIVO PRECISA TER ──
//
// Prever data é a coisa mais fácil de fazer errado e a mais cara quando sai
// errada: um aviso falso queima a credibilidade de todos os avisos
// verdadeiros ao lado dele. Daí quatro recusas explícitas, cada uma testada:
//
//   1. menos de 4 leituras: não se traça rota com três pontos;
//   2. reta que explica pouco da variação: é nuvem, não trajetória;
//   3. série andando PARA LONGE do limiar: não há travessia a prever;
//   4. travessia além do horizonte: "você estoura o teto em 2032" é
//      aritmética sobre ruído, e desacredita o resto da tela.
//
// Em todos os quatro o módulo devolve null e cala a boca. Silêncio é o
// comportamento correto de um previsor sem base, e é por isso que esta tela
// começa vazia numa prefeitura nova — e continua vazia até haver histórico.

/**
 * Leituras necessárias para arriscar uma data.
 *
 * lib/projecao.ts projeta com três, e está certo para o que faz: três pontos
 * dão uma DIREÇÃO. Uma data é afirmação mais forte que uma direção, e com três
 * pontos o terceiro decide sozinho a inclinação — uma apuração atípica viraria
 * previsão.
 */
export const MINIMO_LEITURAS = 4;

/**
 * Até onde faz sentido prever.
 *
 * Dezoito meses cobrem o horizonte em que um prefeito ainda consegue mudar a
 * trajetória: dá tempo de rever folha, renegociar contrato, remanejar
 * orçamento. Além disso a previsão não informa decisão nenhuma e só serve para
 * assustar — e um aviso que não cabe em nenhuma decisão é ruído.
 */
export const HORIZONTE_MESES = 18;

/**
 * Quanto da variação a reta precisa explicar.
 *
 * Abaixo de 0,5 a série oscila mais do que anda, e a reta ajustada nela
 * produz travessias que mudam de data a cada leitura nova. É a diferença
 * entre uma tendência e uma nuvem de pontos com uma linha por cima.
 */
export const R2_MINIMO = 0.5;

/**
 * Idade máxima da última apuração para a trajetória ainda valer.
 *
 * ── O DEFEITO QUE ISTO FECHA ──
 *
 * Sem esta recusa, uma série que parou de ser alimentada continuava gerando
 * previsão, e a previsão nascia com data NO PASSADO: última apuração de
 * setembro de 2024, travessia em oito meses, resultado "por volta de maio de
 * 2025" exibido em 2026. Um aviso sobre o futuro apontando para trás é pior
 * que nenhum aviso — ele prova ao gestor que a tela não sabe que dia é hoje.
 *
 * Dez meses porque a apuração da despesa com pessoal é quadrimestral: dois
 * quadrimestres vencidos sem lançamento é prefeitura que parou de alimentar o
 * módulo, e aí o problema a resolver é o lançamento, não a trajetória.
 */
export const IDADE_MAXIMA_MESES = 10;

const DIAS_NO_MES = 30.44;

export type Confianca = "baixa" | "média" | "alta";

export type Travessia = {
  /** Meses até cruzar o limiar, contados da última leitura real. */
  mesesAte: number;
  /**
   * Meses até a travessia contados de HOJE.
   *
   * Separado de `mesesAte` porque é este que vai para o texto: o gestor lê "em
   * cerca de 8 meses" e conta a partir de hoje, não a partir do fim do
   * quadrimestre apurado. Com os dois iguais, a frase e a data divergiam em um
   * mês — "em cerca de 8 meses" ao lado de uma data que caía no sétimo.
   */
  mesesDeHoje: number;
  /** Data aproximada da travessia (ISO). */
  em: string;
  /** Ritmo medido, na unidade da série, por mês. Sinal preservado. */
  ritmoPorMes: number;
  /** Valor da última leitura REAL — não o da reta. */
  valorAtual: number;
  /** Data da última leitura real (ISO). */
  atualEm: string;
  limiar: number;
  /** O quanto a reta explica a variação observada. */
  r2: number;
  leituras: number;
  confianca: Confianca;
};

function confiancaPor(leituras: number, r2: number): Confianca {
  if (leituras >= 8 && r2 >= 0.8) return "alta";
  if (leituras >= 6 && r2 >= 0.65) return "média";
  return "baixa";
}

/**
 * Quando a série cruza o limiar, se cruzar.
 *
 * `serie` aceita qualquer ordem — é ordenada por data aqui, porque a ordem do
 * banco varia por consulta e uma série invertida produziria ritmo com sinal
 * trocado, isto é, um aviso dizendo exatamente o contrário da realidade.
 *
 * O cálculo parte da ÚLTIMA LEITURA REAL e aplica o ritmo medido, em vez de
 * partir do valor da reta naquele ponto. Não é detalhe: a reta pode estar
 * acima ou abaixo do último dado, e aí a previsão contradiria o número que o
 * gestor tem na tela — "você está em 50,1%" ao lado de "a 51,3% faltam 2
 * meses" quando a reta já passou de 51,3. A reta serve para medir o ritmo,
 * que é o que ela mede bem.
 */
export function projetarTravessia(
  serie: Array<{ valor: number | null; em: string }>,
  limiar: number,
  sentido: "subindo" | "descendo",
  opcoes: {
    minimoLeituras?: number;
    horizonteMeses?: number;
    r2Minimo?: number;
    idadeMaximaMeses?: number;
    agora?: Date;
  } = {}
): Travessia | null {
  const minimoLeituras = opcoes.minimoLeituras ?? MINIMO_LEITURAS;
  const horizonteMeses = opcoes.horizonteMeses ?? HORIZONTE_MESES;
  const r2Minimo = opcoes.r2Minimo ?? R2_MINIMO;
  const idadeMaximaMeses = opcoes.idadeMaximaMeses ?? IDADE_MAXIMA_MESES;
  const agora = opcoes.agora ?? new Date();

  const validas = serie
    .filter((l): l is { valor: number; em: string } => l.valor !== null && Number.isFinite(l.valor))
    .map((l) => ({ ...l, t: Date.parse(l.em) }))
    .filter((l) => !Number.isNaN(l.t))
    .sort((a, b) => a.t - b.t);

  // RECUSA 1 — não se traça rota com três pontos.
  if (validas.length < minimoLeituras) return null;

  const ultima = validas[validas.length - 1]!;

  // RECUSA 5 — série que parou de ser alimentada não descreve trajetória
  // nenhuma, e gerava previsão com data no passado. Ver IDADE_MAXIMA_MESES.
  const idadeMeses = (agora.getTime() - ultima.t) / (DIAS_NO_MES * 86_400_000);
  if (idadeMeses > idadeMaximaMeses) return null;

  // RECUSA 3a — já cruzou. O presente é assunto das regras, não da previsão:
  // prever travessia de quem já atravessou produziria "em 0 meses" ao lado do
  // alerta que já está disparado, repetindo a mesma notícia em dois tons.
  const jaCruzou = sentido === "subindo" ? ultima.valor >= limiar : ultima.valor <= limiar;
  if (jaCruzou) return null;

  const base = validas[0]!.t;
  const { inclinacao, r2 } = regressaoLinear(
    validas.map((l) => ({ x: (l.t - base) / 86_400_000, y: l.valor }))
  );

  const ritmoPorMes = inclinacao * DIAS_NO_MES;

  // RECUSA 3b — andando para longe do limiar, ou parada. Sem movimento na
  // direção da fronteira não existe travessia a prever, e dividir por um ritmo
  // perto de zero devolveria "em 4.000 meses".
  if (ritmoPorMes === 0) return null;
  if (sentido === "subindo" && ritmoPorMes <= 0) return null;
  if (sentido === "descendo" && ritmoPorMes >= 0) return null;

  // RECUSA 2 — reta que explica pouco é nuvem, não trajetória.
  if (!Number.isFinite(r2) || r2 < r2Minimo) return null;

  const mesesAte = (limiar - ultima.valor) / ritmoPorMes;
  if (!Number.isFinite(mesesAte) || mesesAte <= 0) return null;

  // RECUSA 4 — além do horizonte em que ainda se pode mudar a rota.
  if (mesesAte > horizonteMeses) return null;

  const emMs = ultima.t + mesesAte * DIAS_NO_MES * 86_400_000;
  // Cinto, além da RECUSA 5: se por qualquer caminho a travessia cair antes de
  // hoje, não há futuro a anunciar.
  if (emMs <= agora.getTime()) return null;

  const mesesDeHoje = (emMs - agora.getTime()) / (DIAS_NO_MES * 86_400_000);

  return {
    mesesAte: Math.round(mesesAte * 10) / 10,
    mesesDeHoje: Math.round(mesesDeHoje * 10) / 10,
    em: new Date(emMs).toISOString(),
    ritmoPorMes,
    valorAtual: ultima.valor,
    atualEm: ultima.em,
    limiar,
    r2: Math.round(r2 * 100) / 100,
    leituras: validas.length,
    confianca: confiancaPor(validas.length, r2),
  };
}

// ── O TEXTO ──

/** "março de 2027" */
export function mesAnoDe(iso: string, fuso = FUSO_PADRAO): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "data indefinida";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, month: "long", year: "numeric" })
    .format(d);
}

/**
 * "na próxima apuração" / "em cerca de 5 meses".
 *
 * Nunca número exato de meses: a precisão de "em 4,7 meses" é falsa, e é
 * justamente a falsa precisão que faz um gestor descobrir que a previsão errou
 * e parar de acreditar nas outras.
 */
export function emPalavras(mesesAte: number): string {
  if (mesesAte < 1.5) return "já na próxima apuração";
  if (mesesAte < 2.5) return "em cerca de dois meses";
  const meses = Math.round(mesesAte);
  if (meses >= 12) {
    const anos = meses / 12;
    return anos >= 1.75 ? "em cerca de dois anos" : "em cerca de um ano";
  }
  return `em cerca de ${meses} meses`;
}

const RESSALVA: Record<Confianca, string> = {
  alta: "",
  média: " A base é curta: a data pode andar alguns meses.",
  baixa:
    " A base é curta e irregular: trate a data como ordem de grandeza, não como prazo.",
};

/**
 * Como a previsão foi feita, em uma frase.
 *
 * Fica sempre visível, junto do aviso. Previsão sem o método ao lado é palpite
 * com cara de certeza, e num produto de conformidade o gestor precisa poder
 * desconfiar do número antes de levá-lo a uma reunião.
 */
export function comoFoiCalculado(t: Travessia, unidade: string): string {
  const ritmo = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(
    Math.abs(t.ritmoPorMes)
  );
  const direcao = t.ritmoPorMes > 0 ? "subindo" : "caindo";
  return (
    `Reta ajustada sobre ${t.leituras} apurações, ${direcao} ${ritmo} ${unidade} por mês ` +
    `(a reta explica ${Math.round(t.r2 * 100)}% da variação observada).` +
    RESSALVA[t.confianca]
  );
}

// ── AS ANTECIPAÇÕES ──

export type Antecipacao = {
  chave: string;
  titulo: string;
  /** O que vai acontecer, em uma frase. */
  oQue: string;
  /** Quando, em palavras. */
  quando: string;
  /** De onde saiu. O gestor tem que poder desconfiar antes de usar. */
  base: string;
  /** O que fazer enquanto ainda dá. É o que separa previsão de agouro. */
  acao: string;
  /** A norma, quando a fronteira é legal. */
  fundamento: string | null;
  prioridade: "urgente" | "medio" | "info";
  destino: string;
  travessia: Travessia;
};

/**
 * As três fronteiras da despesa com pessoal, na ordem em que se chega nelas.
 *
 * Três e não uma porque a primeira que importa não é o teto: é o patamar
 * prudencial, onde nomear, reajustar e criar cargo passam a ser atos nulos. Um
 * prefeito avisado só do teto de 54% descobre as vedações ao assinar a nomeação
 * que já não podia assinar.
 */
const FRONTEIRAS_PESSOAL: {
  limiar: number;
  nome: string;
  oQue: string;
  acao: string;
  prioridade: Antecipacao["prioridade"];
}[] = [
  {
    limiar: LIMITE_ALERTA,
    nome: "faixa de alerta",
    oQue:
      "a despesa com pessoal entra na faixa em que o Tribunal de Contas emite alerta formal",
    acao:
      "É a hora barata de agir: revisar contratações previstas e horas extras ainda cabe no " +
      "orçamento do exercício, sem mexer em ninguém que já está na folha.",
    prioridade: "info",
  },
  {
    limiar: LIMITE_PRUDENCIAL,
    nome: "patamar prudencial",
    oQue:
      "a despesa com pessoal atinge o patamar prudencial, onde nomear, reajustar e criar cargo " +
      "passam a ser atos nulos",
    acao:
      "Decida agora quais nomeações e reajustes acontecem antes da fronteira — depois dela, o ato " +
      "é nulo, e nulo não se conserta com justificativa.",
    prioridade: "medio",
  },
  {
    limiar: LIMITE_PESSOAL,
    nome: "teto legal",
    oQue: "a despesa com pessoal ultrapassa o teto legal da Lei de Responsabilidade Fiscal",
    acao:
      "Acima do teto começa o prazo de recondução, e não cumpri-lo é infração administrativa com " +
      "multa pessoal. Monte o cronograma de redução antes de precisar dele.",
    prioridade: "urgente",
  },
];

/**
 * A próxima fronteira da despesa com pessoal que a prefeitura vai cruzar.
 *
 * Devolve UMA, a mais próxima — não três. Listar as três de uma vez
 * transformaria um aviso acionável em uma tabela de cenários, e o prefeito
 * precisa saber qual é a próxima porta, não o mapa do corredor.
 */
export function antecipacaoDoPessoal(
  serie: Array<{ valor: number | null; em: string }>,
  opcoes: { horizonteMeses?: number; idadeMaximaMeses?: number; agora?: Date } = {}
): Antecipacao | null {
  for (const f of FRONTEIRAS_PESSOAL) {
    const t = projetarTravessia(serie, f.limiar, "subindo", opcoes);
    if (!t) continue;
    return {
      chave: `pessoal_${Math.round(f.limiar * 10)}`,
      titulo: `Despesa com pessoal: ${f.nome} à frente`,
      oQue:
        `Hoje em ${fmtPct(t.valorAtual)} da Receita Corrente Líquida e subindo. No ritmo medido, ` +
        `${f.oQue} (${fmtPct(f.limiar)}).`,
      quando: `${emPalavras(t.mesesDeHoje)}, por volta de ${mesAnoDe(t.em)}`,
      base: comoFoiCalculado(t, "pontos"),
      acao: f.acao,
      fundamento: BASE_LEGAL_LIMITE,
      // A urgência é da FRONTEIRA, não do calendário: o teto legal é grave
      // mesmo a um ano de distância, porque a folha de um ano atrás é o que o
      // produz. Encurtar o prazo só eleva, nunca rebaixa.
      prioridade: t.mesesDeHoje <= 4 && f.prioridade === "info" ? "medio" : f.prioridade,
      destino: "/dashboard/pessoal",
      travessia: t,
    };
  }
  return null;
}

/**
 * Quando o saldo fica negativo, se a trajetória continuar.
 *
 * O detector de saldo negativo existe e dispara depois — com o saldo já
 * negativo, quando a folha do mês já está comprometida. Aqui a mesma série
 * responde antes.
 */
export function antecipacaoDoSaldo(
  serie: Array<{ valor: number | null; em: string }>,
  formatarReais: (v: number) => string,
  opcoes: { horizonteMeses?: number; idadeMaximaMeses?: number; agora?: Date } = {}
): Antecipacao | null {
  const t = projetarTravessia(serie, 0, "descendo", opcoes);
  if (!t) return null;

  return {
    chave: "saldo_zero",
    titulo: "O saldo caminha para o negativo",
    oQue:
      `Saldo de ${formatarReais(t.valorAtual)} e caindo ${formatarReais(Math.abs(t.ritmoPorMes))} ` +
      `por mês no ritmo medido. Nesse ritmo, fica negativo.`,
    quando: `${emPalavras(t.mesesDeHoje)}, por volta de ${mesAnoDe(t.em)}`,
    base: comoFoiCalculado(t, "reais"),
    acao:
      "Saldo negativo com restos a pagar inscritos é apontamento de contas. Enquanto há meses, a " +
      "saída é contingenciar despesa discricionária; depois, só sobra atrasar pagamento.",
    fundamento: null,
    prioridade: t.mesesDeHoje <= 3 ? "urgente" : "medio",
    destino: "/dashboard/historico",
    travessia: t,
  };
}

function fmtPct(v: number): string {
  return `${v.toFixed(2).replace(".", ",")}%`;
}

/**
 * O que vem primeiro, primeiro.
 *
 * A ordem é pelo TEMPO, não pela gravidade — ao contrário de tudo o mais no
 * produto. O motivo: estas são todas coisas que ainda não aconteceram, e entre
 * duas que não aconteceram a que manda é a que chega antes. Uma fronteira
 * grave a dezoito meses não disputa atenção com uma leve no mês que vem.
 */
export function ordenarAntecipacoes(lista: Antecipacao[]): Antecipacao[] {
  const peso = { urgente: 0, medio: 1, info: 2 };
  return [...lista].sort(
    (a, b) =>
      a.travessia.mesesDeHoje - b.travessia.mesesDeHoje ||
      peso[a.prioridade] - peso[b.prioridade]
  );
}
