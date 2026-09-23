import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { estoqueMerenda, escolas } from "@/db/schema";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { montarPedidoMerenda, pedidoMerendaParaCsv } from "@/lib/merenda";

// O pedido da merenda em CSV, para o almoxarifado ou o fornecedor.
export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await lerSessao();
  if (!sessao || !temAcessoSecretaria(sessao, "educacao") || sessao.cargo === "escola") {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  }
  const [estoque, rede] = await Promise.all([
    db.select().from(estoqueMerenda).where(eq(estoqueMerenda.prefeituraId, sessao.prefeituraId)),
    db.select({ id: escolas.id, nome: escolas.nome }).from(escolas).where(eq(escolas.prefeituraId, sessao.prefeituraId)),
  ]);
  const nomeDe = new Map(rede.map((e) => [e.id, e.nome]));
  const pedido = montarPedidoMerenda(estoque.map((l) => ({ ...l, escolaNome: nomeDe.get(l.escolaId) ?? "Escola" })));
  const hoje = new Date().toISOString().slice(0, 10);
  return new NextResponse(pedidoMerendaParaCsv(pedido), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedido-merenda-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
