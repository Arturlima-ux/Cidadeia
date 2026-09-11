"use server";

import { z } from "zod";
import { buscarCodigoIbge } from "@/lib/siconfi";
import { buscarPopulacao } from "@/lib/populacao-ibge";
import { porteDaPopulacao, type PorteMunicipio } from "@/lib/precos";
import { limitarUso } from "@/lib/rate-limit";

export type ResultadoPorte =
  | { ok: true; municipio: string; uf: string; populacao: number; porte: PorteMunicipio }
  | { ok: false; erro: string };

const schema = z.object({
  municipio: z.string().trim().min(2).max(80),
  uf: z.string().trim().length(2),
});

/**
 * Nome do município + UF → população do IBGE → faixa de porte do simulador.
 *
 * Pública, sem sessão: roda na página de preços. Duas chamadas externas por
 * pedido, então tem limite por município — o mesmo mecanismo do login. Sem
 * isso, um laço de requisições viraria o site num proxy do IBGE.
 */
export async function sugerirPorte(entrada: { municipio: string; uf: string }): Promise<ResultadoPorte> {
  const parsed = schema.safeParse(entrada);
  if (!parsed.success) return { ok: false, erro: "Informe o município e a UF." };
  const { municipio, uf } = parsed.data;

  const chave = `porte:${uf.toUpperCase()}:${municipio.toLowerCase()}`;
  if (!(await limitarUso(chave, 10, 15))) {
    return { ok: false, erro: "Muitas consultas seguidas. Tente de novo em alguns minutos." };
  }

  const codigo = await buscarCodigoIbge(municipio, uf);
  if (!codigo) {
    return { ok: false, erro: `O IBGE não tem um município "${municipio}" em ${uf.toUpperCase()}.` };
  }
  const populacao = await buscarPopulacao(codigo);
  if (populacao === null) {
    return { ok: false, erro: "O IBGE não respondeu agora. Escolha o porte à mão." };
  }
  return { ok: true, municipio, uf: uf.toUpperCase(), populacao, porte: porteDaPopulacao(populacao) };
}
