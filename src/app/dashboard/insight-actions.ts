"use server";

import { db } from "@/db";
import { insightsCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { limitarUso } from "@/lib/rate-limit";
import { gerarInsightModulo, type ModuloInsight, type RespostaIA } from "@/lib/ia";

/**
 * Quanto tempo um insight vale antes de ser gerado de novo.
 *
 * Existe porque o componente InsightIA dispara no `useEffect` — ou seja,
 * TODA visita à página fazia uma chamada paga à API, mesmo abrindo a mesma
 * tela dez vezes seguidas sem nenhum dado ter mudado. Com o cache, a
 * segunda visita dentro da janela não custa nada.
 */
const HORAS_VALIDADE = 6;

/** Ação compartilhada por todas as páginas de módulo (geral + 4 secretarias). */
export async function gerarInsightIA(
  modulo: ModuloInsight,
  forcar = false
): Promise<RespostaIA> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Não autenticado." };
  if (modulo !== "geral" && !temAcessoSecretaria(sessao, modulo)) {
    return { ok: false, erro: "Sem permissão para esta secretaria." };
  }

  const chave = `${sessao.prefeituraId}:${modulo}`;

  if (!forcar) {
    try {
      const [linha] = await db
        .select()
        .from(insightsCache)
        .where(eq(insightsCache.chave, chave))
        .limit(1);

      if (linha) {
        const horas = (Date.now() - new Date(linha.geradoEm).getTime()) / 3600000;
        if (horas < HORAS_VALIDADE) {
          return { ok: true, texto: linha.texto };
        }
      }
    } catch (e) {
      // Cache indisponível não pode impedir o insight — segue e gera.
      console.error("[Insight] falha ao ler cache:", e);
    }
  }

  // Só chega aqui se o cache expirou ou o usuário pediu atualização — é o
  // único caminho que gasta chamada de API, então é o único com rate limit.
  const podeUsar = await limitarUso(`ia-insight:${sessao.usuarioId}`, 20, 10);
  if (!podeUsar) {
    return { ok: false, erro: "Muitas solicitações em pouco tempo — aguarde alguns minutos." };
  }

  const resultado = await gerarInsightModulo(sessao.prefeituraId, modulo, {
    cargo: sessao.cargo,
    secretaria: sessao.secretaria,
  });

  if (resultado.ok) {
    try {
      await db
        .insert(insightsCache)
        .values({
          chave,
          prefeituraId: sessao.prefeituraId,
          modulo,
          texto: resultado.texto,
          geradoEm: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: insightsCache.chave,
          set: { texto: resultado.texto, geradoEm: new Date().toISOString() },
        });
    } catch (e) {
      console.error("[Insight] falha ao gravar cache:", e);
    }
  }

  return resultado;
}
