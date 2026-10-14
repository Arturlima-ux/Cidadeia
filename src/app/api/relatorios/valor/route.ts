import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { lerSessao, ehGestor } from "@/lib/sessao";
import { buscarPrefeitura } from "@/lib/dados-prefeitura";
import { ROTULO_PERIODO, carregarValor, type Periodo } from "@/lib/valor-entregue-servidor";
import { RelatorioValorPDF } from "@/lib/relatorios/RelatorioValor";

export async function GET(request: Request) {
  const sessao = await lerSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!ehGestor(sessao)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  if (!prefeitura) return NextResponse.json({ erro: "Prefeitura não encontrada." }, { status: 404 });

  const bruto = new URL(request.url).searchParams.get("periodo");
  const periodo: Periodo = bruto === "30dias" || bruto === "mes" ? bruto : "ano";
  const valor = await carregarValor(sessao.prefeituraId, periodo);
  const buffer = await renderToBuffer(
    RelatorioValorPDF({
      prefeitura: { nome: prefeitura.nome, municipio: prefeitura.municipio, estado: prefeitura.estado },
      periodo: ROTULO_PERIODO[periodo],
      valor,
      geradoEm: new Date().toISOString(),
    })
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="o-que-o-cidadeia-fez-${prefeitura.municipio.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
