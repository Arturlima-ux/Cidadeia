import { NextRequest, NextResponse } from "next/server";
import { lerSessao } from "@/lib/sessao";
import { lerRenovacao } from "@/lib/renovacao-servidor";
import { carimboDoPacote, type CaminhoRenovacao } from "@/lib/renovacao-contrato";
import { paraTexto, paraWord } from "@/lib/documento-word";
import { dataHoraNumerica, fusoDoEstado } from "@/lib/horario";

// Um documento do pacote de renovação, para abrir no Word.
//
//   GET /api/licitacoes/renovacao/<contrato>?caminho=licitar&documento=dfd
//   GET …&formato=txt → texto puro
//
// O arquivo leva no topo o carimbo do estado do texto: rascunho ou aprovado,
// por quem e quando. Um .doc circula sem a tela em volta.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await lerSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const busca = req.nextUrl.searchParams;
  const caminho = busca.get("caminho");
  if (caminho !== "prorrogar" && caminho !== "licitar") {
    return NextResponse.json({ erro: "Caminho inválido." }, { status: 400 });
  }

  const leitura = await lerRenovacao(sessao, id);
  if (!leitura.ok) {
    const status = leitura.motivo === "sem_acesso" ? 403 : leitura.motivo === "nao_encontrado" ? 404 : 503;
    return NextResponse.json({ erro: leitura.mensagem }, { status });
  }
  const { renovacao } = leitura;
  const opcao = renovacao.diagnostico.opcoes.find((o) => o.caminho === caminho);
  if (!opcao?.disponivel) {
    return NextResponse.json({ erro: opcao?.observacao ?? "Caminho indisponível." }, { status: 409 });
  }

  const pacote = renovacao.pacotes[caminho as CaminhoRenovacao];
  const documento = pacote.documentos.find((d) => d.chave === busca.get("documento"));
  if (!documento) return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });

  const fuso = fusoDoEstado(renovacao.prefeitura.estado);
  const carimbo = carimboDoPacote(renovacao.aprovacao, pacote, (iso) => dataHoraNumerica(iso, fuso));
  const formato = busca.get("formato") === "txt" ? "txt" : "doc";
  const conteudo = formato === "txt" ? paraTexto(documento, carimbo) : paraWord(documento, carimbo);
  const numero = (renovacao.contrato.numeroContrato ?? "contrato").replace(/[^0-9A-Za-z-]+/g, "-");

  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": formato === "txt" ? "text/plain; charset=utf-8" : "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${documento.chave}-${numero}.${formato}"`,
      "Cache-Control": "no-store",
    },
  });
}
