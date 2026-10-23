import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditoria, contratos, prefeituras } from "@/db/schema";
import { temAcessoSecretaria, type SessaoPayload } from "@/lib/sessao";
import { exigirPlano } from "@/lib/exigir-plano";
import {
  ACAO_APROVAR,
  ENTIDADE_RENOVACAO,
  contratoSucessor,
  diagnosticar,
  historicoDoObjeto,
  montarPacote,
  situacaoDaAprovacao,
  type Aprovacao,
  type ContratoDoHistorico,
  type ContratoParaRenovacao,
  type DiagnosticoRenovacao,
  type PacoteRenovacao,
  type PrefeituraParaRenovacao,
  type SituacaoAprovacao,
} from "@/lib/renovacao-contrato";

// ── A RENOVAÇÃO, LIDA DO BANCO ──
//
// Uma porta só para a tela, o download e a aprovação. A guarda de acesso mora
// aqui, e não em quem chama, pelo motivo já registrado em
// contratos-actions.ts: rota de API e server action não passam pelo proxy de
// /dashboard, e uma guarda que depende de cada chamador lembrar é guarda que
// some.

/** Quem pode ver e aprovar: a pasta de Licitações, nunca gerência de unidade ou escola. */
export function podeMontarRenovacao(sessao: Pick<SessaoPayload, "cargo" | "secretaria">): boolean {
  if (sessao.cargo === "unidade" || sessao.cargo === "escola") return false;
  return temAcessoSecretaria(sessao, "licitacoes");
}

export type Renovacao = {
  contrato: ContratoParaRenovacao;
  prefeitura: PrefeituraParaRenovacao;
  historico: ContratoDoHistorico[];
  /** Contrato posterior que já cobre o mesmo objeto — quando há, não há o que renovar. */
  sucessor: ContratoDoHistorico | null;
  diagnostico: DiagnosticoRenovacao;
  pacotes: Record<"prorrogar" | "licitar", PacoteRenovacao>;
  aprovacao: SituacaoAprovacao;
};

export type LeituraRenovacao =
  | { ok: true; renovacao: Renovacao }
  | { ok: false; motivo: "sem_acesso" | "nao_encontrado" | "erro"; mensagem: string };

const COLUNAS = {
  id: contratos.id,
  objeto: contratos.objeto,
  numeroContrato: contratos.numeroContrato,
  processo: contratos.processo,
  fornecedorNome: contratos.fornecedorNome,
  fornecedorDocumento: contratos.fornecedorDocumento,
  fornecedorTipoPessoa: contratos.fornecedorTipoPessoa,
  valorInicial: contratos.valorInicial,
  valorGlobal: contratos.valorGlobal,
  dataAssinatura: contratos.dataAssinatura,
  vigenciaInicio: contratos.vigenciaInicio,
  vigenciaFim: contratos.vigenciaFim,
  categoria: contratos.categoria,
  frutoAdesao: contratos.frutoAdesao,
};

/** As aprovações de renovação já registradas, de um contrato ou de todos. */
export async function aprovacoesDeRenovacao(prefeituraId: string, contratoId?: string): Promise<(Aprovacao & { contratoId: string })[]> {
  const filtro = [
    eq(auditoria.prefeituraId, prefeituraId),
    eq(auditoria.entidade, ENTIDADE_RENOVACAO),
    eq(auditoria.acao, ACAO_APROVAR),
  ];
  if (contratoId) filtro.push(eq(auditoria.entidadeId, contratoId));
  const linhas = await db
    .select({
      contratoId: auditoria.entidadeId,
      usuarioNome: auditoria.usuarioNome,
      usuarioCargo: auditoria.usuarioCargo,
      createdAt: auditoria.createdAt,
      resumo: auditoria.resumo,
    })
    .from(auditoria)
    .where(and(...filtro))
    .orderBy(desc(auditoria.createdAt));
  return linhas.filter((l): l is typeof l & { contratoId: string } => !!l.contratoId);
}

export async function lerRenovacao(
  sessao: SessaoPayload,
  contratoId: string,
  hoje: Date = new Date()
): Promise<LeituraRenovacao> {
  if (!podeMontarRenovacao(sessao)) {
    return { ok: false, motivo: "sem_acesso", mensagem: "Seu acesso não inclui a pasta de Licitações." };
  }
  const plano = await exigirPlano(sessao.prefeituraId, "licitacoes");
  if (!plano.ok) return { ok: false, motivo: "sem_acesso", mensagem: plano.erro };

  try {
    const todos = await db.select(COLUNAS).from(contratos).where(eq(contratos.prefeituraId, sessao.prefeituraId));
    const contrato = todos.find((c) => c.id === contratoId);
    if (!contrato) return { ok: false, motivo: "nao_encontrado", mensagem: "Contrato não encontrado neste município." };

    const [pref] = await db
      .select({ municipio: prefeituras.municipio, estado: prefeituras.estado, cnpj: prefeituras.cnpj, prefeito: prefeituras.prefeito })
      .from(prefeituras)
      .where(eq(prefeituras.id, sessao.prefeituraId))
      .limit(1);
    if (!pref) return { ok: false, motivo: "nao_encontrado", mensagem: "Prefeitura não encontrada." };

    const historico = historicoDoObjeto(contrato, todos);
    const pacotes = {
      prorrogar: montarPacote("prorrogar", contrato, pref, historico),
      licitar: montarPacote("licitar", contrato, pref, historico),
    };
    const aprovacoes = await aprovacoesDeRenovacao(sessao.prefeituraId, contratoId);

    return {
      ok: true,
      renovacao: {
        contrato,
        prefeitura: pref,
        historico,
        sucessor: contratoSucessor(contrato, todos),
        diagnostico: diagnosticar(contrato, hoje),
        pacotes,
        aprovacao: situacaoDaAprovacao(aprovacoes, [pacotes.prorrogar, pacotes.licitar]),
      },
    };
  } catch (e) {
    // Banco fora vira mensagem na tela, não página quebrada; o erro vai para o
    // log sem dado do contrato.
    console.error("[renovacao] leitura:", (e as Error).name);
    return { ok: false, motivo: "erro", mensagem: "Não foi possível ler o contrato agora. Tente de novo em alguns minutos." };
  }
}
