import { notFound } from "next/navigation";
import { imagemDeCompartilhamento, TAMANHO_OG, TIPO_OG } from "@/lib/og-imagem";
import { ESTADOS, NOME_DOS_ESTADOS, doEstado, type Estado } from "@/lib/estados";
import { retratoDaUf } from "@/lib/raio-x-uf";

export const alt = "Raio-X das prefeituras do estado";
export const size = TAMANHO_OG;
export const contentType = TIPO_OG;

export default async function Imagem({ params }: { params: Promise<{ uf: string }> }) {
  const sigla = (await params).uf.toUpperCase();
  if (!(ESTADOS as readonly string[]).includes(sigla)) notFound();
  const uf = sigla as Estado;
  const r = retratoDaUf(uf);
  return imagemDeCompartilhamento({
    olho: `Raio-X · ${NOME_DOS_ESTADOS[uf]}`,
    titulo: `As ${r.total} prefeituras ${doEstado(uf)}`,
    linha: `${new Intl.NumberFormat("pt-BR").format(r.populacao)} habitantes · o que cada uma publicou no Tesouro Nacional`,
  });
}
