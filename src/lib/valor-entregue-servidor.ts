import { and, count, countDistinct, eq, gte, inArray, isNotNull, like, or } from "drizzle-orm";
import { db } from "@/db";
import {
  alertas,
  atendimentos,
  auditoria,
  contratos,
  despesaPessoal,
  investimentos,
  licitacoes,
  obras,
  pedidoEventos,
  unidadesSaude,
} from "@/db/schema";
import { EVENTO_REGRA_ENCERRADA } from "@/lib/vigia-dos-modulos";
import type { StatusAtendimento, TipoAtendimento } from "@/lib/atendimento";
import { montarValor, type Resolucao, type Valor } from "@/lib/valor-entregue";

// ── A LEITURA DO "O QUE O CIDADEIA FEZ" ── (ver valor-entregue.ts)

export type Periodo = "ano" | "mes" | "30dias";

export const ROTULO_PERIODO: Record<Periodo, string> = { ano: "este ano", "30dias": "últimos 30 dias", mes: "mês passado" };

/** Início do período, como data pura (as colunas são texto "AAAA-MM-DD …"). */
export function inicioDoPeriodo(periodo: Periodo, hoje: Date = new Date()): string {
  if (periodo === "ano") return `${hoje.getUTCFullYear()}-01-01`;
  if (periodo === "mes") {
    // O mês ANTERIOR inteiro: é o do relatório mensal, enviado no dia 1º.
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
    return d.toISOString().slice(0, 10);
  }
  return new Date(hoje.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
}

/** Fim exclusivo do período ("mes" termina no dia 1º do mês corrente). */
export function fimDoPeriodo(periodo: Periodo, hoje: Date = new Date()): string | null {
  if (periodo !== "mes") return null;
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export async function carregarValor(prefeituraId: string, periodo: Periodo, hoje: Date = new Date()): Promise<Valor> {
  const desde = inicioDoPeriodo(periodo, hoje);
  const ate = fimDoPeriodo(periodo, hoje);
  const dentro = (t: string) => t >= desde && (ate === null || t < ate);
  const prefixos = or(like(pedidoEventos.pedidoId, `regra:${prefeituraId}:%`), like(pedidoEventos.pedidoId, `fiscal:${prefeituraId}:%`));

  const [eventos, abertos, fechadosAMao, manifestacoes, imp] = await Promise.all([
    db
      .select({ id: pedidoEventos.pedidoId, descricao: pedidoEventos.descricao, em: pedidoEventos.criadoEm })
      .from(pedidoEventos)
      .where(and(eq(pedidoEventos.tipo, EVENTO_REGRA_ENCERRADA), gte(pedidoEventos.criadoEm, desde), prefixos)),
    db
      .select({ id: alertas.id })
      .from(alertas)
      .where(and(eq(alertas.prefeituraId, prefeituraId), eq(alertas.resolvido, false))),
    // Alerta da vigia que a equipe fechou à mão: também é problema apontado e resolvido.
    db
      .select({ id: auditoria.entidadeId, em: auditoria.createdAt })
      .from(auditoria)
      .where(
        and(
          eq(auditoria.prefeituraId, prefeituraId),
          eq(auditoria.entidade, "alerta"),
          eq(auditoria.acao, "resolver"),
          gte(auditoria.createdAt, desde),
          or(like(auditoria.entidadeId, "regra:%"), like(auditoria.entidadeId, "fiscal:%"))
        )
      ),
    db
      .select({
        tipo: atendimentos.tipo,
        status: atendimentos.status,
        abertoEm: atendimentos.createdAt,
        respondidoEm: atendimentos.respondidoEm,
        prorrogado: atendimentos.prazoProrrogado,
      })
      .from(atendimentos)
      .where(and(eq(atendimentos.prefeituraId, prefeituraId), gte(atendimentos.createdAt, desde))),
    Promise.all([
      db.select({ n: count() }).from(contratos).where(and(eq(contratos.prefeituraId, prefeituraId), eq(contratos.origem, "pncp"), gte(contratos.createdAt, desde))),
      db.select({ n: count() }).from(licitacoes).where(and(eq(licitacoes.prefeituraId, prefeituraId), isNotNull(licitacoes.numeroControlePncp), gte(licitacoes.createdAt, desde))),
      db.select({ n: count() }).from(unidadesSaude).where(and(eq(unidadesSaude.prefeituraId, prefeituraId), eq(unidadesSaude.origem, "cnes"), gte(unidadesSaude.createdAt, desde))),
      db.select({ n: count() }).from(obras).where(and(eq(obras.prefeituraId, prefeituraId), eq(obras.origem, "pncp"), gte(obras.createdAt, desde))),
      db.select({ n: count() }).from(despesaPessoal).where(and(eq(despesaPessoal.prefeituraId, prefeituraId), eq(despesaPessoal.origem, "siconfi"), gte(despesaPessoal.atualizadoEm, desde))),
      db.select({ n: countDistinct(investimentos.competencia) }).from(investimentos).where(and(eq(investimentos.prefeituraId, prefeituraId), eq(investimentos.origem, "siconfi"), gte(investimentos.createdAt, desde))),
    ]),
  ]);

  const idsAbertos = new Set(abertos.map((a) => a.id));
  const porId = new Map<string, Resolucao>();

  for (const e of eventos) {
    if (!dentro(e.em) || idsAbertos.has(e.id)) continue;
    try {
      const d = JSON.parse(e.descricao) as { titulo?: string; secretaria?: string | null; prioridade?: Resolucao["prioridade"]; desde?: string; pelaVigia?: boolean };
      if (!d.pelaVigia || !d.titulo) continue;
      porId.set(e.id, { titulo: d.titulo, secretaria: d.secretaria ?? null, prioridade: d.prioridade ?? null, desde: d.desde ?? null, em: e.em, fiscal: e.id.startsWith("fiscal:") });
    } catch {
      // linha sem JSON: fica de fora
    }
  }

  const idsMao = fechadosAMao.filter((f) => f.id && dentro(f.em) && !idsAbertos.has(f.id) && !porId.has(f.id));
  if (idsMao.length) {
    const linhas = await db
      .select({ id: alertas.id, titulo: alertas.titulo, secretaria: alertas.secretaria, prioridade: alertas.prioridade, createdAt: alertas.createdAt })
      .from(alertas)
      .where(and(eq(alertas.prefeituraId, prefeituraId), inArray(alertas.id, idsMao.map((f) => f.id!))));
    const quando = new Map(idsMao.map((f) => [f.id!, f.em]));
    for (const l of linhas) {
      porId.set(l.id, { titulo: l.titulo, secretaria: l.secretaria, prioridade: l.prioridade, desde: l.createdAt, em: quando.get(l.id)!, fiscal: l.id.startsWith("fiscal:") });
    }
  }

  const [ctr, proc, und, obr, pes, rreo] = imp.map((r) => Number(r[0]?.n ?? 0));
  return montarValor({
    resolucoes: [...porId.values()],
    manifestacoes: manifestacoes
      .filter((m) => dentro(m.abertoEm))
      .map((m) => ({ ...m, tipo: m.tipo as TipoAtendimento, status: m.status as StatusAtendimento })),
    importados: { contratos: ctr, processos: proc, unidades: und, obras: obr, periodosFiscais: pes + rreo },
    hoje,
  });
}
