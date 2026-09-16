import { imagemDeCompartilhamento, TAMANHO_OG, TIPO_OG } from "@/lib/og-imagem";

// Imagem padrão do site: vale para toda página que não tiver a sua.
export const alt = "CidadeIA — gestão municipal com dado público";
export const size = TAMANHO_OG;
export const contentType = TIPO_OG;

export default async function Imagem() {
  return imagemDeCompartilhamento({
    olho: "Gestão municipal",
    titulo: "O que a prefeitura já publicou, lido para quem decide",
    linha: "Protocolo, ouvidoria, transparência, saúde, educação, obras e licitações — com a base legal de cada número.",
  });
}
