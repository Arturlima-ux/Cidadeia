import { NextResponse } from "next/server";
import { ESTADOS, type Estado } from "@/lib/estados";
import { retratoDaUf } from "@/lib/raio-x-uf";
import { caminhoDoRaioX } from "@/lib/slug-municipio";

// ── A LISTA COMPLETA DE MUNICÍPIOS DE UM ESTADO, SOB DEMANDA ──
// A página do estado mostra os primeiros; o resto vem daqui quando a
// pessoa pede "ver todos" ou digita na busca. Minas Gerais tinha 964 KB de
// HTML com os 853 municípios; agora a página carrega leve e esta resposta
// (uns 60 KB) só vai para quem quer.
//
// Estática: a tabela do IBGE muda uma vez por ano. Cache longo.

export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET(_req: Request, ctx: { params: Promise<{ uf: string }> }) {
  const sigla = (await ctx.params).uf.toUpperCase();
  if (!(ESTADOS as readonly string[]).includes(sigla)) return NextResponse.json({ erro: "UF inválida." }, { status: 404 });
  const uf = sigla as Estado;
  const r = retratoDaUf(uf);
  return NextResponse.json(
    {
      uf,
      total: r.total,
      municipios: r.municipios.map((m) => ({
        codigo: m.codigo,
        nome: m.nome,
        populacao: m.populacao,
        faixa: r.porFaixa.find((f) => f.chave === m.porte)?.rotulo ?? m.porte,
        caminho: caminhoDoRaioX({ uf, nome: m.nome }),
      })),
    },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
