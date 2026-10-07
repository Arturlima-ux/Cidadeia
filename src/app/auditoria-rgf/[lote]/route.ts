// TEMPORÁRIO — terceira auditoria do RGF, uma cidade por vez; removido logo depois.
import { todosOsMunicipios } from "@/lib/municipios";
import { buscarRgfMaisRecente } from "@/lib/siconfi-rgf";
import { fatoDoPessoal } from "@/lib/fatos-do-municipio";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const PASSO = 37;
const TAMANHO = 6;
export async function GET(_: Request, ctx: { params: Promise<{ lote: string }> }) {
  const lote = Number((await ctx.params).lote);
  const amostra = todosOsMunicipios().filter((_, i) => i % PASSO === 0).slice(lote * TAMANHO, lote * TAMANHO + TAMANHO);
  const linhas = [];
  for (const m of amostra) {
    const inicio = Date.now();
    const r = await buscarRgfMaisRecente(m.codigo, 2026, 10);
    const base = { m: `${m.nome}/${m.uf}`, cod: m.codigo, ms: Date.now() - inicio };
    if (r.ok) linhas.push({ ...base, ok: `${r.dados.periodo.exercicio} ${r.dados.periodo.periodicidade}${r.dados.periodo.periodo} ${((r.dados.despesaTotal / r.dados.rclAjustada) * 100).toFixed(2)}%` });
    else linhas.push({ ...base, causa: r.causa, texto: fatoDoPessoal(r, new Date().toISOString()).ausencia });
  }
  return Response.json({ lote, linhas });
}
