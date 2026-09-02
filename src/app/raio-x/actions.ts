"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { limitarUso } from "@/lib/rate-limit";
import { montarRaioX, type ResultadoRaioX } from "@/lib/raio-x";
import { ESTADOS } from "@/lib/estados";


const schema = z.object({
  municipio: z.string().trim().min(2, "Informe o nome do município.").max(80),
  uf: z.enum(ESTADOS, { message: "Selecione o estado." }),
});

/**
 * Consulta pública, sem login.
 *
 * O limite é por IP porque a página é aberta: sem ele, uma pessoa recarregando
 * levaria as consultas do Tesouro ao teto e a página passaria a errar para
 * todo mundo. A API do SICONFI é gratuita e mantida com dinheiro público —
 * proteger a infraestrutura dela é obrigação de quem consome.
 */
export async function consultarRaioX(formData: FormData): Promise<ResultadoRaioX> {
  const parsed = schema.safeParse({
    municipio: formData.get("municipio"),
    uf: formData.get("uf"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      erro: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      municipioNaoEncontrado: false,
    };
  }

  const cabecalhos = await headers();
  const ip =
    cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    cabecalhos.get("x-real-ip") ||
    "desconhecido";

  const podeUsar = await limitarUso(`raiox:${ip}`, 10, 10);
  if (!podeUsar) {
    return {
      ok: false,
      erro:
        "Muitas consultas seguidas deste endereço. Aguarde alguns minutos — a base do Tesouro é pública e não deve ser sobrecarregada.",
      municipioNaoEncontrado: false,
    };
  }

  return montarRaioX(parsed.data.municipio, parsed.data.uf);
}
