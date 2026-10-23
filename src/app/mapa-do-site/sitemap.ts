import type { MetadataRoute } from "next";
import { ID_PAGINAS, idsDoMapa, paginasDoEstado, paginasFixas } from "@/lib/mapa-do-site";

// Um arquivo por estado mais um das páginas fixas. Ver lib/mapa-do-site.ts.
export async function generateSitemaps() {
  return idsDoMapa().map((id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  return id === ID_PAGINAS ? paginasFixas() : paginasDoEstado(id);
}
