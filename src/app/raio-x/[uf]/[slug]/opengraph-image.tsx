import { notFound } from "next/navigation";
import { imagemDeCompartilhamento, TAMANHO_OG, TIPO_OG } from "@/lib/og-imagem";
import { municipioPorSlug } from "@/lib/slug-municipio";
import { ESTADOS } from "@/lib/estados";

// A imagem do link de cada município leva o nome dele. É o que faz o link
// compartilhado no WhatsApp da prefeitura parecer feito para aquela cidade.
export const alt = "Raio-X da prefeitura";
export const size = TAMANHO_OG;
export const contentType = TIPO_OG;

export default async function Imagem({ params }: { params: Promise<{ uf: string; slug: string }> }) {
  const { uf, slug } = await params;
  const sigla = uf.toUpperCase();
  const m = (ESTADOS as readonly string[]).includes(sigla) ? municipioPorSlug(sigla, slug) : null;
  if (!m) notFound();
  return imagemDeCompartilhamento({
    olho: "Raio-X · dado público do Tesouro",
    titulo: `Prefeitura de ${m.nome}`,
    linha: `${m.uf} · ${new Intl.NumberFormat("pt-BR").format(m.populacao ?? 0)} habitantes · receita, saúde, educação e relatórios obrigatórios`,
  });
}
