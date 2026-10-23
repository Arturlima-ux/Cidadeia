import type { Metadata } from "next";
import { CONTATO_PUBLICO } from "@/lib/contato-comercial";
import { EMPRESA, type DadosEmpresa } from "@/lib/empresa";

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

// ── O QUE A PREFEITURA DIGITA NO GOOGLE ──
// "A gestão municipal inteira, num lugar só" é o slogan e fica no título da
// tela. Ninguém procura por ele; procura "sistema de gestão municipal".
// O título da aba e do resultado de busca leva o termo (auditoria de SEO,
// out/2026).
export const TITULO_DO_SITE = "CidadeIA: sistema de gestão municipal para prefeituras";
export const DESCRICAO_PADRAO =
  "Sistema de gestão municipal: ouvidoria, protocolo, portal do cidadão, obras, saúde, educação e LRF, com o dado público lido sozinho das bases oficiais.";

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
  imagemPropria = false,
}: {
  titulo: string;
  descricao: string;
  caminho: string;
  /** true quando o segmento tem opengraph-image.tsx: aí a imagem padrão
   *  NÃO é declarada, senão ela sobrescreve a do segmento. */
  imagemPropria?: boolean;
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
      ...(imagemPropria ? {} : { images: [IMAGEM_PADRAO] }),
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      ...(imagemPropria ? {} : { images: [IMAGEM_PADRAO.url] }),
    },
  };
}

// ── DADOS ESTRUTURADOS (JSON-LD) ──
// O que o Google lê para montar resultado rico: quem é a organização, o
// que é o software, o caminho (breadcrumb) e, na página de município, o
// órgão público de que ela fala. Sem isso a busca mostra só título e
// descrição.

type JsonLd = Record<string, unknown>;

export function ldOrganizacao(empresa: DadosEmpresa = EMPRESA): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${URL_BASE}/#organizacao`,
    name: NOME_DO_SITE,
    url: URL_BASE,
    // Quadrado, como o Google pede (era a imagem de compartilhamento, 1200×630).
    logo: { "@type": "ImageObject", url: `${URL_BASE}/icon`, width: 512, height: 512 },
    description: "Sistema de gestão municipal por módulos, com o dado que a prefeitura já publicou no Tesouro Nacional.",
    areaServed: { "@type": "Country", name: "Brasil" },
    contactPoint: [{ "@type": "ContactPoint", contactType: "sales", email: CONTATO_PUBLICO, availableLanguage: "pt-BR" }],
    // Só entram quando as variáveis EMPRESA_* estiverem preenchidas na Vercel:
    // nada de CNPJ inventado ou vazio no schema.
    ...(empresa.razaoSocial ? { legalName: empresa.razaoSocial } : {}),
    ...(empresa.cnpj ? { taxID: empresa.cnpj } : {}),
  };
}

/** Só na home: dá ao Google o nome do site para mostrar no resultado. */
export function ldSite(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${URL_BASE}/#site`,
    name: NOME_DO_SITE,
    alternateName: ["Cidade IA", "CidadeIA gestão municipal"],
    url: `${URL_BASE}/`,
    inLanguage: "pt-BR",
    publisher: { "@id": `${URL_BASE}/#organizacao` },
  };
}

// ── O PANORAMA COMO CONJUNTO DE DADOS ──
// Contagem original (quantas prefeituras passaram do alerta, do prudencial e
// do limite), refeita toda semana: é o que jornalista e assistente de IA
// citam. Dataset deixa isso explícito para o Google Dataset Search.
export function ldPanorama(m: {
  titulo: string;
  descricao: string;
  caminho: string;
  atualizadoEm: string;
  abrangencia: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: m.titulo,
    description: m.descricao,
    url: `${URL_BASE}${m.caminho}`,
    keywords: ["LRF", "despesa com pessoal", "RGF", "limite prudencial", "prefeituras", m.abrangencia],
    inLanguage: "pt-BR",
    isAccessibleForFree: true,
    dateModified: m.atualizadoEm,
    spatialCoverage: { "@type": "Place", name: m.abrangencia },
    isBasedOn: "https://apidatalake.tesouro.gov.br/docs/siconfi/",
    creator: { "@id": `${URL_BASE}/#organizacao` },
    publisher: { "@type": "Organization", name: NOME_DO_SITE, url: URL_BASE },
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

// ── O MUNICÍPIO COMO CONJUNTO DE DADOS, NÃO COMO PREFEITURA ──
// Antes era GovernmentOrganization "Prefeitura Municipal de X" com a URL do
// CidadeIA: dizia ao Google que o site da prefeitura era esta página, o que é
// falso e parecia que falávamos em nome dela. O que a página é de fato: os
// dados que a prefeitura declarou ao Tesouro, reunidos e datados. Isso é um
// Dataset, com o Tesouro como autor e o município como cobertura.
export function ldDadosDoMunicipio(m: {
  nome: string;
  uf: string;
  nomeDoEstado: string;
  codigoIbge: string;
  populacao: number | null;
  caminho: string;
  ano: number;
}): JsonLd {
  const pop = m.populacao ? `${new Intl.NumberFormat("pt-BR").format(m.populacao)} habitantes pela estimativa do IBGE. ` : "";
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Dados fiscais de ${m.nome} (${m.uf}) no Tesouro Nacional, ${m.ano}`,
    description:
      `Despesa com pessoal na régua da LRF, receita realizada, aplicação em saúde e em educação e situação de entrega do RREO e do RGF ` +
      `que a prefeitura de ${m.nome} declarou ao Tesouro Nacional (SICONFI) no exercício de ${m.ano}. ${pop}` +
      `Os percentuais sobre a receita são indício, não cálculo de mínimo constitucional.`,
    url: `${URL_BASE}${m.caminho}`,
    identifier: `IBGE ${m.codigoIbge}`,
    keywords: ["LRF", "despesa com pessoal", "RGF", "RREO", "SICONFI", m.nome, m.nomeDoEstado],
    inLanguage: "pt-BR",
    isAccessibleForFree: true,
    temporalCoverage: String(m.ano),
    spatialCoverage: {
      "@type": "Place",
      name: `${m.nome}, ${m.nomeDoEstado}, Brasil`,
      address: { "@type": "PostalAddress", addressLocality: m.nome, addressRegion: m.uf, addressCountry: "BR" },
    },
    creator: { "@type": "GovernmentOrganization", name: "Tesouro Nacional", url: "https://siconfi.tesouro.gov.br" },
    isBasedOn: "https://apidatalake.tesouro.gov.br/docs/siconfi/",
    publisher: { "@type": "Organization", name: NOME_DO_SITE, url: URL_BASE },
  };
}

/** Guia (app/guias): artigo assinado pela organização, com data de revisão. */
export function ldGuia(g: { titulo: string; descricao: string; caminho: string; revisadoEm: string }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.titulo,
    description: g.descricao,
    url: `${URL_BASE}${g.caminho}`,
    mainEntityOfPage: `${URL_BASE}${g.caminho}`,
    inLanguage: "pt-BR",
    datePublished: g.revisadoEm,
    dateModified: g.revisadoEm,
    image: `${URL_BASE}/opengraph-image`,
    author: { "@id": `${URL_BASE}/#organizacao` },
    publisher: { "@id": `${URL_BASE}/#organizacao` },
  };
}

/** /noticias: a lista, com cada notícia como BlogPosting datado. */
export function ldNoticias(itens: { titulo: string; resumo: string; data: string; ancora: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "O que mudou no CidadeIA",
    itemListElement: itens.map((n, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "BlogPosting",
        headline: n.titulo.length > 110 ? `${n.titulo.slice(0, 107)}...` : n.titulo,
        description: n.resumo,
        datePublished: n.data,
        url: `${URL_BASE}/noticias#${n.ancora}`,
        inLanguage: "pt-BR",
        author: { "@id": `${URL_BASE}/#organizacao` },
        publisher: { "@id": `${URL_BASE}/#organizacao` },
      },
    })),
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
