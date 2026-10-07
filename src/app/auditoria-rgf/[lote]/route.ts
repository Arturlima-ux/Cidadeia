// TEMPORÁRIO — auditoria da ausência de RGF numa amostra de municípios; removido logo depois.
import { todosOsMunicipios } from "@/lib/municipios";
import { buscarRgfMaisRecente } from "@/lib/siconfi-rgf";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const PASSO = 37;
const TAMANHO = 10;
async function extrato(ente: string, ano: number) {
  try {
    const r = await fetch(`https://apidatalake.tesouro.gov.br/ords/siconfi/tt/extrato_entregas?id_ente=${ente}&an_referencia=${ano}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    const j = await r.json();
    return ((j.items ?? []) as Record<string, unknown>[])
      .filter((i) => /Prefeitura/i.test(String(i.instituicao)) && !/MSC/.test(String(i.entregavel)))
      .map((i) => `${String(i.entregavel).replace("Relatório de Gestão Fiscal", "RGF").replace("Relatório Resumido de Execução Orçamentária", "RREO").replace("Balanço Anual", "DCA")} p${i.periodo}${i.periodicidade} ${i.status_relatorio}`);
  } catch (e) { return [`erro ${String(e)}`]; }
}
export async function GET(_: Request, ctx: { params: Promise<{ lote: string }> }) {
  const lote = Number((await ctx.params).lote);
  const amostra = todosOsMunicipios().filter((_, i) => i % PASSO === 0).slice(lote * TAMANHO, lote * TAMANHO + TAMANHO);
  const linhas = await Promise.all(amostra.map(async (m, i) => {
    await new Promise((r) => setTimeout(r, i * 250));
    const r = await buscarRgfMaisRecente(m.codigo, 2026, 10);
    const base = { m: `${m.nome}/${m.uf}`, pop: m.populacao, cod: m.codigo };
    if (r.ok) return { ...base, ok: `${r.dados.periodo.exercicio} ${r.dados.periodo.periodicidade}${r.dados.periodo.periodo} ${((r.dados.despesaTotal / r.dados.rclAjustada) * 100).toFixed(2)}%` };
    return { ...base, causa: r.causa, e2025: await extrato(m.codigo, 2025), e2026: await extrato(m.codigo, 2026) };
  }));
  return Response.json({ total: todosOsMunicipios().filter((_, i) => i % PASSO === 0).length, lote, linhas });
}
