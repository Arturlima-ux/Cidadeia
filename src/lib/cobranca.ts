// ── A REGRA DE COBRANÇA ──
//
// Decisão comercial de outubro de 2026, do fundador:
//
// 1. O módulo só liga depois do PRIMEIRO pagamento. Pedido, proposta,
//    contrato e empenho acontecem antes; a ativação é consequência do
//    dinheiro na conta, confirmada pela equipe.
// 2. A cobrança é mensal e antecipada: a fatura de um mês vence no próprio
//    mês, no dia combinado no contrato.
// 3. Fatura em atraso além da carência trava o painel. Paga, destrava na
//    hora, sem ninguém precisar apertar nada.
//
// ── O QUE A LEI DIZ SOBRE ISSO ──
//
// Pagamento antecipado é vedado como regra na Lei 14.133/2021 (art. 145) e
// só cabe se for condição indispensável para a prestação do serviço,
// justificado no processo e previsto no instrumento da contratação direta
// (art. 145, § 1º). A Lei 4.320/1964 (arts. 62 e 63) manda pagar depois da
// liquidação. Por isso a cláusula de pagamento antecipado e de suspensão por
// atraso precisa estar na minuta e no termo de referência do kit; sem ela, o
// ordenador de despesa não consegue pagar antes de usar. O sistema aplica a
// regra; o contrato é o que a torna lícita.
//
// Tudo aqui é função pura sobre datas em texto (AAAA-MM-DD), para ser testado
// sem relógio e sem fuso: tests/cobranca.test.ts.

/** Dias depois do vencimento em que o painel ainda funciona. */
export const CARENCIA_DIAS = 5;
/** A partir de quantos dias antes do vencimento o painel avisa. */
export const AVISO_DIAS = 7;
/** Prazo da primeira fatura, contado do registro do contrato. */
export const PRAZO_PRIMEIRA_DIAS = 5;
/** Dia de vencimento das mensalidades quando o contrato não diz outro. */
export const DIA_VENCIMENTO_PADRAO = 10;

export type StatusFatura = "aberta" | "paga" | "cancelada";

export type FaturaResumo = {
  id: string;
  competencia: string; // AAAA-MM
  vencimento: string; // AAAA-MM-DD
  status: StatusFatura;
  valor: number;
};

export type SituacaoFinanceira =
  | { tipo: "sem_cobranca" }
  | { tipo: "aguardando_primeiro_pagamento"; fatura: FaturaResumo }
  | { tipo: "em_dia"; proxima: FaturaResumo | null }
  | { tipo: "a_vencer"; fatura: FaturaResumo; dias: number }
  | { tipo: "vencida"; fatura: FaturaResumo; diasAtraso: number; travaEm: string }
  | { tipo: "travada"; fatura: FaturaResumo; diasAtraso: number };

// ── datas ──

function utc(data: string): number {
  const [a, m, d] = data.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

function paraTexto(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Dias de `de` até `ate` (negativo se `ate` vem antes). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((utc(ate) - utc(de)) / 86_400_000);
}

export function somarDias(data: string, dias: number): string {
  return paraTexto(utc(data) + dias * 86_400_000);
}

export function competenciaDe(data: string): string {
  return data.slice(0, 7);
}

/** O dia combinado, preso ao último dia do mês (dia 31 em fevereiro vira 28 ou 29). */
export function vencimentoDaCompetencia(competencia: string, dia: number): string {
  const [a, m] = competencia.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const d = Math.min(Math.max(1, Math.round(dia)), ultimo);
  return `${competencia}-${String(d).padStart(2, "0")}`;
}

export function vencimentoDaPrimeira(hoje: string): string {
  return somarDias(hoje, PRAZO_PRIMEIRA_DIAS);
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function rotuloCompetencia(competencia: string): string {
  const [a, m] = competencia.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

export function dataCurta(data: string): string {
  const [a, m, d] = data.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** Hoje no fuso de Brasília, em AAAA-MM-DD. O servidor roda em UTC. */
export function hojeEmBrasilia(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

// ── a regra ──

export function situacaoFinanceira(faturas: FaturaResumo[], hoje: string): SituacaoFinanceira {
  const validas = faturas.filter((f) => f.status !== "cancelada");
  if (validas.length === 0) return { tipo: "sem_cobranca" };

  const abertas = validas
    .filter((f) => f.status === "aberta")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  // Antes do primeiro pagamento o módulo nem ligou. Não há o que travar, e
  // chamar isso de "atraso" assustaria quem ainda está no trâmite do empenho.
  if (!validas.some((f) => f.status === "paga")) {
    return { tipo: "aguardando_primeiro_pagamento", fatura: abertas[0] };
  }

  const atrasada = abertas.find((f) => diasEntre(f.vencimento, hoje) > 0);
  if (atrasada) {
    const diasAtraso = diasEntre(atrasada.vencimento, hoje);
    if (diasAtraso > CARENCIA_DIAS) return { tipo: "travada", fatura: atrasada, diasAtraso };
    return {
      tipo: "vencida",
      fatura: atrasada,
      diasAtraso,
      travaEm: somarDias(atrasada.vencimento, CARENCIA_DIAS + 1),
    };
  }

  const proxima = abertas[0] ?? null;
  if (proxima) {
    const dias = diasEntre(hoje, proxima.vencimento);
    if (dias <= AVISO_DIAS) return { tipo: "a_vencer", fatura: proxima, dias };
  }
  return { tipo: "em_dia", proxima };
}

export function painelTravado(s: SituacaoFinanceira): boolean {
  return s.tipo === "travada";
}

/**
 * A competência do mês corrente, quando ainda não há fatura para ela.
 *
 * Só depois do primeiro pagamento (antes disso o contrato não começou) e
 * nunca recriando uma fatura que a equipe cancelou.
 */
export function competenciaQueFalta(faturas: FaturaResumo[], hoje: string): string | null {
  if (!faturas.some((f) => f.status === "paga")) return null;
  const atual = competenciaDe(hoje);
  if (faturas.some((f) => f.competencia === atual)) return null;
  // Uma competência anterior à mais recente já faturada não é "a que falta":
  // a primeira fatura pode ter sido de um mês adiante.
  const maisRecente = faturas.map((f) => f.competencia).sort().at(-1);
  if (maisRecente && maisRecente > atual) return null;
  return atual;
}

// ── VÁRIOS CONTRATOS, UMA CONTA ──
//
// Uma prefeitura pode ter o contrato inicial e, depois, um pedido de módulo
// novo, cada um com as suas faturas. A situação se calcula por contrato e a
// conta fica com a pior. Juntar tudo numa lista só daria errado: a primeira
// fatura do módulo novo, ainda no trâmite do empenho, seria lida como atraso
// de quem já paga em dia, e travaria o painel inteiro.

const GRAVIDADE: Record<SituacaoFinanceira["tipo"], number> = {
  sem_cobranca: 0,
  em_dia: 1,
  aguardando_primeiro_pagamento: 2,
  a_vencer: 3,
  vencida: 4,
  travada: 5,
};

export function situacaoDaConta(faturasPorContrato: FaturaResumo[][], hoje: string): SituacaoFinanceira {
  let pior: SituacaoFinanceira = { tipo: "sem_cobranca" };
  for (const faturas of faturasPorContrato) {
    const s = situacaoFinanceira(faturas, hoje);
    if (GRAVIDADE[s.tipo] > GRAVIDADE[pior.tipo]) pior = s;
  }
  return pior;
}

// ── O QUE CONTINUA ABERTO COM A CONTA TRAVADA ──
//
// Financeiro, para ver a fatura e pagar. Meus dados, porque a exportação é
// promessa pública do site ("a saída está escrita") e dado do município não
// vira refém de cobrança. Minha conta, para trocar senha e e-mail.
export const ROTAS_LIVRES_NA_TRAVA = ["/dashboard/financeiro", "/dashboard/dados", "/dashboard/conta"];

export function rotaLivreNaTrava(caminho: string): boolean {
  return ROTAS_LIVRES_NA_TRAVA.some((r) => caminho === r || caminho.startsWith(`${r}/`));
}
