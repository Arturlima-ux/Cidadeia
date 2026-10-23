import { compartilhamento } from "@/lib/seo";
import { guiaPor } from "@/lib/guias";

/** Metadados de um guia pelo slug (lib/guias.ts): título, descrição, canônica. */
export function metadadosDoGuia(slug: string) {
  const g = guiaPor(slug);
  if (!g) throw new Error(`Guia sem cadastro em lib/guias.ts: ${slug}`);
  return compartilhamento({ titulo: g.titulo, descricao: g.descricao, caminho: `/guias/${g.slug}` });
}
