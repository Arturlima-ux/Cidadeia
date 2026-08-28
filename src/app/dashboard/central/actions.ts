"use server";

import { lerSessao } from "@/lib/sessao";
import { temPlano } from "@/lib/planos";
import { buscarPrefeitura } from "@/lib/dados-prefeitura";
import { obterCentralInteligente, type RespostaCentral } from "@/lib/central-inteligente";
import { limitarUso } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

export async function carregarCentralInteligente(forcar = false): Promise<RespostaCentral> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Não autenticado." };
  if (sessao.cargo === "secretario") {
    return { ok: false, erro: "Disponível só para o prefeito e administradores." };
  }

  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  if (!temPlano(prefeitura?.planosContratados, "gestao")) {
    return { ok: false, erro: "A Central Inteligente faz parte do plano Gestão." };
  }

  if (forcar) {
    const podeUsar = await limitarUso(`central:${sessao.usuarioId}`, 10, 60);
    if (!podeUsar) {
      return { ok: false, erro: "Muitas atualizações manuais em pouco tempo — aguarde um pouco." };
    }
  }

  const resultado = await obterCentralInteligente(sessao.prefeituraId, forcar);
  if (forcar) revalidatePath("/dashboard/central");
  return resultado;
}
