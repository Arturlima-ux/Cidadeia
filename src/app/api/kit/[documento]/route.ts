import { NextResponse } from "next/server";
import { documentoPorChave, documentoPreenchido } from "@/lib/kit-contratacao";
import { paraTexto, paraWord } from "@/lib/documento-word";

// Baixa um documento do kit de contratação.
//
//   GET /api/kit/termo-de-referencia            → .doc (abre no Word)
//   GET /api/kit/termo-de-referencia?formato=txt → texto puro
//
// Público de propósito: exigir cadastro para ver a minuta de contrato é
// atrito na etapa em que a prefeitura só quer levar o papel para o jurídico.
//
// O formato .doc é HTML servido com o tipo MIME do Word. Word e LibreOffice
// abrem e permitem editar normalmente, e isso evita trazer uma biblioteca de
// .docx só para gerar seis arquivos de texto corrido.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documento: string }> }
) {
  const { documento: chave } = await params;
  const cru = documentoPorChave(chave);
  // O arquivo que a prefeitura baixa leva os compromissos já decididos; o que
  // ninguém decidiu continua entre colchetes, para o jurídico ver que falta.
  const documento = cru ? documentoPreenchido(cru) : null;

  if (!documento) {
    return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });
  }
  if (!documento.geramos) {
    return NextResponse.json(
      { erro: `${documento.nome} não é um documento que geramos. ${documento.origem ?? ""}`.trim() },
      { status: 409 }
    );
  }

  const formato = new URL(request.url).searchParams.get("formato") === "txt" ? "txt" : "doc";
  const conteudo = formato === "txt" ? paraTexto(documento) : paraWord(documento);

  return new NextResponse(conteudo, {
    headers: {
      "Content-Type":
        formato === "txt" ? "text/plain; charset=utf-8" : "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="cidadeia-${documento.chave}.${formato}"`,
      "Cache-Control": "no-store",
    },
  });
}
