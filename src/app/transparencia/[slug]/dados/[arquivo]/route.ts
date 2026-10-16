import { NextResponse } from "next/server";
import { buscarPortal } from "@/app/transparencia/actions";
import { modoDoPortal } from "@/lib/endereco-publico";
import { carregarPortal } from "@/lib/portal-servidor";
import { fontesDoExemplo, frescorDoExemplo } from "@/lib/portal-exemplo";
import { definicaoDe, linhasDe, paraCsv, paraJson, type Fontes, type Frescor, type Conjunto } from "@/lib/dados-abertos";
import { linkApp } from "@/lib/url-app";

// ── OS ARQUIVOS DE DADOS ABERTOS ──
// /transparencia/<cidade>/dados/obras.csv, .../compras.json e assim por
// diante: endereço fixo, para planilha e para sistema (lib/dados-abertos.ts).
// Público como o próprio portal, e só com o que o portal já mostra.

export async function GET(_: Request, { params }: { params: Promise<{ slug: string; arquivo: string }> }) {
  const { slug, arquivo } = await params;
  const m = /^([a-z-]+)\.(csv|json)$/.exec(arquivo);
  const def = m ? definicaoDe(m[1]) : null;
  if (!m || !def) return NextResponse.json({ erro: "Conjunto não encontrado." }, { status: 404 });
  const formato = m[2] as "csv" | "json";

  let municipio: string;
  let fontes: Fontes;
  let frescor: Partial<Record<Conjunto, Frescor>>;
  if (slug === "exemplo") {
    municipio = "Bela Aurora (cidade de exemplo)";
    fontes = fontesDoExemplo(Date.now());
    frescor = frescorDoExemplo(Date.now());
  } else {
    const portal = await buscarPortal(slug);
    if (!portal || modoDoPortal(portal.planosContratados) === "minimo") {
      return NextResponse.json({ erro: "Portal não encontrado." }, { status: 404 });
    }
    const d = await carregarPortal(portal);
    municipio = `${portal.municipio}/${portal.estado}`;
    fontes = d.fontes;
    frescor = d.frescor;
  }

  const linhas = linhasDe(def.chave, fontes);
  const nome = `${slug}-${def.chave}.${formato}`;
  const corpo =
    formato === "csv"
      ? paraCsv(def.colunas, linhas)
      : paraJson(def, linhas, { municipio, frescor: frescor[def.chave] ?? null, endereco: linkApp(`/transparencia/${slug}/dados/${arquivo}`) });
  return new NextResponse(corpo, {
    headers: {
      "Content-Type": formato === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `${formato === "csv" ? "attachment" : "inline"}; filename="${nome}"`,
      // Dado público, de qualquer lugar: outro site ou sistema pode ler.
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}
