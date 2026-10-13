import { NextResponse, after } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidosProposta } from "@/db/schema";
import { empresaDoAmbiente, montarPropostaComercial } from "@/lib/proposta-comercial";
import { PropostaComercialPDF } from "@/lib/relatorios/PropostaComercial";
import { protocolo } from "@/lib/cobranca-servidor";
import { pedidoDaChave, registrarAbertura, type DestinoRastreado } from "@/lib/abertura-da-proposta";

// ── OS LINKS DO E-MAIL DA PROPOSTA ──
// /proposta/ver/<chave>            a proposta em PDF, aberta no navegador
// /proposta/ver/<chave>?ir=kit     o kit de contratação
// /proposta/ver/<chave>?ir=acompanhar  o acompanhamento do pedido
// Cada clique registra a abertura e avisa a equipe (lib/abertura-da-proposta.ts),
// depois que a resposta já saiu: quem clicou não espera por isso.

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ chave: string }> }) {
  const { chave } = await ctx.params;
  const pedidoId = pedidoDaChave(chave);
  const url = new URL(req.url);
  // Chave inválida ou adulterada: a página de acompanhamento, que pede
  // protocolo e e-mail. Nada da proposta sai sem a chave certa.
  if (!pedidoId) return NextResponse.redirect(new URL("/proposta/acompanhar", url));

  const ir = url.searchParams.get("ir");
  const destino: DestinoRastreado = ir === "kit" ? "kit" : ir === "acompanhar" ? "acompanhar" : "proposta";
  const navegador = req.headers.get("user-agent");
  after(async () => {
    try {
      await registrarAbertura(pedidoId, destino, navegador);
    } catch (e) {
      console.error("[proposta/ver] não registrou a abertura:", e);
    }
  });

  if (destino === "kit") return NextResponse.redirect(new URL("/kit", url));
  if (destino === "acompanhar") return NextResponse.redirect(new URL(`/proposta/acompanhar?protocolo=${protocolo(pedidoId)}`, url));

  const [pedido] = await db.select().from(pedidosProposta).where(eq(pedidosProposta.id, pedidoId)).limit(1);
  if (!pedido) return NextResponse.redirect(new URL("/proposta/acompanhar", url));
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
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
