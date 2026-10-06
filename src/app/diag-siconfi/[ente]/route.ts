// TEMPORÁRIO — diagnóstico do RGF/RREO Simplificado; removido logo depois.
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";
type Item = Record<string, unknown>;
async function q(caminho: string, p: Record<string, string>) {
  try {
    const r = await fetch(`${BASE}/${caminho}?${new URLSearchParams(p)}`, { cache: "no-store", signal: AbortSignal.timeout(25000) });
    const j = await r.json();
    return { status: r.status, itens: (j.items ?? []) as Item[] };
  } catch (e) { return { status: -1, itens: [] as Item[], erro: String(e) }; }
}
export async function GET(_: Request, ctx: { params: Promise<{ ente: string }> }) {
  const { ente } = await ctx.params;
  if (!/^\d{7}$/.test(ente)) return new Response("x", { status: 400 });
  const tarefas: Promise<unknown>[] = [];
  for (const tipo of ["RGF", "RGF Simplificado"]) for (const [ex, per, n] of [[2025, "S", 2], [2025, "Q", 3], [2026, "S", 1], [2026, "Q", 2]] as const) {
    tarefas.push(q("rgf", { an_exercicio: String(ex), in_periodicidade: per, nr_periodo: String(n), co_tipo_demonstrativo: tipo, co_poder: "E", co_esfera: "M", id_ente: ente }).then((r) => ({
      rgf: `${tipo} ${ex} ${per}${n}`, status: r.status, count: r.itens.length,
      anexos: [...new Set(r.itens.map((i) => i.anexo))], colunas: [...new Set(r.itens.map((i) => i.coluna))],
      pessoal: r.itens.filter((i) => /Pessoal|ReceitaCorrenteLiquida/i.test(String(i.cod_conta))).map((i) => [i.anexo, i.cod_conta, i.coluna, i.valor]),
    })));
  }
  for (const tipo of ["RREO", "RREO Simplificado"]) for (const b of [1, 2, 3, 4]) {
    tarefas.push(q("rreo", { an_exercicio: "2026", nr_periodo: String(b), co_tipo_demonstrativo: tipo, id_ente: ente }).then((r) => ({
      rreo: `${tipo} 2026 b${b}`, status: r.status, count: r.itens.length,
      anexos: [...new Set(r.itens.map((i) => i.anexo))],
    })));
  }
  tarefas.push(q("extrato_entregas", { id_ente: ente, an_referencia: "2026" }).then((r) => ({ extrato2026: r.itens.map((i) => [i.instituicao, i.entregavel, i.periodo, i.periodicidade, i.status_relatorio, i.data_status]) })));
  return Response.json(await Promise.all(tarefas));
}
