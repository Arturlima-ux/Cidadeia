"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auditoria } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { lerSessao } from "@/lib/sessao";
import { limparResumo } from "@/lib/auditoria";
import { limitarUso } from "@/lib/rate-limit";
import { lerRenovacao } from "@/lib/renovacao-servidor";
import { ACAO_APROVAR, ENTIDADE_RENOVACAO, resumoDaAprovacao, type CaminhoRenovacao } from "@/lib/renovacao-contrato";

export type ResultadoAprovacao = { ok: true } | { ok: false; erro: string };

/**
 * Registra que uma pessoa conferiu o rascunho e o aprovou para instruir o
 * processo.
 *
 * ── O QUE APROVAR NÃO FAZ ──
 *
 * Não envia o ofício, não assina o aditivo, não publica nada. A aprovação é a
 * linha na trilha que responde "quem conferiu isto, quando, e qual texto" —
 * assinar continua sendo no processo, por quem a lei manda.
 *
 * ── POR QUE A IMPRESSÃO VEM DA TELA ──
 *
 * A pessoa aprova o texto que LEU. Se o contrato foi reimportado entre abrir
 * a tela e clicar, o texto de agora não é o lido; aprovar mesmo assim
 * registraria aprovação de algo que ninguém viu. Então a impressão que a tela
 * mostrou tem de bater com a de agora.
 *
 * ── POR QUE NÃO USA auditar() ──
 *
 * auditar() engole a falha de propósito: trilha que impede o trabalho é trilha
 * que alguém desliga. Aqui a trilha É o trabalho — uma aprovação que não foi
 * gravada não pode aparecer como feita.
 */
export async function aprovarRenovacao(
  contratoId: string,
  caminho: CaminhoRenovacao,
  impressao: string
): Promise<ResultadoAprovacao> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração nada é gravado." };
  if (caminho !== "prorrogar" && caminho !== "licitar") return { ok: false, erro: "Caminho inválido." };
  if (typeof contratoId !== "string" || typeof impressao !== "string") return { ok: false, erro: "Pedido inválido." };

  if (!(await limitarUso(`renovacao:${sessao.usuarioId}`, 20, 10))) {
    return { ok: false, erro: "Muitas aprovações seguidas. Aguarde alguns minutos." };
  }

  const leitura = await lerRenovacao(sessao, contratoId);
  if (!leitura.ok) return { ok: false, erro: leitura.mensagem };
  const { renovacao } = leitura;

  const opcao = renovacao.diagnostico.opcoes.find((o) => o.caminho === caminho);
  if (!opcao?.disponivel) return { ok: false, erro: opcao?.observacao ?? "Este caminho não está disponível para este contrato." };

  const pacote = renovacao.pacotes[caminho];
  if (pacote.impressao !== impressao) {
    return {
      ok: false,
      erro: "O contrato mudou depois que a tela foi aberta, e o texto também. Recarregue a página e confira de novo antes de aprovar.",
    };
  }

  try {
    await db.insert(auditoria).values({
      id: gerarId("aud"),
      prefeituraId: sessao.prefeituraId,
      usuarioId: sessao.usuarioId,
      usuarioNome: sessao.nome,
      usuarioCargo: sessao.cargo,
      acao: ACAO_APROVAR,
      entidade: ENTIDADE_RENOVACAO,
      entidadeId: contratoId,
      resumo: limparResumo(resumoDaAprovacao(renovacao.contrato, pacote)),
    });
  } catch (e) {
    console.error("[renovacao] aprovação:", (e as Error).name);
    return { ok: false, erro: "A aprovação não foi gravada. Nada mudou; tente de novo em alguns minutos." };
  }

  revalidatePath(`/dashboard/secretarias/licitacoes/contratos/${contratoId}`);
  revalidatePath("/dashboard/secretarias/licitacoes");
  return { ok: true };
}
