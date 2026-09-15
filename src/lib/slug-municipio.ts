// ── ENDEREÇO DE CADA MUNICÍPIO NO SITE ──
//
// /raio-x/pi/barro-duro. O slug sai do nome oficial do IBGE: sem acento,
// minúsculas, hífen no lugar de tudo que não é letra ou número. "Santa
// Bárbara d'Oeste" vira "santa-barbara-d-oeste". Determinístico nos dois
// sentidos: do nome sai o slug, e do slug + UF se acha o município na
// tabela — sem guardar nada.

import { municipiosDaUf, type Municipio } from "@/lib/municipios";

export function slugDeMunicipio(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function municipioPorSlug(uf: string, slug: string): Municipio | null {
  const alvo = slug.toLowerCase();
  return municipiosDaUf(uf).find((m) => slugDeMunicipio(m.nome) === alvo) ?? null;
}

export function caminhoDoRaioX(m: { uf: string; nome: string }): string {
  return `/raio-x/${m.uf.toLowerCase()}/${slugDeMunicipio(m.nome)}`;
}
