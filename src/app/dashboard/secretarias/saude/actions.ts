"use server";

import { z } from "zod";
import { db } from "@/db";
import { unidadesSaude, saudeIndicadores } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { gerarId } from "@/lib/id";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { revalidatePath } from "next/cache";

async function exigirAcesso(prefeituraId: string) {
  const sessao = await lerSessao();
  if (!sessao || sessao.prefeituraId !== prefeituraId || !temAcessoSecretaria(sessao, "saude")) {
    return null;
  }
  return sessao;
}

export async function buscarUnidadesSaude(prefeituraId: string) {
  if (!(await exigirAcesso(prefeituraId))) return [];
  return db
    .select()
    .from(unidadesSaude)
    .where(eq(unidadesSaude.prefeituraId, prefeituraId))
    .orderBy(desc(unidadesSaude.createdAt));
}

export async function buscarUltimoIndicadorSaude(prefeituraId: string) {
  if (!(await exigirAcesso(prefeituraId))) return null;
  const linhas = await db
    .select()
    .from(saudeIndicadores)
    .where(eq(saudeIndicadores.prefeituraId, prefeituraId))
    .orderBy(desc(saudeIndicadores.atualizadoEm))
    .limit(1);
  return linhas[0] ?? null;
}

const schemaUnidade = z.object({
  nome: z.string().min(2, "Informe o nome da unidade."),
  tipo: z.enum(["ubs", "posto", "hospital", "samu"]),
  bairro: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export async function criarUnidadeSaude(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (!temAcessoSecretaria(sessao, "saude")) throw new Error("Sem permissão para esta secretaria.");

  const dados = schemaUnidade.parse({
    nome: formData.get("nome"),
    tipo: formData.get("tipo"),
    bairro: formData.get("bairro") || undefined,
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
  });

  await db.insert(unidadesSaude).values({
    id: gerarId("unidade"),
    prefeituraId: sessao.prefeituraId,
    nome: dados.nome,
    tipo: dados.tipo,
    bairro: dados.bairro ?? null,
    latitude: dados.latitude ?? null,
    longitude: dados.longitude ?? null,
  });

  revalidatePath("/dashboard/secretarias/saude");
}

const schemaIndicadorSaude = z.object({
  tempoMedioAtendimentoMin: z.coerce.number().optional(),
  medicosAtivos: z.coerce.number().int().optional(),
  faltasPercentual: z.coerce.number().min(0).max(100).optional(),
  estoqueMedicamentosPercentual: z.coerce.number().min(0).max(100).optional(),
});

export async function atualizarIndicadorSaude(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (!temAcessoSecretaria(sessao, "saude")) throw new Error("Sem permissão para esta secretaria.");

  const dados = schemaIndicadorSaude.parse({
    tempoMedioAtendimentoMin: formData.get("tempoMedioAtendimentoMin") || undefined,
    medicosAtivos: formData.get("medicosAtivos") || undefined,
    faltasPercentual: formData.get("faltasPercentual") || undefined,
    estoqueMedicamentosPercentual:
      formData.get("estoqueMedicamentosPercentual") || undefined,
  });

  await db.insert(saudeIndicadores).values({
    id: gerarId("saudeind"),
    prefeituraId: sessao.prefeituraId,
    tempoMedioAtendimentoMin: dados.tempoMedioAtendimentoMin ?? null,
    medicosAtivos: dados.medicosAtivos ?? null,
    faltasPercentual: dados.faltasPercentual ?? null,
    estoqueMedicamentosPercentual: dados.estoqueMedicamentosPercentual ?? null,
    origem: "manual",
  });

  revalidatePath("/dashboard/secretarias/saude");
}
