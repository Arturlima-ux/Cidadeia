import type { MetadataRoute } from "next";
import { todosOsMunicipios } from "@/lib/municipios";
import { caminhoDoRaioX } from "@/lib/slug-municipio";
import { PLANOS_ADDON } from "@/lib/planos";
import { ESTADOS } from "@/lib/estados";

// ── O MAPA DO SITE, COM OS 5.571 MUNICÍPIOS ──
// Sem sitemap, o Google só descobre as páginas de município seguindo
// links — e há 5.571 delas. Aqui elas ficam listadas de uma vez, ao lado
// das páginas fixas. Nada de painel, demo ou API: são de quem entra, não
// de quem procura.

const BASE = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const fixas: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/solucoes`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/raio-x`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/diagnostico`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/como-contratar`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/conformidade`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/kit`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/proposta/acompanhar`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/sobre`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/acessibilidade`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/por-que-cidadeia`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/transparencia`, changeFrequency: "weekly", priority: 0.5 },
    ...PLANOS_ADDON.map((p) => ({
      url: `${BASE}/modulos/${p.chave}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];

  const estados: MetadataRoute.Sitemap = ESTADOS.map((uf) => ({
    url: `${BASE}/raio-x/${uf.toLowerCase()}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const municipios: MetadataRoute.Sitemap = todosOsMunicipios().map((m) => ({
    url: `${BASE}${caminhoDoRaioX(m)}`,
    changeFrequency: "weekly",
    // Cidade maior, mais procurada — leve prioridade a mais.
    priority: (m.populacao ?? 0) > 50_000 ? 0.7 : 0.5,
  }));

  return [...fixas, ...estados, ...municipios];
}
