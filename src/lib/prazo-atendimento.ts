import type { TipoAtendimento, StatusAtendimento } from "@/lib/atendimento";

// ── PRAZO LEGAL DE RESPOSTA AO CIDADÃO ──
//
// Manifestação do cidadão tem prazo em lei, e o prazo é diferente conforme o
// tipo. Tratar tudo igual erraria nos dois sentidos: cobraria cedo demais numa
// ouvidoria e tarde demais num pedido de acesso à informação — que é
// justamente o mais curto e o mais fiscalizado.
//
// A prefeitura de três servidores raramente perde prazo por má-fé. Perde
// porque ninguém contou os dias.

export type PrazoLegal = {
  dias: number;
  /** Dias extras quando a prorrogação é formalizada. Null quando não cabe. */
  prorrogacao: number | null;
  lei: string;
  artigo: string;
};

/**
 * Prazos por tipo de manifestação.
 *
 * Pedido de informação segue a LAI: 20 dias, prorrogáveis por 10 mediante
 * justificativa expressa da qual o requerente seja cientificado.
 *
 * Os demais seguem a Lei 13.460/2017, que dá 30 dias prorrogáveis uma única
 * vez por igual período. Incluímos aí a solicitação de serviço: o art. 10 fala
 * em "reclamações, denúncias, sugestões, elogios e demais pronunciamentos de
 * usuários", e uma solicitação cabe em "demais pronunciamentos". É a leitura
 * mais ampla, e é a escolha deliberadamente conservadora — errar aplicando um
 * prazo faz a prefeitura responder mais rápido do que talvez precisasse; errar
 * não aplicando faz ela perder um prazo que existia.
 */
export const PRAZOS: Record<TipoAtendimento, PrazoLegal> = {
  informacao: {
    dias: 20,
    prorrogacao: 10,
    lei: "Lei 12.527/2011 (LAI)",
    artigo: "art. 11, § 1º e § 2º",
  },
  protocolo: { dias: 30, prorrogacao: 30, lei: "Lei 13.460/2017", artigo: "art. 16" },
  reclamacao: { dias: 30, prorrogacao: 30, lei: "Lei 13.460/2017", artigo: "art. 16" },
  denuncia: { dias: 30, prorrogacao: 30, lei: "Lei 13.460/2017", artigo: "art. 16" },
  sugestao: { dias: 30, prorrogacao: 30, lei: "Lei 13.460/2017", artigo: "art. 16" },
  elogio: { dias: 30, prorrogacao: 30, lei: "Lei 13.460/2017", artigo: "art. 16" },
};

export type SituacaoPrazo = "respondido" | "no_prazo" | "vence_breve" | "vencido";

export const NOME_SITUACAO_PRAZO: Record<SituacaoPrazo, string> = {
  respondido: "Respondido",
  no_prazo: "No prazo",
  vence_breve: "Vence em breve",
  vencido: "Prazo vencido",
};

/**
 * Dias restantes a partir dos quais o alerta aparece.
 *
 * Cinco dias é o que permite reagir: dá para localizar o processo, redigir a
 * resposta e ainda formalizar a prorrogação, se for o caso. Avisar em cima da
 * hora só transforma o painel em registro de fracasso.
 */
const DIAS_PARA_AVISAR = 5;

const MS_POR_DIA = 86_400_000;

/**
 * Diferença em dias corridos entre duas datas, ignorando a hora.
 *
 * Corridos, e não úteis, de propósito. A LAI não distingue, os decretos
 * municipais variam, e contar corrido produz o prazo mais curto — que é o erro
 * seguro: o alerta chega antes, nunca depois.
 */
export function diasEntre(inicioIso: string, fimIso: string): number {
  const inicio = Date.parse(inicioIso.slice(0, 10));
  const fim = Date.parse(fimIso.slice(0, 10));
  if (Number.isNaN(inicio) || Number.isNaN(fim)) return 0;
  return Math.round((fim - inicio) / MS_POR_DIA);
}

export type EntradaPrazo = {
  tipo: TipoAtendimento;
  status: StatusAtendimento;
  /** Data de abertura, ISO. */
  abertoEm: string;
  /** Data da resposta, ISO. Null enquanto não respondido. */
  respondidoEm?: string | null;
  /** true quando a prefeitura formalizou a prorrogação prevista em lei. */
  prorrogado?: boolean;
};

export type AvaliacaoPrazo = {
  situacao: SituacaoPrazo;
  /** Dias corridos desde a abertura até hoje (ou até a resposta). */
  diasCorridos: number;
  /** Prazo aplicável, já somada a prorrogação quando formalizada. */
  prazoDias: number;
  /** Positivo = ainda há tempo. Negativo = dias de atraso. */
  diasRestantes: number;
  prazo: PrazoLegal;
  /** true quando ainda cabe prorrogar — some depois que a prorrogação é usada. */
  podeProrrogar: boolean;
};

export function avaliarPrazo(entrada: EntradaPrazo, hoje: Date = new Date()): AvaliacaoPrazo {
  const prazo = PRAZOS[entrada.tipo];
  const prorrogado = entrada.prorrogado === true;
  const prazoDias = prazo.dias + (prorrogado ? (prazo.prorrogacao ?? 0) : 0);

  const respondido = entrada.status === "respondido" || entrada.status === "encerrado";
  // Quando há data de resposta, o relógio para nela. Sem a data, um atendimento
  // marcado como respondido ainda conta como cumprido — o registro é falho, mas
  // acusar atraso em algo que a prefeitura respondeu seria pior.
  const referencia = respondido
    ? entrada.respondidoEm ?? hoje.toISOString()
    : hoje.toISOString();

  const diasCorridos = diasEntre(entrada.abertoEm, referencia);
  const diasRestantes = prazoDias - diasCorridos;

  let situacao: SituacaoPrazo;
  if (respondido) situacao = "respondido";
  else if (diasRestantes < 0) situacao = "vencido";
  else if (diasRestantes <= DIAS_PARA_AVISAR) situacao = "vence_breve";
  else situacao = "no_prazo";

  return {
    situacao,
    diasCorridos,
    prazoDias,
    diasRestantes,
    prazo,
    podeProrrogar: !respondido && !prorrogado && prazo.prorrogacao !== null,
  };
}

export type AtendimentoComPrazo<T> = { atendimento: T; avaliacao: AvaliacaoPrazo };

export type PainelPrazos<T> = {
  vencidos: AtendimentoComPrazo<T>[];
  vencendo: AtendimentoComPrazo<T>[];
  noPrazo: number;
  respondidos: number;
  total: number;
};

/**
 * Organiza uma lista de atendimentos pelo que exige ação.
 *
 * Vencidos e vencendo saem como lista, porque o gestor precisa abrir cada um.
 * O resto sai como contagem: ninguém age sobre "está tudo bem".
 */
export function montarPainelPrazos<T extends EntradaPrazo>(
  atendimentos: T[],
  hoje: Date = new Date()
): PainelPrazos<T> {
  const avaliados = atendimentos.map((atendimento) => ({
    atendimento,
    avaliacao: avaliarPrazo(atendimento, hoje),
  }));

  // Mais atrasado primeiro: é a ordem em que o dano cresce.
  const porUrgencia = (a: AtendimentoComPrazo<T>, b: AtendimentoComPrazo<T>) =>
    a.avaliacao.diasRestantes - b.avaliacao.diasRestantes;

  return {
    vencidos: avaliados.filter((a) => a.avaliacao.situacao === "vencido").sort(porUrgencia),
    vencendo: avaliados.filter((a) => a.avaliacao.situacao === "vence_breve").sort(porUrgencia),
    noPrazo: avaliados.filter((a) => a.avaliacao.situacao === "no_prazo").length,
    respondidos: avaliados.filter((a) => a.avaliacao.situacao === "respondido").length,
    total: avaliados.length,
  };
}

/** Frase curta para a linha do atendimento na tela. */
export function descreverPrazo(a: AvaliacaoPrazo): string {
  if (a.situacao === "respondido") {
    return `Respondido em ${a.diasCorridos} ${a.diasCorridos === 1 ? "dia" : "dias"}.`;
  }
  if (a.situacao === "vencido") {
    const atraso = Math.abs(a.diasRestantes);
    return `Prazo vencido há ${atraso} ${atraso === 1 ? "dia" : "dias"}.`;
  }
  if (a.diasRestantes === 0) return "Vence hoje.";
  return `Faltam ${a.diasRestantes} ${a.diasRestantes === 1 ? "dia" : "dias"}.`;
}
