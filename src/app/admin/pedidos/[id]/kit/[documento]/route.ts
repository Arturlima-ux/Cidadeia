import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidosProposta, usuarios } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";
import { ehAdmin } from "@/lib/pedidos";
import { documentoPorChave, documentoPreenchido, type Documento, type Bloco } from "@/lib/kit-contratacao";
import { documentoDoPedido } from "@/lib/kit-do-pedido";
import { empresaDoAmbiente } from "@/lib/proposta-comercial";

// ── O KIT JÁ NO NOME DO MUNICÍPIO ──
//
// /kit publica os modelos em branco, e é assim que tem de ser: é página
// pública e serve a quem quer ver antes de conversar.
//
// Aqui é diferente. Existe um pedido, com município, módulos e valor
// calculado. Mandar a minuta em branco quando se sabe o valor é dar trabalho
// ao jurídico da prefeitura à toa — e cada ida e volta no jurídico é uma
// semana no processo.
//
// Só a equipe gera (ADMIN_EMAILS), como a proposta em PDF.

export const dynamic = "force-dynamic";

function escapar(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function blocoHtml(b: Bloco): string {
  if (b.tipo === "paragrafo") return `<p>${escapar(b.texto)}</p>`;
  if (b.tipo === "lista") return `<ul>${b.itens.map((i) => `<li>${escapar(i)}</li>`).join("")}</ul>`;
  return (
    `<table border="1" cellspacing="0" cellpadding="6"><tr>` +
    b.cabecalho.map((c) => `<th>${escapar(c)}</th>`).join("") +
    `</tr>` +
    b.linhas.map((l) => `<tr>${l.map((c) => `<td>${escapar(c)}</td>`).join("")}</tr>`).join("") +
    `</table>`
  );
}

function paraWord(d: Documento): string {
  const corpo = d.clausulas
    .map((c) => `<h2>${escapar(c.titulo)}</h2>${c.blocos.map(blocoHtml).join("")}`)
    .join("");
  return (
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" ` +
    `xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="utf-8"><title>${escapar(d.nome)}</title></head><body>` +
    `<h1>${escapar(d.nome)}</h1><p><i>${escapar(d.subtitulo)}</i></p>${corpo}</body></html>`
  );
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string; documento: string }> }
) {
  const sessao = await lerSessao();
  if (!sessao || sessao.demo) return NextResponse.redirect(new URL("/login", req.url));
  const [u] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, sessao.usuarioId))
    .limit(1);
  // 404 e não 403: quem não é da equipe não precisa saber que esta rota existe.
  if (!ehAdmin(u?.email)) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const { id, documento: chave } = await ctx.params;
  if (!/^prop_[A-Za-z0-9_-]{4,64}$/.test(id)) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const [pedido] = await db
    .select()
    .from(pedidosProposta)
    .where(eq(pedidosProposta.id, id))
    .limit(1);
  if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });

  const cru = documentoPorChave(chave);
  if (!cru) return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });
  if (!cru.geramos) {
    return NextResponse.json(
      { erro: `${cru.nome} não é um documento que geramos. ${cru.origem ?? ""}`.trim() },
      { status: 409 }
    );
  }

  // Duas camadas, nesta ordem: primeiro os compromissos de serviço, que valem
  // para qualquer município; depois o que é deste pedido.
  const documento = documentoDoPedido(
    documentoPreenchido(cru),
    { municipio: pedido.municipio, uf: pedido.uf, mensal: pedido.mensal },
    empresaDoAmbiente()
  );

  const slug = pedido.municipio
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .toLowerCase();

  return new NextResponse(paraWord(documento), {
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${documento.chave}-${slug}.doc"`,
      "Cache-Control": "no-store",
    },
  });
}
