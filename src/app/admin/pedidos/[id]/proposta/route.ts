import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidosProposta } from "@/db/schema";
import { emailDaEquipe } from "@/lib/equipe";
import { empresaDoAmbiente, montarPropostaComercial } from "@/lib/proposta-comercial";
import { PropostaComercialPDF } from "@/lib/relatorios/PropostaComercial";

// ── A PROPOSTA EM PDF, A PARTIR DO PEDIDO ──
// Só a equipe (ADMIN_EMAILS) gera. O arquivo é o que vai para o cliente
// por e-mail junto com o kit — a promessa de "um dia útil" cabe num clique.

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await emailDaEquipe())) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const { id } = await ctx.params;
  if (!/^prop_[A-Za-z0-9_-]{4,64}$/.test(id)) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  const [pedido] = await db.select().from(pedidosProposta).where(eq(pedidosProposta.id, id)).limit(1);
  if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });

  const proposta = montarPropostaComercial(pedido, empresaDoAmbiente());
  const buffer = await renderToBuffer(PropostaComercialPDF({ p: proposta }));

  const nomeArquivo = `proposta-cidadeia-${pedido.municipio
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .toLowerCase()}-${proposta.numero}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
