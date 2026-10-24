"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auditoria } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { lerSessao } from "@/lib/sessao";
import { limparResumo } from "@/lib/auditoria";
import { limitarUso } from "@/lib/rate-limit";
import { lerNotificacao } from "@/lib/notificacao-servidor";
import {
  ACAO_APROVAR_NOTIFICACAO,
  ENTIDADE_NOTIFICACAO,
  resumoDaAprovacaoNotificacao,
} from "@/lib/notificacao-obra";

export type ResultadoAprovacaoNotificacao = { ok: true } | { ok: false; erro: string };

/**
 * Registra que uma pessoa conferiu a notificação e a aprovou para envio.
 *
 * Não envia nem registra "mora do contratado": a mora só se decide depois da
 * resposta da empresa (lib/notificacao-obra.ts). A impressão vem da tela pelo
 * mesmo motivo da renovação: aprova-se o texto que foi LIDO. E a gravação não
 * usa auditar(), que engole falha: aqui a linha de auditoria é o trabalho.
 */
export async function aprovarNotificacaoObra(obraId: string, impressao: string): Promise<ResultadoAprovacaoNotificacao> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração nada é gravado." };
  if (typeof obraId !== "string" || typeof impressao !== "string") return { ok: false, erro: "Pedido inválido." };

  if (!(await limitarUso(`notificacao-obra:${sessao.usuarioId}`, 20, 10))) {
    return { ok: false, erro: "Muitas aprovações seguidas. Aguarde alguns minutos." };
  }

  const leitura = await lerNotificacao(sessao, obraId);
  if (!leitura.ok) return { ok: false, erro: leitura.mensagem };
  const { notificacao } = leitura;
  if (!notificacao.pacote) {
    return { ok: false, erro: "Esta obra não pede notificação agora: está dentro do prazo ou já foi concluída." };
  }
  if (notificacao.pacote.impressao !== impressao) {
    return {
      ok: false,
      erro: "A obra mudou depois que a tela foi aberta, e o texto também. Recarregue a página e confira de novo antes de aprovar.",
    };
  }

  try {
    await db.insert(auditoria).values({
      id: gerarId("aud"),
      prefeituraId: sessao.prefeituraId,
      usuarioId: sessao.usuarioId,
      usuarioNome: sessao.nome,
      usuarioCargo: sessao.cargo,
      acao: ACAO_APROVAR_NOTIFICACAO,
      entidade: ENTIDADE_NOTIFICACAO,
      entidadeId: obraId,
      resumo: limparResumo(
        resumoDaAprovacaoNotificacao(notificacao.obra.nome, notificacao.contrato?.numeroContrato ?? null, notificacao.pacote.impressao)
      ),
    });
  } catch (e) {
    console.error("[notificacao-obra] aprovação:", (e as Error).name);
    return { ok: false, erro: "A aprovação não foi gravada. Nada mudou; tente de novo em alguns minutos." };
  }

  revalidatePath(`/dashboard/secretarias/obras/${obraId}/notificacao`);
  revalidatePath("/dashboard/secretarias/obras");
  return { ok: true };
}
