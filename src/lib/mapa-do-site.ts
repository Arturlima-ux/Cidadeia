import type { MetadataRoute } from "next";
import { todosOsMunicipios } from "@/lib/municipios";
import { caminhoDoRaioX } from "@/lib/slug-municipio";
import { PLANOS_ADDON } from "@/lib/planos";
import { ESTADOS } from "@/lib/estados";
import { PANORAMA } from "@/lib/panorama";
import { NOTICIAS } from "@/lib/noticias";
import { URL_BASE } from "@/lib/seo";

// ── O MAPA DO SITE, UM ARQUIVO POR ESTADO ──
//
// Era um arquivo só com 5.651 endereços e nenhuma data. Dividido, o Search
// Console mostra a indexação estado por estado (quantas páginas do Piauí
// entraram, quantas do Paraná), e cada endereço diz quando o dado mudou.
//
// /sitemap.xml é o índice (app/sitemap.xml/route.ts); os arquivos ficam em
// /mapa-do-site/sitemap/<id>.xml (app/mapa-do-site/sitemap.ts).
//
// ── AS DATAS ──
// Só onde se sabe: páginas de município, de estado e o Panorama mudam com a
// conferência semanal do RGF (PANORAMA.geradoEm); Notícias, com a notícia
// mais recente; a Disponibilidade, todo dia. Página institucional fica sem
// data — data inventada ensina o Google a ignorar todas.
//
// ── FORA DO MAPA ──
// Brasília: o DF não tem prefeitura (lib/fontes-oficiais.ts), e a página
// mostra um município de exemplo. A página do DF no Raio-X também sai.

export const ID_PAGINAS = "paginas";
const SEM_PREFEITURA = "DF";

export const UFS_DO_MAPA = ESTADOS.filter((uf) => uf !== SEM_PREFEITURA).map((uf) => uf.toLowerCase());

export function idsDoMapa(): string[] {
  return [ID_PAGINAS, ...UFS_DO_MAPA];
}

const semanal = new Date(`${PANORAMA.geradoEm}T12:00:00-03:00`);
const ultimaNoticia = new Date(
  `${[...NOTICIAS].map((n) => n.data).sort().at(-1) ?? PANORAMA.geradoEm}T12:00:00-03:00`
);

export function paginasFixas(hoje: Date = new Date()): MetadataRoute.Sitemap {
  const u = (c: string) => `${URL_BASE}${c}`;
  return [
    { url: u("/"), changeFrequency: "weekly", priority: 1 },
    { url: u("/solucoes"), changeFrequency: "monthly", priority: 0.9 },
    { url: u("/raio-x"), changeFrequency: "monthly", priority: 0.9 },
    { url: u("/panorama"), lastModified: semanal, changeFrequency: "weekly", priority: 0.8 },
    ...PLANOS_ADDON.map((p) => ({ url: u(`/modulos/${p.chave}`), changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: u("/para/prefeito"), changeFrequency: "monthly", priority: 0.8 },
    { url: u("/para/financas"), changeFrequency: "monthly", priority: 0.8 },
    { url: u("/para/controle"), changeFrequency: "monthly", priority: 0.8 },
    { url: u("/como-contratar"), changeFrequency: "monthly", priority: 0.7 },
    { url: u("/conformidade"), changeFrequency: "monthly", priority: 0.7 },
    { url: u("/quem-somos"), changeFrequency: "monthly", priority: 0.7 },
    { url: u("/kit"), changeFrequency: "monthly", priority: 0.6 },
    { url: u("/faq"), changeFrequency: "monthly", priority: 0.6 },
    { url: u("/noticias"), lastModified: ultimaNoticia, changeFrequency: "weekly", priority: 0.6 },
    { url: u("/governanca"), changeFrequency: "monthly", priority: 0.5 },
    { url: u("/fale-conosco"), changeFrequency: "yearly", priority: 0.5 },
    { url: u("/transparencia"), changeFrequency: "weekly", priority: 0.5 },
    { url: u("/disponibilidade"), lastModified: hoje, changeFrequency: "daily", priority: 0.5 },
    { url: u("/seguranca"), changeFrequency: "yearly", priority: 0.4 },
    { url: u("/acessibilidade"), changeFrequency: "yearly", priority: 0.4 },
    { url: u("/carreiras"), changeFrequency: "monthly", priority: 0.3 },
    { url: u("/proposta/acompanhar"), changeFrequency: "yearly", priority: 0.3 },
    { url: u("/privacidade"), changeFrequency: "yearly", priority: 0.2 },
    { url: u("/termos"), changeFrequency: "yearly", priority: 0.2 },
  ];
}

/** O estado e todas as prefeituras dele. */
export function paginasDoEstado(uf: string): MetadataRoute.Sitemap {
  const sigla = uf.toUpperCase();
  const municipios = todosOsMunicipios().filter((m) => m.uf === sigla);
  return [
    { url: `${URL_BASE}/raio-x/${uf}`, lastModified: semanal, changeFrequency: "weekly", priority: 0.8 },
    { url: `${URL_BASE}/panorama/${uf}`, lastModified: semanal, changeFrequency: "weekly", priority: 0.7 },
    ...municipios.map((m) => ({
      url: `${URL_BASE}${caminhoDoRaioX(m)}`,
      lastModified: semanal,
      changeFrequency: "weekly" as const,
      // Cidade maior, mais procurada: leve prioridade a mais.
      priority: (m.populacao ?? 0) > 50_000 ? 0.7 : 0.5,
    })),
  ];
}
