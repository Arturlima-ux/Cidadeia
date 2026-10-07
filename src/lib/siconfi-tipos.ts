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
