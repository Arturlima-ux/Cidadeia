"use server";

import { z } from "zod";
import { db } from "@/db";
import { escolas, educacaoIndicadores } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { gerarId } from "@/lib/id";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { revalidatePath } from "next/cache";

async function exigirAcesso(prefeituraId: string) {
  const sessao = await lerSessao();
  if (!sessao || sessao.prefeituraId !== prefeituraId || !temAcessoSecretaria(sessao, "educacao")) {
    return null;
  }
  return sessao;
}

export async function buscarEscolas(prefeituraId: string) {
  if (!(await exigirAcesso(prefeituraId))) return [];
  return db
    .select()
    .from(escolas)
    .where(eq(escolas.prefeituraId, prefeituraId))
    .orderBy(desc(escolas.createdAt));
}

export async function buscarUltimoIndicadorEducacao(prefeituraId: string) {
  if (!(await exigirAcesso(prefeituraId))) return null;
  const linhas = await db
    .select()
    .from(educacaoIndicadores)
    .where(eq(educacaoIndicadores.prefeituraId, prefeituraId))
    .orderBy(desc(educacaoIndicadores.atualizadoEm))
    .limit(1);
  return linhas[0] ?? null;
}

const schemaEscola = z.object({
  nome: z.string().min(2, "Informe o nome da escola."),
  bairro: z.string().optional(),
  evasaoPercentual: z.coerce.number().min(0).max(100).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export async function criarEscola(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (!temAcessoSecretaria(sessao, "educacao")) throw new Error("Sem permissão para esta secretaria.");

  const dados = schemaEscola.parse({
    nome: formData.get("nome"),
    bairro: formData.get("bairro") || undefined,
    evasaoPercentual: formData.get("evasaoPercentual") || undefined,
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
  });

  await db.insert(escolas).values({
    id: gerarId("escola"),
    prefeituraId: sessao.prefeituraId,
    nome: dados.nome,
    bairro: dados.bairro ?? null,
    evasaoPercentual: dados.evasaoPercentual ?? null,
    latitude: dados.latitude ?? null,
    longitude: dados.longitude ?? null,
  });

  revalidatePath("/dashboard/secretarias/educacao");
}

const schemaIndicadorEducacao = z.object({
  frequenciaPercentual: z.coerce.number().min(0).max(100).optional(),
  notaMedia: z.coerce.number().min(0).max(10).optional(),
  alunosTransporte: z.coerce.number().int().optional(),
  professoresAtivos: z.coerce.number().int().optional(),
});

export async function atualizarIndicadorEducacao(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (!temAcessoSecretaria(sessao, "educacao")) throw new Error("Sem permissão para esta secretaria.");

  const dados = schemaIndicadorEducacao.parse({
    frequenciaPercentual: formData.get("frequenciaPercentual") || undefined,
    notaMedia: formData.get("notaMedia") || undefined,
    alunosTransporte: formData.get("alunosTransporte") || undefined,
    professoresAtivos: formData.get("professoresAtivos") || undefined,
  });

  await db.insert(educacaoIndicadores).values({
    id: gerarId("eduind"),
    prefeituraId: sessao.prefeituraId,
    frequenciaPercentual: dados.frequenciaPercentual ?? null,
    notaMedia: dados.notaMedia ?? null,
    alunosTransporte: dados.alunosTransporte ?? null,
    professoresAtivos: dados.professoresAtivos ?? null,
    origem: "manual",
  });

  revalidatePath("/dashboard/secretarias/educacao");
}
