"use server";

import { z } from "zod";
import { db } from "@/db";
import { publicacoes } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { lerSessao } from "@/lib/sessao";
import { gerarId } from "@/lib/id";
import { revalidatePath } from "next/cache";
import type { Publicacao } from "@/lib/publicacoes";

export type ResultadoPublicacao = { ok: true } | { ok: false; erro: string };

const TIPOS = ["comunicado", "servico", "estrutura", "faq", "repasse", "documento"] as const;

const schema = z.object({
  id: z.string().optional(),
  tipo: z.enum(TIPOS),
  titulo: z.string().trim().min(3, "Dê um título ao que está sendo publicado.").max(160),
  conteudo: z.string().trim().min(10, "Escreva o conteúdo — o cidadão precisa entender sozinho.").max(8000),
  secretaria: z.string().trim().max(60).optional(),
  requisitos: z.string().trim().max(2000).optional(),
  prazo: z.string().trim().max(200).optional(),
  contato: z.string().trim().max(400).optional(),
  linkExterno: z.string().trim().url("O link precisa começar com http:// ou https://").max(500).optional().or(z.literal("")),
  publicado: z.boolean(),
});

function vazioParaNull(v: string | undefined): string | null {
  const limpo = v?.trim();
  return limpo ? limpo : null;
}

/**
 * Só o gabinete e o secretário publicam.
 *
 * O secretário publica na área dele; o texto vai ao endereço público do
 * município assinado pela prefeitura, então quem não tem acesso ao painel não
 * chega aqui de jeito nenhum — e o cidadão, do outro lado, só lê.
 */
async function exigirGestor() {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Sessão expirada. Entre novamente.");
  return sessao;
}

export async function listarPublicacoes(): Promise<Publicacao[]> {
  const sessao = await lerSessao();
  if (!sessao) return [];

  const linhas = await db
    .select()
    .from(publicacoes)
    .where(eq(publicacoes.prefeituraId, sessao.prefeituraId))
    .orderBy(desc(publicacoes.atualizadoEm));

  return linhas.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    titulo: l.titulo,
    conteudo: l.conteudo,
    secretaria: l.secretaria,
    requisitos: l.requisitos,
    prazo: l.prazo,
    contato: l.contato,
    linkExterno: l.linkExterno,
    publicado: l.publicado,
    atualizadoEm: l.atualizadoEm,
  }));
}

export async function salvarPublicacao(formData: FormData): Promise<ResultadoPublicacao> {
  let sessao;
  try {
    sessao = await exigirGestor();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  const parsed = schema.safeParse({
    id: formData.get("id") || undefined,
    tipo: formData.get("tipo"),
    titulo: formData.get("titulo"),
    conteudo: formData.get("conteudo"),
    secretaria: formData.get("secretaria") || undefined,
    requisitos: formData.get("requisitos") || undefined,
    prazo: formData.get("prazo") || undefined,
    contato: formData.get("contato") || undefined,
    linkExterno: formData.get("linkExterno") || undefined,
    publicado: formData.get("publicado") === "on",
  });

  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  const valores = {
    tipo: d.tipo,
    titulo: d.titulo,
    conteudo: d.conteudo,
    secretaria: vazioParaNull(d.secretaria),
    requisitos: vazioParaNull(d.requisitos),
    prazo: vazioParaNull(d.prazo),
    contato: vazioParaNull(d.contato),
    linkExterno: vazioParaNull(d.linkExterno),
    publicado: d.publicado,
    atualizadoEm: new Date().toISOString(),
  };

  // O filtro por prefeitura em toda escrita é o que impede editar publicação de
  // outro município trocando o id no formulário.
  if (d.id) {
    await db
      .update(publicacoes)
      .set(valores)
      .where(and(eq(publicacoes.id, d.id), eq(publicacoes.prefeituraId, sessao.prefeituraId)));
  } else {
    await db
      .insert(publicacoes)
      .values({ id: gerarId("pub"), prefeituraId: sessao.prefeituraId, ...valores });
  }

  revalidatePath("/dashboard/publicacoes");
  revalidatePath("/transparencia", "layout");
  return { ok: true };
}

/** Tira do ar sem apagar: o gestor costuma querer o texto de volta depois. */
export async function alternarPublicado(id: string, publicado: boolean): Promise<ResultadoPublicacao> {
  let sessao;
  try {
    sessao = await exigirGestor();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  await db
    .update(publicacoes)
    .set({ publicado, atualizadoEm: new Date().toISOString() })
    .where(and(eq(publicacoes.id, id), eq(publicacoes.prefeituraId, sessao.prefeituraId)));

  revalidatePath("/dashboard/publicacoes");
  revalidatePath("/transparencia", "layout");
  return { ok: true };
}

export async function removerPublicacao(id: string): Promise<ResultadoPublicacao> {
  let sessao;
  try {
    sessao = await exigirGestor();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  await db
    .delete(publicacoes)
    .where(and(eq(publicacoes.id, id), eq(publicacoes.prefeituraId, sessao.prefeituraId)));

  revalidatePath("/dashboard/publicacoes");
  revalidatePath("/transparencia", "layout");
  return { ok: true };
}
