"use server";

import { z } from "zod";
import { procurarMunicipio } from "@/lib/siconfi";
import { buscarPopulacao } from "@/lib/populacao-ibge";
import { porteDaPopulacao, type PorteMunicipio } from "@/lib/precos";

export type ResultadoPorte =
  | { ok: true; codigoIbge: string; municipio: string; uf: string; populacao: number; porte: PorteMunicipio }
  | { ok: false; erro: string };

const schema = z.object({
  municipio: z.string().trim().min(2).max(80),
  uf: z.string().trim().length(2),
});

/**
 * Nome do município + UF → população do IBGE → faixa de porte do simulador.
 *
 * Pública, sem sessão: roda na página de preços. Tudo local — a tabela do
 * IBGE vive no sistema —, então não há chamada externa a proteger.
 */
export async function sugerirPorte(entrada: { municipio: string; uf: string }): Promise<ResultadoPorte> {
  const parsed = schema.safeParse(entrada);
  if (!parsed.success) return { ok: false, erro: "Informe o município e a UF." };
  const { municipio, uf } = parsed.data;

  const busca = await procurarMunicipio(municipio, uf);
  if (!busca.ok) {
    const dica = busca.sugestoes.length ? ` Parecidos em ${uf.toUpperCase()}: ${busca.sugestoes.join(", ")}.` : "";
    return { ok: false, erro: `Não encontrei "${municipio}" em ${uf.toUpperCase()} na tabela do IBGE.${dica}` };
  }
  const codigo = busca.codigo;
  const populacao = await buscarPopulacao(codigo);
  if (populacao === null) {
    return { ok: false, erro: "Município sem população na tabela do IBGE. Escolha o porte à mão." };
  }
  return {
    ok: true,
    codigoIbge: codigo,
    municipio: busca.nome,
    uf: uf.toUpperCase(),
    populacao,
    porte: porteDaPopulacao(populacao),
  };
}
