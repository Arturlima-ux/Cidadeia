import { NextResponse } from "next/server";
import { codigosNaOrdemDoMapa } from "@/lib/mapa-municipios-codigos";
import { municipioPorCodigo } from "@/lib/municipios";

// ── OS 5.571 MUNICÍPIOS, PARA A BUSCA DO MORADOR ──
//
// O morador digita o nome da cidade, sem escolher o estado antes; a busca
// roda no próprio celular, sobre esta lista. E o "Estou aqui" acha a cidade
// mais próxima pelo mapa: por isso a lista vem NA ORDEM DOS PONTOS do mapa
// (lib/mapa-municipios.ts), e o índice i aqui é o ponto i lá.
//
// Cerca de 50 KB comprimidos, baixados só quando a pessoa toca na busca.
// Estática: a tabela do IBGE muda uma vez por ano.

export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const lista = codigosNaOrdemDoMapa().map((codigo) => {
    const m = municipioPorCodigo(codigo);
    return [codigo, m?.nome ?? "", m?.uf ?? "", m?.populacao ?? 0] as const;
  });
  return NextResponse.json(lista, {
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
