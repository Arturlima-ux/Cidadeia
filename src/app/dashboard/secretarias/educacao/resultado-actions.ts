"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { educacaoResultados, fundebEducacao, escolas } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { lerSessao, temAcessoSecretaria, ehGestor } from "@/lib/sessao";
import { auditar } from "@/lib/auditoria";
import { INDICADORES_RESULTADO, ETAPAS_RESULTADO } from "@/lib/resultado-educacao";

// ── DINHEIRO E RESULTADO ──
//
// Duas coisas que só a secretaria lança: o resultado que o INEP divulga
// (sem API pública, como tudo em educação) e o valor aluno/ano do FUNDEB,
// que é o que transforma a diferença de matrícula em reais.

async function exigirAcesso() {
  const sessao = await lerSessao();
  if (!sessao || !temAcessoSecretaria(sessao, "educacao")) return null;
  return sessao;
}

function podeGerirRede(sessao: { cargo: string; secretaria?: string | null }): boolean {
  return ehGestor(sessao) || (sessao.cargo === "secretario" && sessao.secretaria === "educacao");
}

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

const INDICADORES = INDICADORES_RESULTADO.map((i) => i.chave) as [string, ...string[]];
const ETAPAS = ETAPAS_RESULTADO.map((e) => e.chave) as [string, ...string[]];

const schemaResultado = z.object({
  escolaId: z.string().optional(),
  ano: z.coerce.number().int().min(2005).max(2100),
  etapa: z.enum(ETAPAS),
  indicador: z.enum(INDICADORES),
  valor: z.coerce.number().min(0).max(1000),
  meta: z.coerce.number().min(0).max(1000).optional(),
  observacao: z.string().trim().max(300).optional(),
});

/**
 * Lançar de novo o mesmo indicador, na mesma escola, etapa e ano corrige o
 * valor — é a correção que o gestor faz quando o INEP republica.
 */
export async function lancarResultado(formData: FormData): Promise<ResultadoAcao> {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirRede(sessao)) return { ok: false, erro: "Sem permissão." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração os dados são fictícios e não são alterados." };

  const parsed = schemaResultado.safeParse({
    escolaId: formData.get("escolaId") || undefined,
    ano: formData.get("ano"),
    etapa: formData.get("etapa"),
    indicador: formData.get("indicador"),
    valor: formData.get("valor"),
    meta: formData.get("meta") || undefined,
    observacao: formData.get("observacao") || undefined,
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  // Escala do IDEB é 0 a 10; os demais são percentuais. Recusar aqui evita
  // um "IDEB 62" que estraga a série e a comparação com a meta.
  const indicador = INDICADORES_RESULTADO.find((i) => i.chave === d.indicador)!;
  if (d.valor > indicador.maximo) {
    return { ok: false, erro: `${indicador.nome} vai de 0 a ${indicador.maximo}.` };
  }
  if (d.meta !== undefined && d.meta > indicador.maximo) {
    return { ok: false, erro: `A meta de ${indicador.nome} vai de 0 a ${indicador.maximo}.` };
  }

  let escolaId: string | null = null;
  if (d.escolaId) {
    const [escola] = await db
      .select({ id: escolas.id })
      .from(escolas)
      .where(and(eq(escolas.id, d.escolaId), eq(escolas.prefeituraId, sessao.prefeituraId)))
      .limit(1);
    if (!escola) return { ok: false, erro: "Escola não encontrada." };
    escolaId = escola.id;
  }

  const agora = new Date().toISOString();
  const mesmaLinha = and(
    eq(educacaoResultados.prefeituraId, sessao.prefeituraId),
    eq(educacaoResultados.ano, d.ano),
    eq(educacaoResultados.etapa, d.etapa as "creche" | "pre_escola" | "anos_iniciais" | "anos_finais"),
    eq(educacaoResultados.indicador, d.indicador as "ideb" | "distorcao" | "aprovacao" | "abandono"),
    escolaId === null ? isNull(educacaoResultados.escolaId) : eq(educacaoResultados.escolaId, escolaId)
  );

  const [existente] = await db.select({ id: educacaoResultados.id }).from(educacaoResultados).where(mesmaLinha).limit(1);

  const valores = {
    valor: d.valor,
    meta: d.meta ?? null,
    observacao: d.observacao ?? null,
    registradoPor: sessao.nome,
    atualizadoEm: agora,
  };

  if (existente) {
    await db.update(educacaoResultados).set(valores).where(eq(educacaoResultados.id, existente.id));
  } else {
    await db.insert(educacaoResultados).values({
      id: gerarId("edures"),
      prefeituraId: sessao.prefeituraId,
      escolaId,
      ano: d.ano,
      etapa: d.etapa as "creche" | "pre_escola" | "anos_iniciais" | "anos_finais",
      indicador: d.indicador as "ideb" | "distorcao" | "aprovacao" | "abandono",
      ...valores,
    });
  }

  await auditar(sessao, {
    acao: "alterar",
    entidade: "indicador",
    entidadeId: escolaId ?? undefined,
    resumo: `${indicador.nome} ${d.ano} (${d.etapa}) = ${d.valor}${d.meta !== undefined ? ` · meta ${d.meta}` : ""}`,
  });
  revalidatePath("/dashboard/secretarias/educacao/resultado");
  revalidatePath("/dashboard/secretarias/educacao");
  return { ok: true };
}

export async function removerResultado(id: string): Promise<ResultadoAcao> {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirRede(sessao)) return { ok: false, erro: "Sem permissão." };
  const [r] = await db
    .select({ id: educacaoResultados.id, indicador: educacaoResultados.indicador, ano: educacaoResultados.ano })
    .from(educacaoResultados)
    .where(and(eq(educacaoResultados.id, id), eq(educacaoResultados.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!r) return { ok: false, erro: "Lançamento não encontrado." };
  await db.delete(educacaoResultados).where(eq(educacaoResultados.id, r.id));
  await auditar(sessao, { acao: "excluir", entidade: "indicador", entidadeId: r.id, resumo: `${r.indicador} de ${r.ano} removido` });
  revalidatePath("/dashboard/secretarias/educacao/resultado");
  return { ok: true };
}

const schemaFundeb = z.object({
  ano: z.coerce.number().int().min(2007).max(2100),
  valorAlunoAno: z.coerce.number().positive("Informe o valor aluno/ano.").max(1_000_000),
  observacao: z.string().trim().max(300).optional(),
});

/** Uma linha por ano; lançar de novo corrige o valor. */
export async function registrarValorAlunoAno(formData: FormData): Promise<ResultadoAcao> {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirRede(sessao)) return { ok: false, erro: "Sem permissão." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração os dados são fictícios e não são alterados." };

  const parsed = schemaFundeb.safeParse({
    ano: formData.get("ano"),
    valorAlunoAno: formData.get("valorAlunoAno"),
    observacao: formData.get("observacao") || undefined,
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const agora = new Date().toISOString();

  const [existente] = await db
    .select({ id: fundebEducacao.id })
    .from(fundebEducacao)
    .where(and(eq(fundebEducacao.prefeituraId, sessao.prefeituraId), eq(fundebEducacao.ano, d.ano)))
    .limit(1);

  const valores = {
    valorAlunoAno: d.valorAlunoAno,
    observacao: d.observacao ?? null,
    registradoPor: sessao.nome,
    atualizadoEm: agora,
  };

  if (existente) {
    await db.update(fundebEducacao).set(valores).where(eq(fundebEducacao.id, existente.id));
  } else {
    await db.insert(fundebEducacao).values({
      id: gerarId("fundeb"),
      prefeituraId: sessao.prefeituraId,
      ano: d.ano,
      ...valores,
    });
  }

  await auditar(sessao, { acao: "alterar", entidade: "financeiro", resumo: `valor aluno/ano do FUNDEB ${d.ano}: ${d.valorAlunoAno}` });
  revalidatePath("/dashboard/secretarias/educacao/resultado");
  revalidatePath("/dashboard/secretarias/educacao");
  return { ok: true };
}

export async function buscarResultados(prefeituraId: string, ano: number) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId || sessao.cargo === "escola") return [];
  return db
    .select()
    .from(educacaoResultados)
    .where(and(eq(educacaoResultados.prefeituraId, prefeituraId), eq(educacaoResultados.ano, ano)));
}

export async function buscarValorAlunoAno(prefeituraId: string, ano: number) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId || sessao.cargo === "escola") return null;
  const [r] = await db
    .select()
    .from(fundebEducacao)
    .where(and(eq(fundebEducacao.prefeituraId, prefeituraId), eq(fundebEducacao.ano, ano)))
    .limit(1);
  return r ?? null;
}
