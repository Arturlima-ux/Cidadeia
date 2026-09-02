"use server";

import { z } from "zod";
import { db } from "@/db";
import { atendimentos, configPublica, prefeituras } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { lerSessao } from "@/lib/sessao";
import { gerarSlug } from "@/lib/atendimento";
import { revalidatePath } from "next/cache";

async function exigirAcesso() {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  return sessao;
}

export async function buscarAtendimentos(prefeituraId: string) {
  const sessao = await lerSessao();
  if (!sessao || sessao.prefeituraId !== prefeituraId) return [];
  return db
    .select()
    .from(atendimentos)
    .where(eq(atendimentos.prefeituraId, prefeituraId))
    .orderBy(desc(atendimentos.createdAt));
}

export async function buscarConfigPublica(prefeituraId: string) {
  const sessao = await lerSessao();
  if (!sessao || sessao.prefeituraId !== prefeituraId) return null;
  const [linha] = await db
    .select()
    .from(configPublica)
    .where(eq(configPublica.prefeituraId, prefeituraId))
    .limit(1);
  return linha ?? null;
}

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

const schemaResposta = z.object({
  id: z.string().min(1),
  resposta: z.string().min(10, "Escreva uma resposta com pelo menos 10 caracteres.").max(5000),
  status: z.enum(["em_analise", "respondido", "encerrado"]),
});

export async function responderAtendimento(formData: FormData): Promise<ResultadoAcao> {
  let sessao;
  try {
    sessao = await exigirAcesso();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  const parsed = schemaResposta.safeParse({
    id: formData.get("id"),
    resposta: formData.get("resposta"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // O filtro por prefeitura impede responder manifestação de outro município.
  await db
    .update(atendimentos)
    .set({
      resposta: parsed.data.resposta.trim(),
      status: parsed.data.status,
      respondidoEm: new Date().toISOString(),
    })
    .where(
      and(
        eq(atendimentos.id, parsed.data.id),
        eq(atendimentos.prefeituraId, sessao.prefeituraId)
      )
    );

  revalidatePath("/dashboard/atendimento");
  return { ok: true };
}

/**
 * Registra a prorrogação formal do prazo de resposta.
 *
 * A LAI (art. 11, § 2º) e a Lei 13.460 (art. 16) só admitem o prazo extra
 * mediante justificativa expressa comunicada ao cidadão. O sistema não pode
 * conceder isso sozinho — daí ser um ato do servidor, registrado, e não uma
 * tolerância automática do painel quando o prazo aperta.
 */
export async function prorrogarPrazo(id: string): Promise<ResultadoAcao> {
  let sessao;
  try {
    sessao = await exigirAcesso();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  await db
    .update(atendimentos)
    .set({ prazoProrrogado: true })
    .where(and(eq(atendimentos.id, id), eq(atendimentos.prefeituraId, sessao.prefeituraId)));

  revalidatePath("/dashboard/atendimento");
  return { ok: true };
}

const schemaConfig = z.object({
  portalAtivo: z.boolean(),
  whatsappNumero: z.string().optional(),
  mostrarFinanceiro: z.boolean(),
  mostrarObras: z.boolean(),
  mostrarLicitacoes: z.boolean(),
});

export async function salvarConfigPublica(formData: FormData): Promise<ResultadoAcao> {
  let sessao;
  try {
    sessao = await exigirAcesso();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
  if (sessao.cargo === "secretario") {
    return { ok: false, erro: "Apenas o prefeito ou administrador configura o portal." };
  }

  const parsed = schemaConfig.safeParse({
    portalAtivo: formData.get("portalAtivo") === "on",
    whatsappNumero: formData.get("whatsappNumero") || undefined,
    mostrarFinanceiro: formData.get("mostrarFinanceiro") === "on",
    mostrarObras: formData.get("mostrarObras") === "on",
    mostrarLicitacoes: formData.get("mostrarLicitacoes") === "on",
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const numeroLimpo = parsed.data.whatsappNumero?.replace(/\D/g, "") || null;
  if (numeroLimpo && (numeroLimpo.length < 12 || numeroLimpo.length > 15)) {
    return {
      ok: false,
      erro: "O WhatsApp precisa incluir código do país e DDD (ex: 55 85 99999-8888).",
    };
  }

  const [prefeitura] = await db
    .select({ municipio: prefeituras.municipio, estado: prefeituras.estado })
    .from(prefeituras)
    .where(eq(prefeituras.id, sessao.prefeituraId))
    .limit(1);
  if (!prefeitura) return { ok: false, erro: "Prefeitura não encontrada." };

  const existente = await buscarConfigPublica(sessao.prefeituraId);

  // O slug é gerado uma vez e nunca muda: ele já pode ter sido divulgado em
  // material impresso, site da prefeitura ou redes sociais.
  let slug = existente?.slug;
  if (!slug) {
    const base = gerarSlug(prefeitura.municipio, prefeitura.estado);
    slug = base;
    for (let n = 2; n <= 50; n++) {
      const [conflito] = await db
        .select({ p: configPublica.prefeituraId })
        .from(configPublica)
        .where(eq(configPublica.slug, slug!))
        .limit(1);
      if (!conflito) break;
      slug = `${base}-${n}`;
    }
  }

  await db
    .insert(configPublica)
    .values({
      prefeituraId: sessao.prefeituraId,
      slug: slug!,
      portalAtivo: parsed.data.portalAtivo,
      whatsappNumero: numeroLimpo,
      mostrarFinanceiro: parsed.data.mostrarFinanceiro,
      mostrarObras: parsed.data.mostrarObras,
      mostrarLicitacoes: parsed.data.mostrarLicitacoes,
      atualizadoEm: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: configPublica.prefeituraId,
      set: {
        portalAtivo: parsed.data.portalAtivo,
        whatsappNumero: numeroLimpo,
        mostrarFinanceiro: parsed.data.mostrarFinanceiro,
        mostrarObras: parsed.data.mostrarObras,
        mostrarLicitacoes: parsed.data.mostrarLicitacoes,
        atualizadoEm: new Date().toISOString(),
      },
    });

  revalidatePath("/dashboard/atendimento");
  if (slug) revalidatePath(`/transparencia/${slug}`);
  return { ok: true };
}
