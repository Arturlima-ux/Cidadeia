import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { estoqueSaude, unidadesSaude } from "@/db/schema";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { montarPedidoReposicao, pedidoParaCsv } from "@/lib/estoque-saude";

// O pedido de reposição em CSV, para a farmácia central ou o fornecedor.
export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await lerSessao();
  if (!sessao || !temAcessoSecretaria(sessao, "saude") || sessao.cargo === "unidade") {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  }
  const [estoque, unidades] = await Promise.all([
    db.select().from(estoqueSaude).where(eq(estoqueSaude.prefeituraId, sessao.prefeituraId)),
    db.select({ id: unidadesSaude.id, nome: unidadesSaude.nome }).from(unidadesSaude).where(eq(unidadesSaude.prefeituraId, sessao.prefeituraId)),
  ]);
  const nomeDe = new Map(unidades.map((u) => [u.id, u.nome]));
  const pedido = montarPedidoReposicao(estoque.map((l) => ({ ...l, unidadeNome: nomeDe.get(l.unidadeId) ?? "Unidade" })));
  const hoje = new Date().toISOString().slice(0, 10);
  return new NextResponse(pedidoParaCsv(pedido), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedido-reposicao-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
