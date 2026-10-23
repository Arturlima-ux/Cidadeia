import { idsDoMapa } from "@/lib/mapa-do-site";
import { URL_BASE } from "@/lib/seo";

// O índice: o mesmo endereço que o robots.txt e o Search Console já
// conhecem, agora apontando para um arquivo por estado.
export const dynamic = "force-static";

export function GET() {
  const itens = idsDoMapa()
    .map((id) => `  <sitemap><loc>${URL_BASE}/mapa-do-site/sitemap/${id}.xml</loc></sitemap>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${itens}\n</sitemapindex>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
