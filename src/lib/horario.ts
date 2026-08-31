// ── HORA LOCAL DO MUNICÍPIO ──
//
// O servidor da Vercel roda em UTC. Usar `new Date().getHours()` numa página
// renderizada no servidor devolve a hora de Londres, não a da prefeitura: às
// 22h no Ceará o painel dava "Bom dia" e mostrava a data do dia seguinte.
//
// A correção não é fixar "America/Sao_Paulo" para todo mundo. O Brasil tem
// quatro fusos, e uma prefeitura do Acre veria o relógio de Brasília — três
// horas adiantado, o que traz de volta o mesmo defeito em outra escala.
// Então o fuso sai da UF da própria prefeitura.

/**
 * UF → fuso horário IANA.
 *
 * Só as exceções precisam constar; o resto do país usa America/Sao_Paulo.
 * - Acre e o sudoeste do Amazonas: UTC−5
 * - AM, RR, RO, MT, MS: UTC−4
 * - Fernando de Noronha (PE) é UTC−2, mas não é município próprio: fica
 *   com o fuso de Recife, que é o que vale para a prefeitura.
 */
const FUSO_POR_UF: Record<string, string> = {
  AC: "America/Rio_Branco",
  AM: "America/Manaus",
  RR: "America/Boa_Vista",
  RO: "America/Porto_Velho",
  MT: "America/Cuiaba",
  MS: "America/Campo_Grande",
};

export const FUSO_PADRAO = "America/Sao_Paulo";

export function fusoDoEstado(uf: string | null | undefined): string {
  if (!uf) return FUSO_PADRAO;
  return FUSO_POR_UF[uf.trim().toUpperCase()] ?? FUSO_PADRAO;
}

/** Hora do dia (0–23) naquele fuso, seja qual for o fuso do servidor. */
export function horaLocal(fuso: string, agora: Date = new Date()): number {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "numeric",
    hour12: false,
  }).format(agora);
  // Meia-noite volta como "24" em alguns ambientes; normaliza para 0.
  return Number(texto) % 24;
}

/**
 * Saudação pela hora local.
 *
 * Os cortes seguem o uso corrente em português: até meio-dia é manhã, até
 * as 18h é tarde, depois disso é noite. A madrugada recebe "Bom dia" de
 * propósito — é o que se diz a quem está trabalhando às 3h, e servidor de
 * plantão existe.
 */
export function saudacao(fuso: string, agora: Date = new Date()): string {
  const hora = horaLocal(fuso, agora);
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/** "domingo, 30 de agosto" — no fuso do município, não no do servidor. */
export function dataPorExtenso(fuso: string, agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(agora);
}

// ── DATAS GUARDADAS NO BANCO ──
//
// Mesmo cuidado, por outro motivo: uma data gravada às 21h no Brasil já é o
// dia seguinte em UTC. Formatada sem fuso no servidor, um protocolo aberto
// no domingo à noite aparece como segunda-feira — e o cidadão que anotou o
// dia não reconhece o próprio pedido.

function comFuso(iso: string | null | undefined, fuso: string, opcoes: Intl.DateTimeFormatOptions): string {
  if (!iso) return "—";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, ...opcoes }).format(data);
}

/** "30 ago" */
export function dataCurta(iso: string | null | undefined, fuso: string): string {
  return comFuso(iso, fuso, { day: "2-digit", month: "short" });
}

/** "30/08/2026" */
export function dataNumerica(iso: string | null | undefined, fuso: string): string {
  return comFuso(iso, fuso, { day: "2-digit", month: "2-digit", year: "numeric" });
}
