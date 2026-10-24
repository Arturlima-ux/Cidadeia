import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditoria, contratos, obras, prefeituras } from "@/db/schema";
import { temAcessoSecretaria, type SessaoPayload } from "@/lib/sessao";
import { exigirPlano } from "@/lib/exigir-plano";
import { dataHoraNumerica, fusoDoEstado } from "@/lib/horario";
import { lerObra, type ContratoDeObra, type LeituraObra } from "@/lib/obra-prazo";
import {
  ACAO_APROVAR_NOTIFICACAO,
  ENTIDADE_NOTIFICACAO,
  ehAprovacaoDeNotificacao,
  montarNotificacao,
  motivoDaNotificacao,
  situacaoDaNotificacao,
  type AprovacaoNotificacao,
  type ContratoDaObra,
  type ObraParaNotificacao,
  type PacoteNotificacao,
  type SituacaoNotificacao,
} from "@/lib/notificacao-obra";
import { nomeDoCargo } from "@/lib/renovacao-contrato";

// ── A NOTIFICAÇÃO, LIDA DO BANCO ──
//
// Uma porta só para a tela, o download e a aprovação, com a guarda aqui
// dentro (mesmo motivo de lib/renovacao-servidor.ts: rota de API e server
// action não passam pelo proxy de /dashboard).

/** Quem pode montar e aprovar: a pasta de Obras, nunca gerência de unidade ou escola. */
export function podeNotificarObra(sessao: Pick<SessaoPayload, "cargo" | "secretaria">): boolean {
  if (sessao.cargo === "unidade" || sessao.cargo === "escola") return false;
  return temAcessoSecretaria(sessao, "obras");
}

export type Notificacao = {
  obra: ObraParaNotificacao & { status: string };
  contrato: ContratoDaObra | null;
  prefeitura: { municipio: string; estado: string };
  leitura: LeituraObra;
  /** Null quando a obra não pede notificação (em dia, concluída, sem prazo). */
  pacote: PacoteNotificacao | null;
  aprovacao: SituacaoNotificacao;
};

export type LeituraNotificacao =
  | { ok: true; notificacao: Notificacao }
  | { ok: false; motivo: "sem_acesso" | "nao_encontrado" | "erro"; mensagem: string };

/** As aprovações de notificação registradas, de uma obra ou de todas. */
export async function aprovacoesDeNotificacao(
  prefeituraId: string,
  obraId?: string
): Promise<(AprovacaoNotificacao & { obraId: string })[]> {
  const filtro = [
    eq(auditoria.prefeituraId, prefeituraId),
    eq(auditoria.entidade, ENTIDADE_NOTIFICACAO),
    eq(auditoria.acao, ACAO_APROVAR_NOTIFICACAO),
  ];
  if (obraId) filtro.push(eq(auditoria.entidadeId, obraId));
  const linhas = await db
    .select({
      obraId: auditoria.entidadeId,
      usuarioNome: auditoria.usuarioNome,
      usuarioCargo: auditoria.usuarioCargo,
      createdAt: auditoria.createdAt,
      resumo: auditoria.resumo,
    })
    .from(auditoria)
    .where(and(...filtro))
    .orderBy(desc(auditoria.createdAt));
  return linhas.filter((l): l is typeof l & { obraId: string } => !!l.obraId && ehAprovacaoDeNotificacao(l.resumo));
}

const COLUNAS_OBRA = {
  id: obras.id,
  nome: obras.nome,
  bairro: obras.bairro,
  progressoAtual: obras.progressoAtual,
  atualizadoEm: obras.atualizadoEm,
  vigenciaInicio: obras.vigenciaInicio,
  vigenciaFim: obras.vigenciaFim,
  valorContrato: obras.valorContrato,
  fornecedorNome: obras.fornecedorNome,
  status: obras.status,
  numeroControlePncpContrato: obras.numeroControlePncpContrato,
};

const COLUNAS_CONTRATO = {
  numeroControlePncp: contratos.numeroControlePncp,
  numeroContrato: contratos.numeroContrato,
  processo: contratos.processo,
  objeto: contratos.objeto,
  fornecedorNome: contratos.fornecedorNome,
  fornecedorDocumento: contratos.fornecedorDocumento,
  fornecedorTipoPessoa: contratos.fornecedorTipoPessoa,
  valorGlobal: contratos.valorGlobal,
};

/** A mesma leitura de prazo do painel (app/dashboard/secretarias/obras/page.tsx). */
function paraLeitura(obra: ObraParaNotificacao): ContratoDeObra {
  return {
    id: obra.id,
    objeto: obra.nome,
    fornecedorNome: obra.fornecedorNome,
    valorInicial: obra.valorContrato,
    valorGlobal: obra.valorContrato,
    vigenciaInicio: obra.vigenciaInicio,
    vigenciaFim: obra.vigenciaFim,
    progressoInformado: obra.progressoAtual,
    progressoAtualizadoEm: obra.atualizadoEm,
  };
}

export type EstadoNaLista = { estado: "rascunho" | "aprovado" | "desatualizado"; texto: string };

/**
 * O que o painel de Obras diz sobre a notificação de cada obra que a pede.
 *
 * Lê os contratos direto, e não por buscarContratos(): aquela exige acesso a
 * Licitações, e o secretário de Obras veria o texto montado sem o contrato —
 * outra impressão, e a aprovação apareceria como desatualizada sem ter mudado
 * nada.
 */
export async function estadosDasNotificacoes(sessao: SessaoPayload, hoje: Date = new Date()): Promise<Map<string, EstadoNaLista>> {
  const mapa = new Map<string, EstadoNaLista>();
  if (!podeNotificarObra(sessao)) return mapa;
  try {
    if (!(await exigirPlano(sessao.prefeituraId, "obras")).ok) return mapa;
    const lista = await db.select(COLUNAS_OBRA).from(obras).where(eq(obras.prefeituraId, sessao.prefeituraId));
    const pedem = lista
      .map((o) => ({ o, motivo: o.status === "concluida" ? null : motivoDaNotificacao(lerObra(paraLeitura(o), hoje).situacao) }))
      .filter((x): x is { o: (typeof lista)[number]; motivo: NonNullable<typeof x.motivo> } => x.motivo !== null);
    if (!pedem.length) return mapa;

    const [pref] = await db
      .select({ municipio: prefeituras.municipio, estado: prefeituras.estado })
      .from(prefeituras)
      .where(eq(prefeituras.id, sessao.prefeituraId))
      .limit(1);
    if (!pref) return mapa;
    const fuso = fusoDoEstado(pref.estado);

    const chaves = pedem.map((x) => x.o.numeroControlePncpContrato).filter((c): c is string => !!c);
    const contratosDasObras = chaves.length
      ? await db
          .select(COLUNAS_CONTRATO)
          .from(contratos)
          .where(and(eq(contratos.prefeituraId, sessao.prefeituraId), inArray(contratos.numeroControlePncp, chaves)))
      : [];
    const porChave = new Map(contratosDasObras.map((c) => [c.numeroControlePncp, c]));

    const aprovacoes = await aprovacoesDeNotificacao(sessao.prefeituraId);
    for (const { o, motivo } of pedem) {
      const contrato = o.numeroControlePncpContrato ? (porChave.get(o.numeroControlePncpContrato) ?? null) : null;
      const pacote = montarNotificacao(motivo, o, contrato, pref, fuso);
      const s = situacaoDaNotificacao(
        aprovacoes.filter((a) => a.obraId === o.id),
        pacote
      );
      mapa.set(
        o.id,
        s.tipo === "aprovado"
          ? {
              estado: "aprovado",
              texto: `Notificação aprovada por ${s.aprovacao.usuarioNome} (${nomeDoCargo(s.aprovacao.usuarioCargo)}) em ${dataHoraNumerica(s.aprovacao.createdAt, fuso)}`,
            }
          : s.tipo === "desatualizado"
            ? { estado: "desatualizado", texto: "A obra mudou depois da aprovação da notificação: conferir de novo" }
            : { estado: "rascunho", texto: "Notificação à contratada montada, aguardando conferência" }
      );
    }
  } catch (e) {
    console.error("[notificacao-obra] estados:", (e as Error).name);
  }
  return mapa;
}

export async function lerNotificacao(
  sessao: SessaoPayload,
  obraId: string,
  hoje: Date = new Date()
): Promise<LeituraNotificacao> {
  if (!podeNotificarObra(sessao)) {
    return { ok: false, motivo: "sem_acesso", mensagem: "Seu acesso não inclui a pasta de Obras." };
  }
  const plano = await exigirPlano(sessao.prefeituraId, "obras");
  if (!plano.ok) return { ok: false, motivo: "sem_acesso", mensagem: plano.erro };

  try {
    // O filtro da prefeitura vem da sessão: o id sozinho vem do navegador.
    const [obra] = await db
      .select(COLUNAS_OBRA)
      .from(obras)
      .where(and(eq(obras.id, obraId), eq(obras.prefeituraId, sessao.prefeituraId)))
      .limit(1);
    if (!obra) return { ok: false, motivo: "nao_encontrado", mensagem: "Obra não encontrada neste município." };

    const [pref] = await db
      .select({ municipio: prefeituras.municipio, estado: prefeituras.estado })
      .from(prefeituras)
      .where(eq(prefeituras.id, sessao.prefeituraId))
      .limit(1);
    if (!pref) return { ok: false, motivo: "nao_encontrado", mensagem: "Prefeitura não encontrada." };

    let contrato: ContratoDaObra | null = null;
    if (obra.numeroControlePncpContrato) {
      const [c] = await db
        .select(COLUNAS_CONTRATO)
        .from(contratos)
        .where(
          and(eq(contratos.prefeituraId, sessao.prefeituraId), eq(contratos.numeroControlePncp, obra.numeroControlePncpContrato))
        )
        .limit(1);
      contrato = c ?? null;
    }

    const leitura = lerObra(paraLeitura(obra), hoje);
    // Obra concluída não se notifica, mesmo que o cadastro diga outra coisa do prazo.
    const motivo = obra.status === "concluida" ? null : motivoDaNotificacao(leitura.situacao);
    const pacote = motivo ? montarNotificacao(motivo, obra, contrato, pref, fusoDoEstado(pref.estado)) : null;
    const aprovacoes = pacote ? await aprovacoesDeNotificacao(sessao.prefeituraId, obraId) : [];

    return {
      ok: true,
      notificacao: {
        obra,
        contrato,
        prefeitura: pref,
        leitura,
        pacote,
        aprovacao: pacote ? situacaoDaNotificacao(aprovacoes, pacote) : { tipo: "rascunho" },
      },
    };
  } catch (e) {
    console.error("[notificacao-obra] leitura:", (e as Error).name);
    return { ok: false, motivo: "erro", mensagem: "Não foi possível ler a obra agora. Tente de novo em alguns minutos." };
  }
}
