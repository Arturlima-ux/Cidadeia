"use server";

import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { limitarUso } from "@/lib/rate-limit";
import { gerarInsightModulo, type ModuloInsight, type RespostaIA } from "@/lib/ia";

/** Ação compartilhada por todas as páginas de módulo (geral + 4 secretarias). */
export async function gerarInsightIA(modulo: ModuloInsight): Promise<RespostaIA> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Não autenticado." };
  if (modulo !== "geral" && !temAcessoSecretaria(sessao, modulo)) {
    return { ok: false, erro: "Sem permissão para esta secretaria." };
  }

  const podeUsar = await limitarUso(`ia-insight:${sessao.usuarioId}`, 20, 10);
  if (!podeUsar) {
    return { ok: false, erro: "Muitas solicitações em pouco tempo — aguarde alguns minutos." };
  }

  return gerarInsightModulo(sessao.prefeituraId, modulo, {
    cargo: sessao.cargo,
    secretaria: sessao.secretaria,
  });
}
