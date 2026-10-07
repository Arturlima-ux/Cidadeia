// ── O RELATÓRIO SIMPLIFICADO ──
//
// O município com até 50 mil habitantes pode entregar o RREO e o RGF na versão
// SIMPLIFICADA (LRF, art. 63). É a maioria dos municípios do país. O Tesouro
// guarda essa versão com outro tipo de demonstrativo, "RREO Simplificado" e
// "RGF Simplificado", e a consulta pelo tipo comum volta vazia para eles.
//
// Foi assim que o Raio-X de Boa Esperança/ES disse que não havia RGF publicado,
// com o RGF Simplificado do 1º semestre de 2026 homologado no Tesouro e a
// despesa com pessoal declarada em 47,58%. Uma afirmação falsa sobre a
// prefeitura, na página cujo argumento inteiro é precisão.
//
// Por isso toda consulta pergunta pelos dois tipos. As contas (cod_conta) do
// Anexo 01 do RGF e dos Anexos 01 e 02 do RREO são as mesmas nas duas versões,
// então a leitura dos valores não muda.

export const TIPOS_RREO = ["RREO", "RREO Simplificado"] as const;
export const TIPOS_RGF = ["RGF", "RGF Simplificado"] as const;

/**
 * Pergunta pelos dois tipos ao mesmo tempo e devolve o primeiro, na ordem dada,
 * que tiver linhas.
 *
 * O resultado mantém a distinção que a tela precisa: lista com linhas é
 * "publicado"; lista vazia é "perguntamos pelos dois tipos e o Tesouro não tem
 * nenhum"; null é "não conseguimos perguntar". Basta UM dos tipos ter falhado
 * para a ausência deixar de ser afirmável: o relatório podia estar justamente
 * no tipo cuja pergunta não chegou.
 */
export async function consultarTipos<T>(
  tipos: readonly string[],
  buscar: (tipo: string) => Promise<T[] | null>
): Promise<T[] | null> {
  const respostas = await Promise.all(tipos.map((t) => buscar(t)));
  const comLinhas = respostas.find((r) => r !== null && r.length > 0);
  if (comLinhas) return comLinhas;
  return respostas.some((r) => r === null) ? null : [];
}

// ── QUANTO TEMPO GUARDAR A RESPOSTA ──
//
// A resposta do Tesouro fica no cache de dados. Para período antigo, sete
// dias não erram nada: o relatório de um ano atrás não muda. Para período
// recente, erram feio: se o site perguntou na véspera da entrega, guardava o
// "vazio" por uma semana e seguia dizendo "não consta publicado" depois que a
// prefeitura já tinha entregado. Período que fechou há menos de 120 dias
// (prazo legal mais a homologação, com folga) é perguntado de novo a cada 6 h.

const SEIS_HORAS = 6 * 3600;
const SETE_DIAS = 7 * 86_400;
const RECENTE_MS = 120 * 86_400_000;

/** Segundos de cache para um período que terminou no último dia de `mesFinal` (1–12). */
export function cacheDoPeriodo(exercicio: number, mesFinal: number, agora: number = Date.now()): number {
  const fim = Date.UTC(exercicio, mesFinal, 0);
  return agora - fim < RECENTE_MS ? SEIS_HORAS : SETE_DIAS;
}

// ── QUEM É O "MUNICÍPIO" NO TESOURO ──
//
// Dois códigos do IBGE não são prefeituras para o Tesouro:
//
//   · Brasília (5300108): o Distrito Federal presta contas como governo
//     distrital, no código 53 e na esfera estadual. Pela esfera municipal a
//     consulta volta vazia, e o site dizia que Brasília não tinha RGF.
//   · Fernando de Noronha (2605459): distrito estadual administrado pelo
//     Governo de Pernambuco. Não tem prefeitura, câmara nem relatório próprio,
//     e não pode ser cobrado por não entregar.

export const CODIGO_FERNANDO_DE_NORONHA = "2605459";

export const SEM_PREFEITURA: Record<string, string> = {
  [CODIGO_FERNANDO_DE_NORONHA]:
    "Fernando de Noronha é um distrito estadual administrado pelo Governo de Pernambuco. Não tem prefeitura, " +
    "então não entrega RGF nem RREO próprios: as contas da ilha estão nas do Estado de Pernambuco.",
};

export function enteNoTesouro(codigoIbge: string): { id: string; esfera: "M" | "E" } {
  return codigoIbge === "5300108" ? { id: "53", esfera: "E" } : { id: codigoIbge, esfera: "M" };
}
