"use server";

import { z } from "zod";
import { db } from "@/db";
import { licitacoes } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { gerarId } from "@/lib/id";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { revalidatePath } from "next/cache";

async function exigirAcesso(prefeituraId: string) {
  const sessao = await lerSessao();
  if (!sessao || sessao.prefeituraId !== prefeituraId || !temAcessoSecretaria(sessao, "licitacoes")) {
    return null;
  }
  return sessao;
}

export async function buscarLicitacoes(prefeituraId: string) {
  if (!(await exigirAcesso(prefeituraId))) return [];
  return db
    .select()
    .from(licitacoes)
    .where(eq(licitacoes.prefeituraId, prefeituraId))
    .orderBy(desc(licitacoes.createdAt));
}

const schemaLicitacao = z.object({
  numero: z.string().min(1, "Informe o número do processo."),
  objeto: z.string().min(3, "Descreva o objeto da licitação."),
  modalidade: z.string().optional(),
  valorEstimado: z.coerce.number().optional(),
  fornecedor: z.string().optional(),
  status: z.enum(["planejamento", "publicada", "em_disputa", "homologada", "cancelada"]),
  observacaoRisco: z.string().optional(),
  prazoFinal: z.string().optional(),
});

export async function criarLicitacao(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (!temAcessoSecretaria(sessao, "licitacoes")) throw new Error("Sem permissão para esta secretaria.");

  const dados = schemaLicitacao.parse({
    numero: formData.get("numero"),
    objeto: formData.get("objeto"),
    modalidade: formData.get("modalidade") || undefined,
    valorEstimado: formData.get("valorEstimado") || undefined,
    fornecedor: formData.get("fornecedor") || undefined,
    status: formData.get("status"),
    observacaoRisco: formData.get("observacaoRisco") || undefined,
    prazoFinal: formData.get("prazoFinal") || undefined,
  });

  await db.insert(licitacoes).values({
    id: gerarId("licit"),
    prefeituraId: sessao.prefeituraId,
    numero: dados.numero,
    objeto: dados.objeto,
    modalidade: dados.modalidade ?? null,
    valorEstimado: dados.valorEstimado ?? null,
    fornecedor: dados.fornecedor ?? null,
    status: dados.status,
    observacaoRisco: dados.observacaoRisco ?? null,
    prazoFinal: dados.prazoFinal ?? null,
  });

  revalidatePath("/dashboard/secretarias/licitacoes");
}

// ── EXCLUSÃO ──
// Não existia: dava para adicionar, nunca para tirar. Um cadastro duplicado
// ficava para sempre — e a lista com oito vezes a mesma licitação deixa de
// ser confiável na primeira olhada.
//
// O WHERE inclui a prefeitura da sessão de propósito. O id sozinho viria do
// navegador, e um id de outra prefeitura apagaria dado alheio.
export async function excluirLicitacao(id: string): Promise<{ erro: string | null }> {
  const sessao = await lerSessao();
  if (!sessao) return { erro: "Sessão expirada." };
  if (!temAcessoSecretaria(sessao, "licitacoes")) return { erro: "Sem permissão." };

  await db
    .delete(licitacoes)
    .where(and(eq(licitacoes.id, id), eq(licitacoes.prefeituraId, sessao.prefeituraId)));

  revalidatePath("/dashboard/secretarias/licitacoes");
  return { erro: null };
}
