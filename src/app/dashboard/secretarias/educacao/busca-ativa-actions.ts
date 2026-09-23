"use server";

import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { buscaAtiva, escolas } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { lerSessao, temAcessoSecretaria, podeVerEscola } from "@/lib/sessao";
import { auditar } from "@/lib/auditoria";
import { SITUACOES_BUSCA } from "@/lib/busca-ativa";

// ── BUSCA ATIVA ESCOLAR ──
//
// A escola abre o caso; a secretaria vê a rede inteira. Cada etapa
// registrada é a prova do que foi tentado antes de acionar o Conselho
// Tutelar — que é o que o ECA, art. 56, II, chama de "esgotados os
// recursos escolares".

async function exigirAcesso() {
  const sessao = await lerSessao();
  if (!sessao || !temAcessoSecretaria(sessao, "educacao")) return null;
  return sessao;
}

export type ResultadoBusca = { ok: true } | { ok: false; erro: string };

const SITUACOES = SITUACOES_BUSCA.map((s) => s.chave) as [string, ...string[]];
const DATA = /^\d{4}-\d{2}-\d{2}$/;

const schemaCaso = z.object({
  escolaId: z.string().min(1),
  alunoNome: z.string().trim().min(3, "Informe o nome do aluno.").max(120),
  alunoTurma: z.string().trim().max(40).optional(),
  idade: z.coerce.number().int().min(3).max(25).optional(),
  faltas: z.coerce.number().int().min(0).max(1000),
  aulasPeriodo: z.coerce.number().int().min(1, "Informe quantas aulas o período teve.").max(1000),
  periodo: z.string().trim().min(3, "Informe o período (ex: 2º bimestre de 2026).").max(60),
  ultimaPresenca: z.string().regex(DATA, "Data inválida.").optional().or(z.literal("")),
  bolsaFamilia: z.boolean().default(false),
});

export async function abrirCasoBuscaAtiva(formData: FormData): Promise<ResultadoBusca> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };

  const parsed = schemaCaso.safeParse({
    escolaId: formData.get("escolaId"),
    alunoNome: formData.get("alunoNome"),
    alunoTurma: formData.get("alunoTurma") || undefined,
    idade: formData.get("idade") || undefined,
    faltas: formData.get("faltas"),
    aulasPeriodo: formData.get("aulasPeriodo"),
    periodo: formData.get("periodo"),
    ultimaPresenca: formData.get("ultimaPresenca") || "",
    bolsaFamilia: formData.get("bolsaFamilia") === "on",
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  if (!podeVerEscola(sessao, d.escolaId)) return { ok: false, erro: "Sem permissão para esta escola." };

  const [escola] = await db
    .select({ id: escolas.id, nome: escolas.nome })
    .from(escolas)
    .where(and(eq(escolas.id, d.escolaId), eq(escolas.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!escola) return { ok: false, erro: "Escola não encontrada." };

  await db.insert(buscaAtiva).values({
    id: gerarId("busca"),
    prefeituraId: sessao.prefeituraId,
    escolaId: escola.id,
    alunoNome: d.alunoNome,
    alunoTurma: d.alunoTurma ?? null,
    idade: d.idade ?? null,
    faltas: d.faltas,
    aulasPeriodo: d.aulasPeriodo,
    periodo: d.periodo,
    ultimaPresenca: d.ultimaPresenca || null,
    bolsaFamilia: d.bolsaFamilia,
    registradoPor: sessao.nome,
  });

  // O resumo da auditoria não repete o nome do aluno: a trilha registra
  // quem mexeu e onde, não expõe a criança de novo.
  await auditar(sessao, {
    acao: "criar",
    entidade: "escola",
    entidadeId: escola.id,
    resumo: `busca ativa aberta em "${escola.nome}" — ${d.faltas} falta(s) em ${d.aulasPeriodo} aula(s), ${d.periodo}`,
  });
  revalidatePath(`/dashboard/secretarias/educacao/escolas/${escola.id}`);
  revalidatePath("/dashboard/secretarias/educacao/busca-ativa");
  revalidatePath("/dashboard/secretarias/educacao");
  return { ok: true };
}

const ETAPAS = ["contato_familia", "visita", "conselho_tutelar", "ministerio_publico"] as const;
type Etapa = (typeof ETAPAS)[number];

const COLUNA_DA_ETAPA: Record<Etapa, "contatoFamiliaEm" | "visitaEm" | "conselhoTutelarEm" | "ministerioPublicoEm"> = {
  contato_familia: "contatoFamiliaEm",
  visita: "visitaEm",
  conselho_tutelar: "conselhoTutelarEm",
  ministerio_publico: "ministerioPublicoEm",
};

const ROTULO_DA_ETAPA: Record<Etapa, string> = {
  contato_familia: "contato com a família",
  visita: "visita/convocação",
  conselho_tutelar: "comunicação ao Conselho Tutelar",
  ministerio_publico: "ciência ao Ministério Público",
};

/**
 * Marca uma etapa como feita, com a data de hoje. Comunicar o Conselho
 * Tutelar também muda a situação do caso — é uma mudança de mão, não um
 * carimbo.
 */
export async function registrarEtapaBuscaAtiva(id: string, etapa: string): Promise<ResultadoBusca> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  if (!ETAPAS.includes(etapa as Etapa)) return { ok: false, erro: "Etapa desconhecida." };
  const e = etapa as Etapa;

  const [caso] = await db
    .select({ id: buscaAtiva.id, escolaId: buscaAtiva.escolaId, situacao: buscaAtiva.situacao })
    .from(buscaAtiva)
    .where(and(eq(buscaAtiva.id, id), eq(buscaAtiva.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!caso) return { ok: false, erro: "Caso não encontrado." };
  if (!podeVerEscola(sessao, caso.escolaId)) return { ok: false, erro: "Sem permissão para esta escola." };

  const hoje = new Date().toISOString().slice(0, 10);
  await db
    .update(buscaAtiva)
    .set({
      [COLUNA_DA_ETAPA[e]]: hoje,
      ...(e === "conselho_tutelar" && caso.situacao === "aberta" ? { situacao: "conselho_tutelar" as const } : {}),
      atualizadoEm: new Date().toISOString(),
    })
    .where(eq(buscaAtiva.id, caso.id));

  await auditar(sessao, {
    acao: "alterar",
    entidade: "escola",
    entidadeId: caso.escolaId,
    resumo: `busca ativa: ${ROTULO_DA_ETAPA[e]} registrada`,
  });
  revalidatePath(`/dashboard/secretarias/educacao/escolas/${caso.escolaId}`);
  revalidatePath("/dashboard/secretarias/educacao/busca-ativa");
  return { ok: true };
}

const schemaDesfecho = z.object({
  id: z.string().min(1),
  situacao: z.enum(SITUACOES),
  observacao: z.string().trim().max(300).optional(),
});

/** Como o caso terminou: voltou, transferiu, encerrou. */
export async function encerrarCasoBuscaAtiva(formData: FormData): Promise<ResultadoBusca> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  const parsed = schemaDesfecho.safeParse({
    id: formData.get("id"),
    situacao: formData.get("situacao"),
    observacao: formData.get("observacao") || undefined,
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const [caso] = await db
    .select({ id: buscaAtiva.id, escolaId: buscaAtiva.escolaId })
    .from(buscaAtiva)
    .where(and(eq(buscaAtiva.id, d.id), eq(buscaAtiva.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!caso) return { ok: false, erro: "Caso não encontrado." };
  if (!podeVerEscola(sessao, caso.escolaId)) return { ok: false, erro: "Sem permissão para esta escola." };

  await db
    .update(buscaAtiva)
    .set({
      situacao: d.situacao as "aberta" | "retornou" | "transferido" | "conselho_tutelar" | "encerrada",
      observacao: d.observacao ?? null,
      atualizadoEm: new Date().toISOString(),
    })
    .where(eq(buscaAtiva.id, caso.id));

  await auditar(sessao, {
    acao: d.situacao === "retornou" ? "concluir" : "alterar",
    entidade: "escola",
    entidadeId: caso.escolaId,
    resumo: `busca ativa: caso marcado como "${d.situacao}"`,
  });
  revalidatePath(`/dashboard/secretarias/educacao/escolas/${caso.escolaId}`);
  revalidatePath("/dashboard/secretarias/educacao/busca-ativa");
  revalidatePath("/dashboard/secretarias/educacao");
  return { ok: true };
}

export async function removerCasoBuscaAtiva(id: string): Promise<ResultadoBusca> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  const [caso] = await db
    .select({ id: buscaAtiva.id, escolaId: buscaAtiva.escolaId })
    .from(buscaAtiva)
    .where(and(eq(buscaAtiva.id, id), eq(buscaAtiva.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!caso) return { ok: false, erro: "Caso não encontrado." };
  if (!podeVerEscola(sessao, caso.escolaId)) return { ok: false, erro: "Sem permissão para esta escola." };
  await db.delete(buscaAtiva).where(eq(buscaAtiva.id, caso.id));
  await auditar(sessao, { acao: "excluir", entidade: "escola", entidadeId: caso.escolaId, resumo: "caso de busca ativa removido" });
  revalidatePath(`/dashboard/secretarias/educacao/escolas/${caso.escolaId}`);
  revalidatePath("/dashboard/secretarias/educacao/busca-ativa");
  return { ok: true };
}

/** Os casos de uma escola — para a ficha. */
export async function buscarCasosDaEscola(escolaId: string) {
  const sessao = await exigirAcesso();
  if (!sessao || !podeVerEscola(sessao, escolaId)) return [];
  return db
    .select()
    .from(buscaAtiva)
    .where(and(eq(buscaAtiva.escolaId, escolaId), eq(buscaAtiva.prefeituraId, sessao.prefeituraId)))
    .orderBy(desc(buscaAtiva.createdAt))
    .limit(200);
}

/** Todos os casos da rede — para a tela da secretaria e o resumo. */
export async function buscarCasosDaRede(prefeituraId: string) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId || sessao.cargo === "escola") return [];
  return db
    .select()
    .from(buscaAtiva)
    .where(eq(buscaAtiva.prefeituraId, prefeituraId))
    .orderBy(desc(buscaAtiva.createdAt))
    .limit(500);
}

/** Um caso, para o ofício. */
export async function buscarCasoBuscaAtiva(id: string) {
  const sessao = await exigirAcesso();
  if (!sessao) return null;
  const [caso] = await db
    .select()
    .from(buscaAtiva)
    .where(and(eq(buscaAtiva.id, id), eq(buscaAtiva.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!caso || !podeVerEscola(sessao, caso.escolaId)) return null;
  return caso;
}
