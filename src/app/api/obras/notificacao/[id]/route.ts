import { NextRequest, NextResponse } from "next/server";
import { lerSessao } from "@/lib/sessao";
import { lerNotificacao } from "@/lib/notificacao-servidor";
import { carimboDaNotificacao } from "@/lib/notificacao-obra";
import { paraTexto, paraWord } from "@/lib/documento-word";
import { dataHoraNumerica, fusoDoEstado } from "@/lib/horario";

// Um documento da notificação da obra, para abrir no Word.
//
//   GET /api/obras/notificacao/<obra>?documento=notificacao-contratada
//   GET …&formato=txt → texto puro
//
// O arquivo leva no topo o carimbo do estado do texto (rascunho ou aprovado).
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await lerSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const busca = req.nextUrl.searchParams;

  const leitura = await lerNotificacao(sessao, id);
  if (!leitura.ok) {
    const status = leitura.motivo === "sem_acesso" ? 403 : leitura.motivo === "nao_encontrado" ? 404 : 503;
    return NextResponse.json({ erro: leitura.mensagem }, { status });
  }
  const { notificacao } = leitura;
  if (!notificacao.pacote) {
    return NextResponse.json({ erro: "Esta obra não pede notificação agora." }, { status: 409 });
  }
  const documento = notificacao.pacote.documentos.find((d) => d.chave === busca.get("documento"));
  if (!documento) return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });

  const fuso = fusoDoEstado(notificacao.prefeitura.estado);
  const carimbo = carimboDaNotificacao(notificacao.aprovacao, notificacao.pacote, (iso) => dataHoraNumerica(iso, fuso));
  const formato = busca.get("formato") === "txt" ? "txt" : "doc";
  const conteudo = formato === "txt" ? paraTexto(documento, carimbo) : paraWord(documento, carimbo);
  const numero = (notificacao.contrato?.numeroContrato ?? "obra").replace(/[^0-9A-Za-z-]+/g, "-");

  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": formato === "txt" ? "text/plain; charset=utf-8" : "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${documento.chave}-${numero}.${formato}"`,
      "Cache-Control": "no-store",
    },
  });
}
