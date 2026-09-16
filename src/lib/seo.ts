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

export const URL_BASE = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";

export const NOME_DO_SITE = "CidadeIA";

/**
 * Bloco de compartilhamento para uma página. `caminho` é relativo ("/precos"),
 * e vira também o canônico. `imagem` só é passada quando a página tem uma
 * própria; do contrário o Next usa o opengraph-image mais próximo na árvore.
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
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
    },
  };
}
