// ── CALENDÁRIO DE OBRIGAÇÕES FISCAIS DO MUNICÍPIO ──
//
// Relatório bimestral ao Tesouro, relatório quadrimestral de gestão fiscal,
// declaração bimestral de saúde e de educação. São dezesseis entregas por ano
// numa prefeitura pequena, e o TCE aponta a falta de envio como falha de
// transparência — no caso do SIOPS e do SIOPE, o atraso ainda gera pendência
// no CAUC e trava convênio e transferência voluntária da União.
//
// Ninguém perde esses prazos por decisão. Perde porque são dezesseis datas
// espalhadas pelo ano e a secretaria tem três pessoas.
//
// ── O QUE TORNA ISTO DIFERENTE DE UMA AGENDA ──
//
// Para RREO e RGF dá para CONFERIR sozinho: os dois são publicados na API
// aberta do Tesouro, e se o período esperado não volta de lá, é porque não foi
// enviado. O alerta se apaga sozinho quando a entrega acontece, sem ninguém
// marcar nada. SIOPS e SIOPE não têm consulta pública equivalente, então
// aparecem como lembrete de data — e a tela precisa dizer qual é qual.

export type Periodicidade = "bimestral" | "quadrimestral" | "semestral";

export type Obrigacao = {
  chave: string;
  nome: string;
  sigla: string;
  /** Onde a entrega acontece. */
  sistema: string;
  lei: string;
  artigo: string;
  /** O que acontece quando atrasa. É o que faz o gestor abrir a tela. */
  consequencia: string;
  /** true quando conseguimos verificar a entrega sozinhos, sem perguntar. */
  verificavel: boolean;
};

/** Dias após o encerramento do período para publicar. A LRF usa 30 em todos. */
const PRAZO_DIAS = 30;

export const OBRIGACOES: Obrigacao[] = [
  {
    chave: "rreo",
    nome: "Relatório Resumido da Execução Orçamentária",
    sigla: "RREO",
    sistema: "SICONFI · Tesouro Nacional",
    lei: "Lei Complementar 101/2000 (LRF)",
    artigo: "arts. 52 e 53",
    consequencia:
      "Falha de transparência apontada pelo Tribunal de Contas e impedimento de receber transferências voluntárias.",
    verificavel: true,
  },
  {
    chave: "rgf",
    nome: "Relatório de Gestão Fiscal",
    sigla: "RGF",
    sistema: "SICONFI · Tesouro Nacional",
    lei: "Lei Complementar 101/2000 (LRF)",
    artigo: "arts. 54 e 55",
    consequencia:
      "Falha de transparência apontada pelo Tribunal de Contas e impedimento de receber transferências voluntárias.",
    // O RREO é conferível na API do Tesouro; o RGF, pelo mesmo caminho, não.
    // O endpoint /tt/rgf responde 200 mas devolve zero registro para todos os
    // municípios e exercícios que testamos, incluindo São Paulo — a consulta
    // tem alguma forma que não conseguimos descobrir.
    //
    // Marcar como verificável assim mesmo faria a tela dizer "não entregue"
    // para TODO município, acusando de falha quem cumpriu. Enquanto a consulta
    // não funcionar, o RGF é lembrete de data como o SIOPS e o SIOPE.
    verificavel: false,
  },
  {
    chave: "siops",
    nome: "Declaração de gastos com saúde",
    sigla: "SIOPS",
    sistema: "SIOPS · Ministério da Saúde",
    lei: "Lei Complementar 141/2012",
    artigo: "art. 39",
    consequencia:
      "Suspensão das transferências do Fundo Nacional de Saúde e pendência no CAUC, que trava convênio com a União.",
    verificavel: false,
  },
  {
    chave: "siope",
    nome: "Declaração de gastos com educação",
    sigla: "SIOPE",
    sistema: "SIOPE · FNDE",
    lei: "Lei 9.394/1996 e regulamentação do FNDE",
    artigo: "envio bimestral",
    consequencia:
      "Pendência no CAUC, que impede formalizar convênio e receber recurso voluntário da União.",
    verificavel: false,
  },
];

export function obrigacaoPor(chave: string): Obrigacao | undefined {
  return OBRIGACOES.find((o) => o.chave === chave);
}

/**
 * Periodicidade do RGF conforme o porte do município.
 *
 * A regra geral é quadrimestral, mas o art. 63, I, "b" da LRF faculta a
 * município com até 50 mil habitantes divulgar semestralmente. Como a
 * população já está cadastrada, o calendário se ajusta sozinho em vez de
 * cobrar de uma prefeitura pequena três entregas que a lei não exige dela.
 *
 * É faculdade, não automatismo: o município precisa ter optado. Por isso o
 * parâmetro existe e o padrão é a regra geral — assumir a opção sozinho
 * esconderia uma entrega que talvez seja devida.
 */
export function periodicidadeRgf(populacao: number | null | undefined, optouSemestral = false): Periodicidade {
  const podeOptar = typeof populacao === "number" && populacao > 0 && populacao <= 50_000;
  return podeOptar && optouSemestral ? "semestral" : "quadrimestral";
}

export function podeOptarPorSemestral(populacao: number | null | undefined): boolean {
  return typeof populacao === "number" && populacao > 0 && populacao <= 50_000;
}

export type PeriodoObrigacao = {
  obrigacao: Obrigacao;
  /** 1..6 para bimestre, 1..3 para quadrimestre, 1..2 para semestre. */
  numero: number;
  periodicidade: Periodicidade;
  /** "1º bimestre de 2026" */
  rotulo: string;
  /** Último dia do período coberto, ISO (AAAA-MM-DD). */
  fimDoPeriodo: string;
  /** Data limite para publicar, ISO. */
  vencimento: string;
};

const MESES_POR_PERIODO: Record<Periodicidade, number> = {
  bimestral: 2,
  quadrimestral: 4,
  semestral: 6,
};

const NOME_PERIODO: Record<Periodicidade, string> = {
  bimestral: "bimestre",
  quadrimestral: "quadrimestre",
  semestral: "semestre",
};

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Datas de um exercício, em UTC.
 *
 * UTC de propósito: uma data de vencimento não tem hora nem lugar, e usar o
 * fuso local faria o dia virar cedo ou tarde conforme o servidor — a mesma
 * classe de erro que já apareceu na saudação do painel.
 */
export function periodosDoExercicio(
  exercicio: number,
  opcoes: { periodicidadeRgf?: Periodicidade } = {}
): PeriodoObrigacao[] {
  const periodicidades: Record<string, Periodicidade> = {
    rreo: "bimestral",
    rgf: opcoes.periodicidadeRgf ?? "quadrimestral",
    siops: "bimestral",
    siope: "bimestral",
  };

  const periodos: PeriodoObrigacao[] = [];

  for (const obrigacao of OBRIGACOES) {
    const periodicidade = periodicidades[obrigacao.chave];
    const meses = MESES_POR_PERIODO[periodicidade];
    const quantidade = 12 / meses;

    for (let numero = 1; numero <= quantidade; numero++) {
      // Dia 0 do mês seguinte = último dia do mês corrente, sem precisar saber
      // quantos dias tem fevereiro nem se o ano é bissexto.
      const fim = new Date(Date.UTC(exercicio, numero * meses, 0));
      const vencimento = new Date(fim.getTime() + PRAZO_DIAS * 86_400_000);

      periodos.push({
        obrigacao,
        numero,
        periodicidade,
        rotulo: `${numero}º ${NOME_PERIODO[periodicidade]} de ${exercicio}`,
        fimDoPeriodo: iso(fim),
        vencimento: iso(vencimento),
      });
    }
  }

  return periodos.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export type SituacaoObrigacao = "entregue" | "a_vencer" | "vence_breve" | "vencida" | "futura";

export const NOME_SITUACAO_OBRIGACAO: Record<SituacaoObrigacao, string> = {
  entregue: "Entregue",
  a_vencer: "A vencer",
  vence_breve: "Vence em breve",
  vencida: "Em atraso",
  futura: "Período ainda aberto",
};

/**
 * Dias antes do vencimento em que o aviso aparece.
 *
 * Quinze dias porque fechar um RREO não é escrever um e-mail: depende da
 * contabilidade encerrar o período. Avisar cinco dias antes seria avisar tarde.
 */
const DIAS_PARA_AVISAR = 15;

export type ObrigacaoAvaliada = PeriodoObrigacao & {
  situacao: SituacaoObrigacao;
  /** Positivo = ainda há tempo. Negativo = dias de atraso. */
  diasRestantes: number;
};

/**
 * Cruza o calendário com o que já foi entregue.
 *
 * `entregues` traz as chaves no formato `${obrigacao}:${numero}` — para RREO e
 * RGF elas vêm da consulta ao Tesouro, o que faz o alerta desaparecer sozinho
 * quando a publicação acontece. Sem essa lista, tudo que venceu aparece como
 * atraso, e é a leitura correta: não temos como afirmar entrega que ninguém
 * confirmou.
 */
export function avaliarObrigacoes(
  periodos: PeriodoObrigacao[],
  entregues: Set<string>,
  hoje: Date = new Date()
): ObrigacaoAvaliada[] {
  const hojeIso = iso(hoje);

  return periodos.map((p) => {
    const chave = `${p.obrigacao.chave}:${p.numero}`;
    const diasRestantes = Math.round(
      (Date.parse(p.vencimento) - Date.parse(hojeIso)) / 86_400_000
    );

    let situacao: SituacaoObrigacao;
    if (entregues.has(chave)) situacao = "entregue";
    else if (p.fimDoPeriodo > hojeIso) situacao = "futura";
    else if (diasRestantes < 0) situacao = "vencida";
    else if (diasRestantes <= DIAS_PARA_AVISAR) situacao = "vence_breve";
    else situacao = "a_vencer";

    return { ...p, situacao, diasRestantes };
  });
}

export type PainelObrigacoes = {
  vencidas: ObrigacaoAvaliada[];
  vencendo: ObrigacaoAvaliada[];
  /** A próxima que ainda não está em nenhuma das listas acima. */
  proxima: ObrigacaoAvaliada | null;
  entregues: number;
  total: number;
};

export function montarPainelObrigacoes(avaliadas: ObrigacaoAvaliada[]): PainelObrigacoes {
  const vencidas = avaliadas.filter((o) => o.situacao === "vencida");
  const vencendo = avaliadas.filter((o) => o.situacao === "vence_breve");

  return {
    vencidas,
    vencendo,
    proxima: avaliadas.find((o) => o.situacao === "a_vencer" || o.situacao === "futura") ?? null,
    entregues: avaliadas.filter((o) => o.situacao === "entregue").length,
    total: avaliadas.length,
  };
}
