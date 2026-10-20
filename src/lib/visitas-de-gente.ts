// ── ROBÔ PELO COMPORTAMENTO ──
//
// O filtro de navegador (lib/analytics.ts, naoEhVisitante) impede robô de
// entrar daqui para a frente. Mas o que já foi gravado não guarda o
// navegador, de propósito (privacidade). Para os dados antigos, e para robô
// que se disfarça de navegador, sobra o comportamento, que gente não imita:
//
//   1. abrir o Raio-X de muitas cidades no mesmo dia: quem é de prefeitura
//      olha a sua e, no máximo, duas ou três vizinhas. Cinco ou mais é robô
//      percorrendo o site;
//   2. abrir páginas demais no mesmo dia (30 ou mais): é varredura;
//   3. "abrir a proposta" segundos depois de abrir o Raio-X da mesma cidade:
//      ninguém lê o diagnóstico e decide em menos de 8 segundos. É robô
//      seguindo o botão, ou o navegador pré-carregando a página sozinho.
//
// Quem cai em qualquer regra sai inteiro: todas as visitas daquele
// identificador (que já é diário) deixam de contar. Melhor perder um curioso
// apressado do que mandar a equipe atrás de um robô.

/**
 * Quando o filtro de navegador (robô, prévia de link, pré-carregamento) entrou
 * no ar. Antes disso, um robô que abriu um Raio-X só e foi embora é idêntico
 * a uma pessoa: o navegador não era guardado. A lista de cidades, que manda a
 * equipe atrás de prefeitura, só confia no que veio depois.
 */
export const FILTRO_DE_NAVEGADOR_DESDE = "2026-10-20T14:50:00.000Z";

export type EventoBruto = {
  tipo: string;
  visitante: string;
  codigoIbge: string | null;
  criadoEm: string;
};

export const LIMITE_CIDADES_NO_DIA = 5;
export const LIMITE_PAGINAS_NO_DIA = 30;
export const SEGUNDOS_PARA_DECIDIR = 8;

export function visitantesRobos(eventos: EventoBruto[]): Set<string> {
  const por = new Map<string, EventoBruto[]>();
  for (const e of eventos) por.set(e.visitante, [...(por.get(e.visitante) ?? []), e]);
  const robos = new Set<string>();
  for (const [v, evs] of por) {
    if (evs.length >= LIMITE_PAGINAS_NO_DIA) {
      robos.add(v);
      continue;
    }
    const cidades = new Set(evs.filter((e) => e.codigoIbge && (e.tipo === "raio_x" || e.tipo === "proposta_aberta")).map((e) => e.codigoIbge));
    if (cidades.size >= LIMITE_CIDADES_NO_DIA) {
      robos.add(v);
      continue;
    }
    const raioX = evs.filter((e) => e.tipo === "raio_x" && e.codigoIbge);
    const rapido = evs.some(
      (p) =>
        p.tipo === "proposta_aberta" &&
        p.codigoIbge &&
        raioX.some((r) => {
          if (r.codigoIbge !== p.codigoIbge) return false;
          const dt = (Date.parse(p.criadoEm) - Date.parse(r.criadoEm)) / 1000;
          return dt >= 0 && dt < SEGUNDOS_PARA_DECIDIR;
        })
    );
    if (rapido) robos.add(v);
  }
  return robos;
}

/** Separa as visitas de gente das de robô. */
export function separarGente<T extends EventoBruto>(eventos: T[]): { gente: T[]; robos: Set<string> } {
  const robos = visitantesRobos(eventos);
  return { gente: eventos.filter((e) => !robos.has(e.visitante)), robos };
}
