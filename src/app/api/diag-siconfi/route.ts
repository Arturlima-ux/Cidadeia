// TEMPORÁRIO — só no branch de diagnóstico, nunca vai para main.
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const caminho = q.get("p") ?? "rgf";
  if (!/^[a-z_]+$/.test(caminho)) return new Response("x", { status: 400 });
  q.delete("p");
  const r = await fetch(`https://apidatalake.tesouro.gov.br/ords/siconfi/tt/${caminho}?${q}`, { cache: "no-store" });
  const j = await r.json();
  const itens = (j.items ?? []) as Record<string, unknown>[];
  const resumo = {
    status: r.status, count: itens.length,
    anexos: [...new Set(itens.map((i) => i.anexo))],
    colunas: [...new Set(itens.map((i) => i.coluna))],
    contas: itens.filter((i) => /Pessoal|ReceitaCorrenteLiquida/.test(String(i.cod_conta))).map((i) => [i.anexo, i.cod_conta, i.conta, i.coluna, i.valor]),
    amostra: itens.slice(0, 3),
  };
  return Response.json(resumo);
}
