import { NextResponse } from "next/server";
import { documentoPorChave, type Documento, type Bloco } from "@/lib/kit-contratacao";

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

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function blocoHtml(bloco: Bloco): string {
  if (bloco.tipo === "paragrafo") return `<p>${escapar(bloco.texto)}</p>`;
  if (bloco.tipo === "lista") {
    return `<ul>${bloco.itens.map((i) => `<li>${escapar(i)}</li>`).join("")}</ul>`;
  }
  const cabecalho = bloco.cabecalho.map((c) => `<th>${escapar(c)}</th>`).join("");
  const corpo = bloco.linhas
    .map((linha) => `<tr>${linha.map((c) => `<td>${escapar(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody></table>`;
}

function paraWord(documento: Documento): string {
  const corpo = documento.clausulas
    .map((c) => `<h2>${escapar(c.titulo)}</h2>${c.blocos.map(blocoHtml).join("")}`)
    .join("");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<title>${escapar(documento.nome)}</title>
<style>
  body { font-family: "Calibri", "Segoe UI", sans-serif; font-size: 11pt; line-height: 1.5; color: #12203a; }
  h1 { font-size: 16pt; margin-bottom: 2pt; }
  .subtitulo { color: #55637a; font-size: 10pt; margin-top: 0; }
  h2 { font-size: 12pt; margin-top: 16pt; margin-bottom: 4pt; }
  ul { margin-top: 4pt; }
  li { margin-bottom: 4pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th, td { border: 1px solid #c9d2e0; padding: 5pt 7pt; text-align: left; vertical-align: top; font-size: 10pt; }
  th { background: #eef3fa; }
</style>
</head>
<body>
<h1>${escapar(documento.nome)}</h1>
<p class="subtitulo">${escapar(documento.subtitulo)}</p>
${corpo}
</body>
</html>`;
}

function paraTexto(documento: Documento): string {
  const linhas: string[] = [documento.nome.toUpperCase(), documento.subtitulo, ""];
  for (const clausula of documento.clausulas) {
    linhas.push(clausula.titulo, "");
    for (const bloco of clausula.blocos) {
      if (bloco.tipo === "paragrafo") linhas.push(bloco.texto, "");
      else if (bloco.tipo === "lista") {
        linhas.push(...bloco.itens.map((i) => `  - ${i}`), "");
      } else {
        linhas.push(bloco.cabecalho.join(" | "));
        linhas.push(...bloco.linhas.map((l) => l.join(" | ")), "");
      }
    }
  }
  return linhas.join("\r\n");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documento: string }> }
) {
  const { documento: chave } = await params;
  const documento = documentoPorChave(chave);

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
