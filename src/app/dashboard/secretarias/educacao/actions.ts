"use server";

import { z } from "zod";
import { db } from "@/db";
import { escolas, educacaoIndicadores } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { gerarId } from "@/lib/id";
import { LIMITES_BRASIL } from "@/lib/coordenadas";
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
  return (await buscarSerieIndicadorEducacao(prefeituraId, 1))[0] ?? null;
}

/**
 * As últimas leituras, da mais recente para a mais antiga. Cada "Atualizar
 * indicadores" grava uma linha nova; a série é o que permite dizer "caiu 7
 * pontos desde junho" em vez de só "está em 71%".
 */
export async function buscarSerieIndicadorEducacao(prefeituraId: string, limite = 12) {
  if (!(await exigirAcesso(prefeituraId))) return [];
  return db
    .select()
    .from(educacaoIndicadores)
    .where(eq(educacaoIndicadores.prefeituraId, prefeituraId))
    .orderBy(desc(educacaoIndicadores.atualizadoEm))
    .limit(limite);
}

const schemaEscola = z.object({
  nome: z.string().min(2, "Informe o nome da escola."),
  bairro: z.string().optional(),
  evasaoPercentual: z.coerce.number().min(0).max(100).optional(),
  // Caixa do Brasil, não o mundo: pega latitude e longitude trocadas, que
  // antes passavam e caíam no oceano (src/lib/coordenadas.ts).
  latitude: z.coerce.number().min(LIMITES_BRASIL.latitude.min).max(LIMITES_BRASIL.latitude.max).optional(),
  longitude: z.coerce.number().min(LIMITES_BRASIL.longitude.min).max(LIMITES_BRASIL.longitude.max).optional(),
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

// ── EXCLUSÃO ──
// Não existia: dava para adicionar, nunca para tirar. Um cadastro duplicado
// ficava para sempre — e a lista com oito vezes a mesma escola deixa de
// ser confiável na primeira olhada.
//
// O WHERE inclui a prefeitura da sessão de propósito. O id sozinho viria do
// navegador, e um id de outra prefeitura apagaria dado alheio.
export async function excluirEscola(id: string): Promise<{ erro: string | null }> {
  const sessao = await lerSessao();
  if (!sessao) return { erro: "Sessão expirada." };
  if (!temAcessoSecretaria(sessao, "educacao")) return { erro: "Sem permissão." };

  await db
    .delete(escolas)
    .where(and(eq(escolas.id, id), eq(escolas.prefeituraId, sessao.prefeituraId)));

  revalidatePath("/dashboard/secretarias/educacao");
  return { erro: null };
}
