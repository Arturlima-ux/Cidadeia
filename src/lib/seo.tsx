import type { Metadata } from "next";

// ── COMO O SITE SE APRESENTA QUANDO ALGUÉM COMPARTILHA O LINK ──
//
// Numa prefeitura, link circula por WhatsApp: o vereador manda para o
// contador, o secretário manda para o prefeito. Sem as tags abaixo, o que
// chega é o endereço cru — sem título, sem descrição, sem imagem —, e link
// pelado em grupo de trabalho parece golpe. O site tinha 5.598 páginas
// feitas para serem compartilhadas e nenhuma se apresentava.
//
// A imagem é gerada pelo próprio site (opengraph-image.tsx), com o nome do
// município quando existe. Nada de arquivo estático para manter à mão.
//
// ── POR QUE A IMAGEM PADRÃO É DECLARADA AQUI ──
// Quando a página define o próprio `openGraph`, o Next deixa de herdar a
// imagem do layout raiz: /solucoes e /modulos/* saíram sem cartão. Por isso
// o padrão vai explícito. Segmentos com opengraph-image.tsx próprio
// (município, estado) sobrescrevem — arquivo do segmento vence.

export const URL_BASE = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";

export const NOME_DO_SITE = "CidadeIA";

const IMAGEM_PADRAO = { url: "/opengraph-image", width: 1200, height: 630, alt: "CidadeIA — gestão municipal com dado público" };

/**
 * Bloco de compartilhamento para uma página. `caminho` é relativo ("/solucoes"),
 * e vira também o canônico. O título vai sem sufixo: o layout raiz aplica
 * "— CidadeIA" pelo template.
 */
export function compartilhamento({
  titulo,
  descricao,
  caminho,
}: {
  titulo: string;
  descricao: string;
  caminho: string;
}): Metadata {
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: {
      type: "website",
      siteName: NOME_DO_SITE,
      locale: "pt_BR",
      url: caminho,
      title: titulo,
      description: descricao,
      images: [IMAGEM_PADRAO],
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      images: [IMAGEM_PADRAO.url],
    },
  };
}

// ── DADOS ESTRUTURADOS (JSON-LD) ──
// O que o Google lê para montar resultado rico: quem é a organização, o
// que é o software, o caminho (breadcrumb) e, na página de município, o
// órgão público de que ela fala. Sem isso a busca mostra só título e
// descrição.

type JsonLd = Record<string, unknown>;

export function ldOrganizacao(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: NOME_DO_SITE,
    url: URL_BASE,
    logo: `${URL_BASE}/opengraph-image`,
    description: "Sistema de gestão municipal por módulos, com o dado que a prefeitura já publicou no Tesouro Nacional.",
    areaServed: { "@type": "Country", name: "Brasil" },
    contactPoint: [{ "@type": "ContactPoint", contactType: "sales", email: "arturmlo2005@gmail.com", availableLanguage: "pt-BR" }],
  };
}

export function ldSoftware(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: NOME_DO_SITE,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${URL_BASE}/solucoes`,
    description: "Protocolo, ouvidoria, transparência e painéis por secretaria para prefeituras, contratados por módulo.",
    offers: { "@type": "Offer", priceCurrency: "BRL", availability: "https://schema.org/InStock", description: "Valor por módulo e por faixa de habitantes, informado em proposta." },
    provider: { "@type": "Organization", name: NOME_DO_SITE, url: URL_BASE },
  };
}

export function ldBreadcrumb(itens: { nome: string; caminho: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.nome,
      item: `${URL_BASE}${it.caminho}`,
    })),
  };
}

export function ldPrefeitura(m: { nome: string; uf: string; populacao: number | null; caminho: string }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    name: `Prefeitura Municipal de ${m.nome}`,
    address: { "@type": "PostalAddress", addressLocality: m.nome, addressRegion: m.uf, addressCountry: "BR" },
    url: `${URL_BASE}${m.caminho}`,
    ...(m.populacao ? { description: `${new Intl.NumberFormat("pt-BR").format(m.populacao)} habitantes pela estimativa do IBGE.` } : {}),
  };
}

/** O <script> que carrega o JSON-LD. Conteúdo é gerado por nós, nunca entrada de usuário. */
export function JsonLdScript({ dados }: { dados: JsonLd | JsonLd[] }) {
  const lista = Array.isArray(dados) ? dados : [dados];
  return (
    <script
      type="application/ld+json"
      // `<` vira < para o JSON não fechar a tag por acidente.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(lista.length === 1 ? lista[0] : lista).replace(/</g, "\\u003c") }}
    />
  );
}
