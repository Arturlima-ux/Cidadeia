// ── ANÁLISE LOCAL (o insight por módulo, sem modelo nenhum) ──
//
// `lib/ia.ts` produz o insight de cada módulo chamando a API da Anthropic.
// Sem ANTHROPIC_API_KEY configurada aquilo simplesmente não existe — e esse
// é o estado de produção hoje. Este módulo entrega a MESMA saída ("o ponto
// mais importante agora" + "uma ação concreta"), calculada por regra.
//
// Isso não é um degrau menor. Numa prefeitura, uma afirmação sobre gasto ou
// sobre obra pode terminar num relatório para o Tribunal de Contas, e aqui a
// pergunta "por que o sistema disse isso?" tem resposta: o limiar está
// escrito abaixo, com nome e valor, e o mesmo dado sempre gera a mesma
// frase. Saída de LLM não tem essa resposta.
//
// Três obrigações, nesta ordem:
// 1. Nunca afirmar o que o dado não sustenta. Campo nulo é ausência de
//    informação, nunca zero.
// 2. Toda frase carrega o número que a originou ("estoque de medicamentos em
//    32%", nunca "estoque baixo") — é esse número que o gestor vai conferir
//    na fonte, e é ele que torna o achado contestável.
// 3. Quando nada sustenta uma conclusão, dizer isso. Insight genérico para
//    preencher tela é pior que tela vazia: ensina o gestor a ignorar a tela.
//
// A função é PURA de propósito: recebe os dados já carregados e devolve o
// resultado. Não toca no banco, não lê env var, não vai à rede — é o que
// permite testar cada regra sem subir nada (mesma escolha de
// lib/deteccao-automatica.ts).

import {
  detectarLicitacoesVencendo,
  detectarObrasParadas,
  detectarIndicadorDesatualizado,
  detectarSaldoNegativo,
  type DeteccaoAutomatica,
} from "@/lib/deteccao-automatica";
import { formatarMoeda } from "@/lib/formatadores";
import {
  calcularTendencia,
  descreverVariacao,
  descreverDesvio,
  type UnidadeTendencia,
} from "@/lib/tendencia";
import { FUSO_PADRAO } from "@/lib/horario";

export type ModuloAnalise = "geral" | "saude" | "educacao" | "obras" | "licitacoes";

/** Mesma escala dos alertas e das detecções automáticas — não inventar outra. */
export type Severidade = DeteccaoAutomatica["prioridade"];

/**
 * Por que o achado importa. É o segundo critério de ordenação (ver
 * `compararAchados`) e existe porque "urgente" sozinho não separa uma
 * licitação que vence amanhã de uma obra parada há dois meses.
 */
export type EixoAchado =
  | "prazo_legal"
  | "servico_essencial"
  | "execucao_financeira"
  | "qualidade_do_dado";

/**
 * De onde o achado saiu. "financeiro" não é um módulo de tela (a visão
 * financeira mora dentro do "geral"), mas é uma origem distinta — sem
 * separá-la, um achado de saldo apareceria rotulado como se fosse de outra
 * secretaria.
 */
export type OrigemAchado = Exclude<ModuloAnalise, "geral"> | "financeiro";

export type AchadoLocal = {
  /** Módulo de origem — no "geral" é o que diz de onde veio o achado. */
  modulo: OrigemAchado;
  eixo: EixoAchado;
  severidade: Severidade;
  /**
   * Identifica o OBJETO do mundo real (uma obra, uma licitação, um
   * indicador). Duas regras que disparam sobre a mesma obra viram um achado
   * só — senão a lista secundária vira três linhas sobre a mesma coisa.
   */
  chave: string;
  /** A afirmação, sempre com o número que a sustenta. */
  texto: string;
  /** O que fazer e com quem — nunca "melhorar a gestão". */
  acao: string;
  /**
   * Desempate de último recurso dentro do mesmo eixo/severidade: valor em
   * risco quando existe, distância do limiar quando não existe. É heurística,
   * não uma escala comparável entre eixos — por isso só entra depois de
   * severidade e eixo, que são os critérios que a tela promete.
   */
  peso: number;
};

export type AnaliseLocal = {
  modulo: ModuloAnalise;
  /**
   * "achado": alguma regra disparou.
   * "sem_achado": há dado, nenhuma regra disparou (conclusão legítima).
   * "sem_dados": não há dado que sustente conclusão nenhuma.
   */
  situacao: "achado" | "sem_achado" | "sem_dados";
  texto: string;
  /** Null quando não há ação honesta a sugerir — não preenchemos por preencher. */
  acao: string | null;
  principal: AchadoLocal | null;
  /** Os demais, já priorizados. Nunca vão para o destaque. */
  secundarios: AchadoLocal[];
};

// ── Entradas ──
// Tipos estruturais mínimos: só os campos que as regras leem. Assim uma linha
// vinda do Drizzle entra direto, e o teste monta o objeto na mão sem precisar
// preencher schema inteiro.

export type IndicadorSaude = {
  tempoMedioAtendimentoMin: number | null;
  medicosAtivos: number | null;
  faltasPercentual: number | null;
  estoqueMedicamentosPercentual: number | null;
  atualizadoEm: string;
};

export type UnidadeSaude = { nome: string; tipo: string; bairro: string | null };

export type IndicadorEducacao = {
  frequenciaPercentual: number | null;
  notaMedia: number | null;
  alunosTransporte: number | null;
  professoresAtivos: number | null;
  atualizadoEm: string;
};

export type Escola = { nome: string; bairro: string | null; evasaoPercentual: number | null };

export type Obra = {
  nome: string;
  bairro: string | null;
  progressoAtual: number;
  progressoEsperado: number;
  valorContrato: number | null;
  status: string;
  atualizadoEm: string;
};

export type Licitacao = {
  numero: string;
  objeto: string;
  modalidade: string | null;
  valorEstimado: number | null;
  fornecedor: string | null;
  status: string;
  observacaoRisco: string | null;
  prazoFinal: string | null;
};

export type SnapshotFinanceiro = {
  receita: number | null;
  despesas: number | null;
  saldo: number | null;
  indiceTransparencia: number | null;
  atualizadoEm: string;
};

/**
 * `serie` são as leituras anteriores do indicador, da mais recente para a
 * mais antiga, INCLUINDO a atual na primeira posição. Opcional: quem chama
 * com só a última leitura continua funcionando, sem a dimensão do tempo.
 */
export type DadosSaude = {
  indicador: IndicadorSaude | null;
  unidades: UnidadeSaude[];
  serie?: IndicadorSaude[];
};
export type DadosEducacao = {
  indicador: IndicadorEducacao | null;
  escolas: Escola[];
  serie?: IndicadorEducacao[];
};
export type DadosFinanceiro = { snapshot: SnapshotFinanceiro | null };

/**
 * Chave AUSENTE e lista VAZIA querem dizer coisas diferentes, e a diferença
 * aparece no texto: ausente é "não foi carregado / a prefeitura não contratou
 * este módulo"; vazia é "está aqui e não tem nada cadastrado". Colapsar as
 * duas faria a análise culpar o gestor por um dado que ninguém pediu.
 */
export type DadosAnalise = {
  saude?: DadosSaude;
  educacao?: DadosEducacao;
  obras?: Obra[];
  licitacoes?: Licitacao[];
  financeiro?: DadosFinanceiro;
  /** Fuso do município, para "desde junho" cair no mês certo. */
  fuso?: string;
};

// ── Limiares ──
// Ficam todos aqui, nomeados, porque é isto que a prefeitura vai querer ver
// quando perguntar "de onde saiu esse alerta?". Mexer num valor muda o que a
// tela afirma para todos os municípios de uma vez.

const ESTOQUE_MEDICAMENTOS_CRITICO = 20;
const ESTOQUE_MEDICAMENTOS_ATENCAO = 40;
const FALTAS_CRITICO = 30;
const FALTAS_ATENCAO = 15;
const ESPERA_CRITICA_MIN = 90;
const ESPERA_ATENCAO_MIN = 45;
const EVASAO_CRITICA = 15;
const EVASAO_ATENCAO = 8;
const FREQUENCIA_CRITICA = 75;
const FREQUENCIA_ATENCAO = 85;
const NOTA_CRITICA = 4;
const NOTA_ATENCAO = 6;
/** Acima disso a rede não está usando a escala 0–10 — ver `analisarEducacao`. */
const NOTA_ESCALA_MAX = 10;

// ── Movimento entre leituras ──
// A partir de quanto uma variação entre a leitura atual e a anterior vira
// achado por si só, mesmo com o nível ainda dentro do limite. Em pontos
// percentuais para os indicadores em %, na unidade do indicador nos demais.
const QUEDA_FREQUENCIA_PP = 5;
const QUEDA_NOTA = 1;
const SUBIDA_FALTAS_PP = 5;
const QUEDA_ESTOQUE_PP = 10;
const SUBIDA_ESPERA_MIN = 15;
/** 10 pontos é o mesmo corte que lib/ia.ts já usa para "obra atrasada". */
const DESVIO_OBRA_ATENCAO = 10;
const DESVIO_OBRA_CRITICO = 20;
const TRANSPARENCIA_CRITICA = 40;
const TRANSPARENCIA_ATENCAO = 60;
/** Espelha o corte de indicador desatualizado de deteccao-automatica.ts. */
const DIAS_FINANCEIRO_DESATUALIZADO = 30;

const NOME_MODULO: Record<ModuloAnalise, string> = {
  geral: "Gestão geral",
  saude: "Saúde",
  educacao: "Educação",
  obras: "Obras",
  licitacoes: "Licitações",
};

// ── Formatação e datas ──

function diasDesde(dataIso: string): number {
  return Math.floor((Date.now() - new Date(dataIso).getTime()) / (1000 * 60 * 60 * 24));
}

function diasAte(dataIso: string): number {
  return Math.floor((new Date(dataIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Data em texto legível. Se o banco devolver algo que o JS não parseia,
 * devolvemos a string crua em vez de "Invalid Date": mostrar o valor de
 * origem deixa o erro rastreável; mostrar lixo formatado esconde.
 */
function formatarData(dataIso: string): string {
  const d = new Date(dataIso);
  if (Number.isNaN(d.getTime())) return dataIso;
  return d.toLocaleDateString("pt-BR");
}

function num(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function pct(valor: number): string {
  return `${num(valor)}%`;
}

// ── A DIMENSÃO DO TEMPO NOS ACHADOS ──
//
// Duas coisas, na ordem:
//
// 1. Se já existe achado de nível para este indicador ("frequência em 71%,
//    abaixo de 75%"), acrescenta de onde veio: "— caiu 7 pontos desde junho
//    (era 78%)". O número passa a ter história.
//
// 2. Se NÃO existe achado de nível — o número está dentro do limite — mas o
//    movimento desde a leitura anterior é grande, ou o desvio do padrão das
//    leituras anteriores é grande, cria um achado de movimento. É o caso que
//    o limiar fixo nunca pegava: 81% de frequência está "bem", mas 81% depois
//    de 88% é o começo de um problema.
//
// Nunca extrapola: descreve o que foi medido, entre datas.
function aplicarTendencia(opcoes: {
  achados: AchadoLocal[];
  modulo: AchadoLocal["modulo"];
  chave: string;
  nome: string;
  serie: Array<{ valor: number | null; em: string }>;
  unidade: UnidadeTendencia;
  /** "queda" quando cair é ruim (frequência, estoque); "subida" quando subir é ruim (faltas, espera). */
  ruim: "queda" | "subida";
  movimentoRelevante: number;
  acaoMovimento: string;
  fuso: string;
}): void {
  const { achados, serie, unidade, ruim, movimentoRelevante, fuso } = opcoes;
  const t = calcularTendencia(serie);
  if (!t) return;

  const existente = achados.find((a) => a.chave === opcoes.chave);
  if (existente) {
    if (Math.abs(t.variacao) >= 0.5) {
      existente.texto = `${existente.texto.replace(/.$/, "")} — ${descreverVariacao(t, unidade, fuso)}.`;
    }
    return;
  }

  const naDirecaoRuim = ruim === "queda" ? t.variacao <= -movimentoRelevante : t.variacao >= movimentoRelevante;
  const desvio = descreverDesvio(t, unidade, movimentoRelevante);
  const desvioRuim =
    t.desvioDaMedia !== null &&
    (ruim === "queda" ? t.desvioDaMedia <= -movimentoRelevante : t.desvioDaMedia >= movimentoRelevante);

  if (!naDirecaoRuim && !desvioRuim) return;

  const partes = [`${opcoes.nome} ${descreverVariacao(t, unidade, fuso)}`];
  if (desvioRuim && desvio) partes.push(`${desvio}`);
  const texto = `${partes.join(", e está ")} — ainda dentro do limite, mas o movimento é o que importa aqui.`;

  achados.push({
    modulo: opcoes.modulo,
    eixo: "servico_essencial",
    severidade: "medio",
    chave: `${opcoes.chave}-movimento`,
    texto,
    acao: opcoes.acaoMovimento,
    peso: Math.abs(naDirecaoRuim ? t.variacao : (t.desvioDaMedia ?? 0)),
  });
}

// ── Priorização ──
//
// CRITÉRIO DE SEVERIDADE, em três níveis, nesta ordem:
//
// 1. SEVERIDADE (urgente > medio > info) — o quão perto do dano o item está.
//    Vem primeiro porque um estoque de medicamentos em 5% precisa ganhar de
//    um prazo administrativo que ainda tem uma semana.
// 2. EIXO, como desempate entre itens igualmente urgentes, do mais
//    irreversível para o menos:
//      prazo_legal        — passou a data, não há correção possível: o
//                           processo tem de ser refeito. É o único eixo em
//                           que esperar destrói a opção de agir.
//      servico_essencial  — atinge o atendimento ao cidadão hoje (remédio,
//                           médico, fila, aluno fora da escola).
//      execucao_financeira— dinheiro público parado ou estourado; grave, mas
//                           quase sempre ainda recuperável amanhã.
//      qualidade_do_dado  — o sistema não sabe o que está acontecendo. Vem
//                           por último de propósito: é o único eixo em que
//                           não se afirma nada sobre a cidade, só sobre o
//                           registro. Promovê-lo faria o painel gritar sobre
//                           formulário em branco enquanto uma obra afunda.
// 3. PESO — desempate final por magnitude (R$ em risco, distância do limiar).
//    Empate completo mantém a ordem de entrada, para a saída ser estável.
//
// Consequência prática que o produto promete: obra parada há 60 dias
// (urgente/execucao_financeira) perde para licitação vencendo amanhã
// (urgente/prazo_legal).

const ORDEM_SEVERIDADE: Record<Severidade, number> = { urgente: 0, medio: 1, info: 2 };

const ORDEM_EIXO: Record<EixoAchado, number> = {
  prazo_legal: 0,
  servico_essencial: 1,
  execucao_financeira: 2,
  qualidade_do_dado: 3,
};

export function compararAchados(a: AchadoLocal, b: AchadoLocal): number {
  return (
    ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade] ||
    ORDEM_EIXO[a.eixo] - ORDEM_EIXO[b.eixo] ||
    b.peso - a.peso
  );
}

/** Um objeto do mundo real só aparece uma vez, com seu achado mais grave. */
function manterUmPorChave(achados: AchadoLocal[]): AchadoLocal[] {
  const vistos = new Set<string>();
  return achados.filter((a) => {
    if (vistos.has(a.chave)) return false;
    vistos.add(a.chave);
    return true;
  });
}

// ── Saúde ──

function analisarSaude(dados: DadosSaude, fuso = FUSO_PADRAO): AchadoLocal[] {
  const achados: AchadoLocal[] = [];
  const ind = dados.indicador;

  if (ind) {
    const estoque = ind.estoqueMedicamentosPercentual;
    if (estoque !== null && estoque <= ESTOQUE_MEDICAMENTOS_ATENCAO) {
      const critico = estoque <= ESTOQUE_MEDICAMENTOS_CRITICO;
      achados.push({
        modulo: "saude",
        eixo: "servico_essencial",
        severidade: critico ? "urgente" : "medio",
        chave: "saude:estoque",
        texto: `Estoque de medicamentos em ${pct(estoque)}, abaixo do limite de ${pct(
          critico ? ESTOQUE_MEDICAMENTOS_CRITICO : ESTOQUE_MEDICAMENTOS_ATENCAO
        )}.`,
        acao: `Cobre da Secretaria de Saúde, esta semana, a lista dos itens zerados e a ordem de reposição.`,
        peso: ESTOQUE_MEDICAMENTOS_ATENCAO - estoque,
      });
    }

    const faltas = ind.faltasPercentual;
    if (faltas !== null && faltas >= FALTAS_ATENCAO) {
      const critico = faltas >= FALTAS_CRITICO;
      achados.push({
        modulo: "saude",
        eixo: "servico_essencial",
        severidade: critico ? "urgente" : "medio",
        chave: "saude:faltas",
        texto: `Faltas em ${pct(faltas)}, acima do limite de ${pct(
          critico ? FALTAS_CRITICO : FALTAS_ATENCAO
        )} — cada falta é uma vaga de agenda perdida.`,
        acao: `Peça à Secretaria de Saúde o relatório de faltas por unidade para saber onde os ${pct(
          faltas
        )} estão concentrados.`,
        peso: faltas - FALTAS_ATENCAO,
      });
    }

    const espera = ind.tempoMedioAtendimentoMin;
    if (espera !== null && espera >= ESPERA_ATENCAO_MIN) {
      const critico = espera >= ESPERA_CRITICA_MIN;
      achados.push({
        modulo: "saude",
        eixo: "servico_essencial",
        severidade: critico ? "urgente" : "medio",
        chave: "saude:espera",
        texto: `Tempo médio de atendimento em ${num(espera)} min, acima do limite de ${num(
          critico ? ESPERA_CRITICA_MIN : ESPERA_ATENCAO_MIN
        )} min.`,
        acao: `Peça à Secretaria de Saúde a escala das unidades com maior fila; ${num(
          espera
        )} min de média é o número a derrubar.`,
        peso: espera - ESPERA_ATENCAO_MIN,
      });
    }

    // Zero médicos é uma das duas coisas: rede sem médico ou campo preenchido
    // errado. Não dá para saber qual pelo dado, então isto entra como problema
    // de registro e não como afirmação de que a cidade está sem atendimento —
    // essa acusação, se falsa, queima o produto dentro da prefeitura.
    if (ind.medicosAtivos === 0) {
      achados.push({
        modulo: "saude",
        eixo: "qualidade_do_dado",
        severidade: "medio",
        chave: "saude:medicos",
        texto: `O indicador registra 0 médicos ativos — ou a rede está sem médico, ou o campo foi preenchido errado.`,
        acao: `Confirme com a Secretaria de Saúde qual dos dois é o caso antes de qualquer leitura desta tela.`,
        peso: 0,
      });
    }

    if (dados.unidades.length === 0) {
      achados.push({
        modulo: "saude",
        eixo: "qualidade_do_dado",
        severidade: "info",
        chave: "saude:unidades",
        texto: `Há indicadores de Saúde registrados, mas 0 unidades de saúde cadastradas.`,
        acao: `Cadastre UBS, postos e hospitais no painel da Saúde — sem eles não dá para localizar em que bairro o problema está.`,
        peso: 0,
      });
    }

    // Quem decide se o indicador está velho é o detector já existente; aqui só
    // traduzimos o veredito dele para o formato de achado, com a data.
    for (const _ of detectarIndicadorDesatualizado("saude", ind)) {
      const dias = diasDesde(ind.atualizadoEm);
      achados.push({
        modulo: "saude",
        eixo: "qualidade_do_dado",
        severidade: "info",
        chave: "saude:atualizacao",
        texto: `Indicadores de Saúde parados desde ${formatarData(ind.atualizadoEm)} — ${dias} dias sem registro novo.`,
        acao: `Atualize os indicadores de Saúde no painel da secretaria; hoje a tela mostra o retrato de ${dias} dias atrás.`,
        peso: dias,
      });
    }
  }


  // ── De onde veio o número ──
  const serieSaude = dados.serie ?? [];
  aplicarTendencia({
    achados,
    modulo: "saude",
    chave: "saude:faltas",
    nome: "Faltas",
    serie: serieSaude.map((i) => ({ valor: i.faltasPercentual, em: i.atualizadoEm })),
    unidade: "pp",
    ruim: "subida",
    movimentoRelevante: SUBIDA_FALTAS_PP,
    acaoMovimento:
      "Peça à Secretaria de Saúde o relatório de faltas por unidade das duas últimas leituras — subida assim costuma ter uma unidade ou uma especialidade por trás.",
    fuso,
  });
  aplicarTendencia({
    achados,
    modulo: "saude",
    chave: "saude:estoque",
    nome: "Estoque de medicamentos",
    serie: serieSaude.map((i) => ({ valor: i.estoqueMedicamentosPercentual, em: i.atualizadoEm })),
    unidade: "pp",
    ruim: "queda",
    movimentoRelevante: QUEDA_ESTOQUE_PP,
    acaoMovimento:
      "Peça à Secretaria de Saúde a posição de estoque por item — uma queda de dez pontos em uma leitura é entrega atrasada ou consumo fora do padrão.",
    fuso,
  });
  aplicarTendencia({
    achados,
    modulo: "saude",
    chave: "saude:espera",
    nome: "Tempo médio de atendimento",
    serie: serieSaude.map((i) => ({ valor: i.tempoMedioAtendimentoMin, em: i.atualizadoEm })),
    unidade: { sufixo: "min", casas: 0 },
    ruim: "subida",
    movimentoRelevante: SUBIDA_ESPERA_MIN,
    acaoMovimento:
      "Peça à Secretaria de Saúde a escala médica das duas últimas leituras — espera que sobe de repente costuma ser vaga aberta ou agenda fechada.",
    fuso,
  });
  return achados;
}

// ── Educação ──

function analisarEducacao(dados: DadosEducacao, fuso = FUSO_PADRAO): AchadoLocal[] {
  const achados: AchadoLocal[] = [];
  const ind = dados.indicador;

  // Só a pior escola vira achado: listar todas transformaria o destaque numa
  // planilha, e a decisão do gestor começa por uma escola, não por dez.
  const comEvasao = dados.escolas.filter((e) => e.evasaoPercentual !== null);
  const pior = comEvasao.reduce<Escola | null>(
    (acc, e) => (acc === null || e.evasaoPercentual! > acc.evasaoPercentual! ? e : acc),
    null
  );
  if (pior && pior.evasaoPercentual! >= EVASAO_ATENCAO) {
    const evasao = pior.evasaoPercentual!;
    const critico = evasao >= EVASAO_CRITICA;
    const ondeFica = pior.bairro ? ` (${pior.bairro})` : "";
    const comparacao = comEvasao.length > 1 ? `, a maior entre as ${comEvasao.length} escolas com evasão informada` : "";
    achados.push({
      modulo: "educacao",
      eixo: "servico_essencial",
      severidade: critico ? "urgente" : "medio",
      chave: `escola:${pior.nome}`,
      texto: `Evasão de ${pct(evasao)} na escola ${pior.nome}${ondeFica}${comparacao}.`,
      acao: `Peça à direção da ${pior.nome} a lista nominal dos alunos que pararam de frequentar e leve à Secretaria de Educação.`,
      peso: evasao,
    });
  }

  if (ind) {
    const freq = ind.frequenciaPercentual;
    if (freq !== null && freq <= FREQUENCIA_ATENCAO) {
      const critico = freq <= FREQUENCIA_CRITICA;
      achados.push({
        modulo: "educacao",
        eixo: "servico_essencial",
        severidade: critico ? "urgente" : "medio",
        chave: "educacao:frequencia",
        texto: `Frequência média em ${pct(freq)}, abaixo do limite de ${pct(
          critico ? FREQUENCIA_CRITICA : FREQUENCIA_ATENCAO
        )}.`,
        acao: `Peça à Secretaria de Educação a frequência aberta por escola — a média de ${pct(
          freq
        )} esconde onde a queda está.`,
        peso: FREQUENCIA_ATENCAO - freq,
      });
    }

    // O schema não declara a escala da nota. Só julgamos quando o valor cabe
    // em 0–10 (IDEB e a maioria das redes municipais); acima disso a rede
    // provavelmente lança de 0 a 100, e aplicar o limiar na escala errada
    // seria publicar uma acusação falsa sobre a educação do município.
    const nota = ind.notaMedia;
    if (nota !== null && nota <= NOTA_ESCALA_MAX && nota <= NOTA_ATENCAO) {
      const critico = nota <= NOTA_CRITICA;
      achados.push({
        modulo: "educacao",
        eixo: "servico_essencial",
        severidade: critico ? "urgente" : "medio",
        chave: "educacao:nota",
        texto: `Nota média em ${num(nota)}, abaixo do limite de ${num(
          critico ? NOTA_CRITICA : NOTA_ATENCAO
        )} na escala de 0 a 10.`,
        acao: `Peça à Secretaria de Educação o resultado aberto por escola e defina reforço onde a nota puxa a média para baixo.`,
        peso: NOTA_ATENCAO - nota,
      });
    }

    if (dados.escolas.length === 0) {
      achados.push({
        modulo: "educacao",
        eixo: "qualidade_do_dado",
        severidade: "info",
        chave: "educacao:escolas",
        texto: `Há indicadores de Educação registrados, mas 0 escolas cadastradas.`,
        acao: `Cadastre as escolas no painel da Educação — sem elas a evasão não tem endereço.`,
        peso: 0,
      });
    }

    for (const _ of detectarIndicadorDesatualizado("educacao", ind)) {
      const dias = diasDesde(ind.atualizadoEm);
      achados.push({
        modulo: "educacao",
        eixo: "qualidade_do_dado",
        severidade: "info",
        chave: "educacao:atualizacao",
        texto: `Indicadores de Educação parados desde ${formatarData(ind.atualizadoEm)} — ${dias} dias sem registro novo.`,
        acao: `Atualize os indicadores de Educação no painel da secretaria; hoje a tela mostra o retrato de ${dias} dias atrás.`,
        peso: dias,
      });
    }
  }


  // ── De onde veio o número ──
  const serieEdu = dados.serie ?? [];
  aplicarTendencia({
    achados,
    modulo: "educacao",
    chave: "educacao:frequencia",
    nome: "Frequência média",
    serie: serieEdu.map((i) => ({ valor: i.frequenciaPercentual, em: i.atualizadoEm })),
    unidade: "pp",
    ruim: "queda",
    movimentoRelevante: QUEDA_FREQUENCIA_PP,
    acaoMovimento:
      "Peça à Secretaria de Educação a frequência aberta por escola das duas últimas leituras — queda assim costuma se concentrar em poucas unidades, e é lá que se age.",
    fuso,
  });
  aplicarTendencia({
    achados,
    modulo: "educacao",
    chave: "educacao:nota",
    nome: "Nota média",
    serie: serieEdu
      // Mesma cautela da regra de nível: fora da escala 0–10 não se julga.
      .map((i) => ({ valor: i.notaMedia !== null && i.notaMedia <= NOTA_ESCALA_MAX ? i.notaMedia : null, em: i.atualizadoEm })),
    unidade: { sufixo: "", casas: 1 },
    ruim: "queda",
    movimentoRelevante: QUEDA_NOTA,
    acaoMovimento:
      "Peça à Secretaria de Educação a nota aberta por escola e por série — uma queda de ponto inteiro raramente é geral.",
    fuso,
  });
  return achados;
}

// ── Obras ──

function analisarObras(obras: Obra[]): AchadoLocal[] {
  const achados: AchadoLocal[] = [];

  for (const obra of obras) {
    const chave = `obra:${obra.nome}`;
    const valor = obra.valorContrato;
    // Peso é "dinheiro parado": entre duas obras igualmente travadas, a de
    // contrato maior é a que o gestor precisa ver primeiro.
    const peso = valor ?? 0;
    const dinheiro = valor !== null ? `, contrato de ${formatarMoeda(valor)}` : "";

    if (obra.status === "paralisada") {
      achados.push({
        modulo: "obras",
        eixo: "execucao_financeira",
        severidade: "urgente",
        chave,
        texto: `Obra "${obra.nome}" com status "paralisada" em ${num(obra.progressoAtual)}% de execução${dinheiro}.`,
        acao: `Cobre da Secretaria de Obras o motivo formal da paralisação de "${obra.nome}" e uma data de retomada.`,
        peso,
      });
    }

    // A regra de "parada há N dias" já existe e é reutilizada item a item —
    // uma obra por chamada — porque o detector devolve texto, não o registro
    // de origem, e aqui precisamos saber de qual obra veio para citar o
    // contrato. Reescrever o limiar aqui criaria duas verdades sobre a mesma
    // pergunta.
    for (const d of detectarObrasParadas([obra])) {
      const dias = diasDesde(obra.atualizadoEm);
      achados.push({
        modulo: "obras",
        eixo: "execucao_financeira",
        severidade: d.prioridade,
        chave,
        texto: `Obra "${obra.nome}" sem registro de progresso há ${dias} dias, parada em ${num(
          obra.progressoAtual
        )}%${dinheiro}.`,
        acao: `Peça à fiscalização de "${obra.nome}" um boletim de medição atualizado; sem registro há ${dias} dias não dá para afirmar se a obra anda.`,
        peso,
      });
    }

    const desvio = obra.progressoEsperado - obra.progressoAtual;
    if (obra.status !== "concluida" && desvio > DESVIO_OBRA_ATENCAO) {
      achados.push({
        modulo: "obras",
        eixo: "execucao_financeira",
        severidade: desvio >= DESVIO_OBRA_CRITICO ? "urgente" : "medio",
        chave,
        texto: `Obra "${obra.nome}" em ${num(obra.progressoAtual)}% quando o cronograma previa ${num(
          obra.progressoEsperado
        )}% — ${num(desvio)} pontos de atraso${dinheiro}.`,
        acao: `Cobre da Secretaria de Obras um cronograma repactuado para "${obra.nome}" antes que o atraso vire aditivo de prazo.`,
        peso,
      });
    }
  }

  return achados;
}

// ── Licitações ──

function analisarLicitacoes(licitacoes: Licitacao[]): AchadoLocal[] {
  const achados: AchadoLocal[] = [];

  for (const lic of licitacoes) {
    const chave = `licitacao:${lic.numero}`;
    const peso = lic.valorEstimado ?? 0;
    const dinheiro = lic.valorEstimado !== null ? `, valor estimado ${formatarMoeda(lic.valorEstimado)}` : "";

    // Mesmo motivo das obras: o detector decide o que é prazo crítico, e a
    // chamada item a item é o que permite ligar o veredito ao registro.
    for (const d of detectarLicitacoesVencendo([lic])) {
      const dias = diasAte(lic.prazoFinal!);
      const vencido = dias < 0;
      achados.push({
        modulo: "licitacoes",
        eixo: "prazo_legal",
        severidade: d.prioridade,
        chave,
        texto: vencido
          ? `Licitação ${lic.numero} (${lic.objeto}) com prazo vencido há ${Math.abs(
              dias
            )} dia(s), em ${formatarData(lic.prazoFinal!)}, e status ainda "${lic.status}"${dinheiro}.`
          : `Licitação ${lic.numero} (${lic.objeto}) vence em ${dias} dia(s), em ${formatarData(
              lic.prazoFinal!
            )}, com status "${lic.status}"${dinheiro}.`,
        acao: vencido
          ? `Leve à comissão de licitação hoje: ou o processo ${lic.numero} é retomado com novo prazo publicado, ou precisa ser formalmente encerrado.`
          : `Confirme com a comissão de licitação, antes de ${formatarData(
              lic.prazoFinal!
            )}, se a etapa seguinte do processo ${lic.numero} já está agendada.`,
        peso,
      });
    }

    // Risco anotado por um servidor é dado real, não opinião do sistema — por
    // isso é citado entre aspas, sem reinterpretação. Processo homologado ou
    // cancelado fica fora: não há mais etapa em que agir.
    if (lic.observacaoRisco && lic.status !== "homologada" && lic.status !== "cancelada") {
      achados.push({
        modulo: "licitacoes",
        eixo: "execucao_financeira",
        severidade: "medio",
        chave,
        texto: `Licitação ${lic.numero} (${lic.objeto}) está marcada com risco: "${lic.observacaoRisco}"${dinheiro}.`,
        acao: `Peça à assessoria jurídica um parecer sobre o risco anotado no processo ${lic.numero} antes da próxima etapa.`,
        peso,
      });
    }
  }

  return achados;
}

// ── Financeiro ──

function analisarFinanceiro(dados: DadosFinanceiro): AchadoLocal[] {
  const achados: AchadoLocal[] = [];
  const snap = dados.snapshot;
  if (!snap) return achados;

  const quando = formatarData(snap.atualizadoEm);

  for (const _ of detectarSaldoNegativo(snap)) {
    const saldo = snap.saldo!;
    const comparacao =
      snap.receita !== null && snap.despesas !== null
        ? ` — receita de ${formatarMoeda(snap.receita)} contra despesas de ${formatarMoeda(snap.despesas)}`
        : "";
    achados.push({
      modulo: "financeiro",
      eixo: "execucao_financeira",
      severidade: "urgente",
      chave: "financeiro:saldo",
      texto: `Último registro financeiro (${quando}) fechou com saldo negativo de ${formatarMoeda(
        Math.abs(saldo)
      )}${comparacao}.`,
      acao: `Leve o fechamento de ${quando} à Secretaria de Finanças e identifique qual rubrica puxou a despesa antes do próximo empenho.`,
      peso: Math.abs(saldo),
    });
  }

  // Caso que o detector de saldo negativo não cobre de propósito (ele exige
  // saldo preenchido): saldo em branco, mas receita e despesa lançadas. A
  // conta aqui é aritmética sobre dado real, não estimativa.
  if (snap.saldo === null && snap.receita !== null && snap.despesas !== null && snap.despesas > snap.receita) {
    const diferenca = snap.despesas - snap.receita;
    achados.push({
      modulo: "financeiro",
      eixo: "execucao_financeira",
      severidade: "medio",
      chave: "financeiro:saldo",
      texto: `O saldo não está preenchido no registro de ${quando}, mas as despesas (${formatarMoeda(
        snap.despesas
      )}) superam a receita (${formatarMoeda(snap.receita)}) em ${formatarMoeda(diferenca)}.`,
      acao: `Feche o saldo do período no painel financeiro — enquanto estiver vazio, ele aparece como "não informado" em todo relatório exportado.`,
      peso: diferenca,
    });
  }

  const transp = snap.indiceTransparencia;
  if (transp !== null && transp < TRANSPARENCIA_ATENCAO) {
    // Fica em "medio" mesmo quando muito baixo: é exposição legal crônica
    // (LAI), não emergência do dia. Marcar como urgente faria isso passar na
    // frente de um prazo que vence amanhã, todo santo dia, até virar ruído.
    const critico = transp < TRANSPARENCIA_CRITICA;
    achados.push({
      modulo: "financeiro",
      eixo: "qualidade_do_dado",
      severidade: critico ? "medio" : "info",
      chave: "financeiro:transparencia",
      texto: `Índice de transparência em ${pct(transp)}, abaixo do limite de ${pct(
        critico ? TRANSPARENCIA_CRITICA : TRANSPARENCIA_ATENCAO
      )}.`,
      acao: `Peça ao setor responsável pelo portal a lista dos itens obrigatórios da LAI ainda não publicados.`,
      peso: TRANSPARENCIA_ATENCAO - transp,
    });
  }

  const dias = diasDesde(snap.atualizadoEm);
  if (dias >= DIAS_FINANCEIRO_DESATUALIZADO) {
    achados.push({
      modulo: "financeiro",
      eixo: "qualidade_do_dado",
      severidade: "info",
      chave: "financeiro:atualizacao",
      texto: `Indicadores financeiros parados desde ${quando} — ${dias} dias sem registro novo.`,
      acao: `Atualize receita, despesas e saldo no painel financeiro; a leitura atual é de ${dias} dias atrás.`,
      peso: dias,
    });
  }

  return achados;
}

// ── O que existe de dado ──

function pontosSaude(dados: DadosSaude): string[] {
  const p: string[] = [];
  const ind = dados.indicador;
  if (ind) {
    if (ind.tempoMedioAtendimentoMin !== null) p.push(`tempo médio de atendimento em ${num(ind.tempoMedioAtendimentoMin)} min`);
    if (ind.medicosAtivos !== null) p.push(`${ind.medicosAtivos} médicos ativos`);
    if (ind.faltasPercentual !== null) p.push(`faltas em ${pct(ind.faltasPercentual)}`);
    if (ind.estoqueMedicamentosPercentual !== null) p.push(`estoque de medicamentos em ${pct(ind.estoqueMedicamentosPercentual)}`);
  }
  if (dados.unidades.length > 0) p.push(`${dados.unidades.length} unidade(s) cadastrada(s)`);
  return p;
}

function pontosEducacao(dados: DadosEducacao): string[] {
  const p: string[] = [];
  const ind = dados.indicador;
  if (ind) {
    if (ind.frequenciaPercentual !== null) p.push(`frequência em ${pct(ind.frequenciaPercentual)}`);
    if (ind.notaMedia !== null) p.push(`nota média em ${num(ind.notaMedia)}`);
    if (ind.alunosTransporte !== null) p.push(`${ind.alunosTransporte} aluno(s) no transporte escolar`);
    if (ind.professoresAtivos !== null) p.push(`${ind.professoresAtivos} professor(es) ativo(s)`);
  }
  if (dados.escolas.length > 0) p.push(`${dados.escolas.length} escola(s) cadastrada(s)`);
  return p;
}

function pontosFinanceiro(dados: DadosFinanceiro): string[] {
  const p: string[] = [];
  const s = dados.snapshot;
  if (!s) return p;
  if (s.receita !== null) p.push(`receita de ${formatarMoeda(s.receita)}`);
  if (s.despesas !== null) p.push(`despesas de ${formatarMoeda(s.despesas)}`);
  if (s.saldo !== null) p.push(`saldo de ${formatarMoeda(s.saldo)}`);
  if (s.indiceTransparencia !== null) p.push(`índice de transparência em ${pct(s.indiceTransparencia)}`);
  return p;
}

/**
 * Os dados que a análise de fato olhou, em texto. Serve para duas coisas:
 * decidir se existe base para concluir alguma coisa (lista vazia = não
 * existe) e mostrar ao gestor o que foi conferido quando nada disparou —
 * "não achei nada" só tem valor se vier com o que foi olhado.
 */
export function pontosDeDado(modulo: ModuloAnalise, dados: DadosAnalise): string[] {
  const p: string[] = [];
  const inclui = (m: Exclude<ModuloAnalise, "geral">) => modulo === "geral" || modulo === m;

  if (inclui("saude") && dados.saude) p.push(...pontosSaude(dados.saude));
  if (inclui("educacao") && dados.educacao) p.push(...pontosEducacao(dados.educacao));
  if (inclui("obras") && dados.obras && dados.obras.length > 0) p.push(`${dados.obras.length} obra(s) cadastrada(s)`);
  if (inclui("licitacoes") && dados.licitacoes && dados.licitacoes.length > 0)
    p.push(`${dados.licitacoes.length} licitação(ões) cadastrada(s)`);
  if (modulo === "geral" && dados.financeiro) p.push(...pontosFinanceiro(dados.financeiro));

  return p;
}

function moduloFoiCarregado(modulo: ModuloAnalise, dados: DadosAnalise): boolean {
  switch (modulo) {
    case "saude":
      return dados.saude !== undefined;
    case "educacao":
      return dados.educacao !== undefined;
    case "obras":
      return dados.obras !== undefined;
    case "licitacoes":
      return dados.licitacoes !== undefined;
    case "geral":
      return (
        dados.financeiro !== undefined ||
        dados.saude !== undefined ||
        dados.educacao !== undefined ||
        dados.obras !== undefined ||
        dados.licitacoes !== undefined
      );
  }
}

// ── API pública ──

/**
 * Todos os achados do módulo, já priorizados e sem repetir o mesmo objeto.
 * "geral" cruza os módulos entregues — é a visão do prefeito, e o que mais
 * importa na cidade não respeita fronteira de secretaria.
 */
export function listarAchados(modulo: ModuloAnalise, dados: DadosAnalise): AchadoLocal[] {
  const brutos: AchadoLocal[] = [];
  const inclui = (m: Exclude<ModuloAnalise, "geral">) => modulo === "geral" || modulo === m;

  if (inclui("saude") && dados.saude) brutos.push(...analisarSaude(dados.saude, dados.fuso));
  if (inclui("educacao") && dados.educacao) brutos.push(...analisarEducacao(dados.educacao, dados.fuso));
  if (inclui("obras") && dados.obras) brutos.push(...analisarObras(dados.obras));
  if (inclui("licitacoes") && dados.licitacoes) brutos.push(...analisarLicitacoes(dados.licitacoes));
  if (modulo === "geral" && dados.financeiro) brutos.push(...analisarFinanceiro(dados.financeiro));

  return manterUmPorChave([...brutos].sort(compararAchados));
}

/**
 * O equivalente local de `gerarInsightModulo`: o ponto mais importante agora
 * e uma ação concreta — ou a admissão explícita de que os dados não
 * sustentam nenhuma conclusão.
 */
export function analisarModulo(modulo: ModuloAnalise, dados: DadosAnalise): AnaliseLocal {
  const nome = NOME_MODULO[modulo];
  const pontos = pontosDeDado(modulo, dados);

  if (pontos.length === 0) {
    const carregado = moduloFoiCarregado(modulo, dados);
    return {
      modulo,
      situacao: "sem_dados",
      texto: carregado
        ? `Não há dado suficiente para concluir nada sobre ${nome}: nenhum número foi registrado ainda.`
        : `Nenhum dado de ${nome} foi carregado nesta análise.`,
      // Sem dado carregado não sabemos sequer se o módulo é desta prefeitura;
      // sugerir cadastro seria mandar tarefa para quem talvez nem tenha a tela.
      acao: carregado
        ? `Registre os indicadores de ${nome} no painel da secretaria — sem eles esta análise não tem o que ler.`
        : null,
      principal: null,
      secundarios: [],
    };
  }

  const achados = listarAchados(modulo, dados);
  if (achados.length === 0) {
    return {
      modulo,
      situacao: "sem_achado",
      // Diz o que foi conferido: "está tudo bem" sem a lista não é verificável.
      texto: `Nenhuma regra de acompanhamento disparou em ${nome}. Dados considerados: ${pontos
        .slice(0, 4)
        .join("; ")}.`,
      acao: null,
      principal: null,
      secundarios: [],
    };
  }

  const [principal, ...secundarios] = achados;
  return {
    modulo,
    situacao: "achado",
    texto: principal.texto,
    acao: principal.acao,
    principal,
    secundarios,
  };
}

/** A análise em uma string só, no formato que a tela do insight já espera. */
export function textoAnalise(analise: AnaliseLocal): string {
  return analise.acao ? `${analise.texto} Ação sugerida: ${analise.acao}` : analise.texto;
}
