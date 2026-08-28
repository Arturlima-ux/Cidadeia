"use server";

import { lerSessao } from "@/lib/sessao";
import { limitarUso } from "@/lib/rate-limit";
import { perguntarIA, type MensagemChat } from "@/lib/ia";

const MAX_PERGUNTA_CARACTERES = 2000;
const MAX_HISTORICO_MENSAGENS = 40;

export async function enviarPerguntaIA(
  historico: MensagemChat[],
  pergunta: string
) {
  const sessao = await lerSessao();
  if (!sessao) {
    return { ok: false as const, erro: "Sessão expirada. Faça login novamente." };
  }
  if (!pergunta.trim()) {
    return { ok: false as const, erro: "Digite uma pergunta." };
  }
  if (pergunta.length > MAX_PERGUNTA_CARACTERES) {
    return { ok: false as const, erro: "Pergunta muito longa — resuma em até 2000 caracteres." };
  }
  if (historico.length > MAX_HISTORICO_MENSAGENS) {
    return { ok: false as const, erro: "Conversa muito longa — inicie uma nova conversa." };
  }

  const podeUsar = await limitarUso(`ia-chat:${sessao.usuarioId}`, 30, 10);
  if (!podeUsar) {
    return {
      ok: false as const,
      erro: "Muitas perguntas em pouco tempo — aguarde alguns minutos e tente de novo.",
    };
  }

  return perguntarIA(sessao.prefeituraId, historico, pergunta.trim(), {
    cargo: sessao.cargo,
    secretaria: sessao.secretaria,
  });
}
