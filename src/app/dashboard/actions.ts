"use server";

import { z } from "zod";
import { db } from "@/db";
import { dashboardSnapshots, alertas, alertasSugeridos } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { gerarId } from "@/lib/id";
import { lerSessao } from "@/lib/sessao";
import { revalidatePath } from "next/cache";
import { gerarSugestoesAlertas } from "@/lib/ia";
import { notificarAlertaUrgente } from "@/lib/notificacoes";

const schemaSnapshot = z.object({
  receita: z.coerce.number().optional(),
  despesas: z.coerce.number().optional(),
  indiceTransparencia: z.coerce.number().min(0).max(100).optional(),
});

export async function atualizarSnapshot(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");

  const dados = schemaSnapshot.parse({
    receita: formData.get("receita") || undefined,
    despesas: formData.get("despesas") || undefined,
    indiceTransparencia: formData.get("indiceTransparencia") || undefined,
  });

  const saldo =
    dados.receita !== undefined && dados.despesas !== undefined
      ? dados.receita - dados.despesas
      : undefined;

  await db.insert(dashboardSnapshots).values({
    id: gerarId("snap"),
    prefeituraId: sessao.prefeituraId,
    receita: dados.receita ?? null,
    despesas: dados.despesas ?? null,
    saldo: saldo ?? null,
    indiceTransparencia: dados.indiceTransparencia ?? null,
    origem: "manual",
  });

  revalidatePath("/dashboard");
}

const schemaAlerta = z.object({
  titulo: z.string().min(3, "Informe um título."),
  descricao: z.string().optional(),
  prioridade: z.enum(["urgente", "medio", "info"]),
  secretaria: z.string().optional(),
});

export async function criarAlerta(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");

  const dados = schemaAlerta.parse({
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") || undefined,
    prioridade: formData.get("prioridade"),
    secretaria: formData.get("secretaria") || undefined,
  });

  await db.insert(alertas).values({
    id: gerarId("alerta"),
    prefeituraId: sessao.prefeituraId,
    titulo: dados.titulo,
    descricao: dados.descricao ?? null,
    prioridade: dados.prioridade,
    secretaria: dados.secretaria ?? null,
  });

  if (dados.prioridade === "urgente") {
    await notificarAlertaUrgente({
      prefeituraId: sessao.prefeituraId,
      titulo: dados.titulo,
      descricao: dados.descricao,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/alertas");
}

export async function resolverAlerta(id: string) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");

  await db
    .update(alertas)
    .set({ resolvido: true })
    .where(and(eq(alertas.id, id), eq(alertas.prefeituraId, sessao.prefeituraId)));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/alertas");
}

export type ResultadoGerarSugestoes = { ok: true } | { ok: false; erro: string };

export async function gerarSugestoes(): Promise<ResultadoGerarSugestoes> {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");

  const resultado = await gerarSugestoesAlertas(sessao.prefeituraId, {
    cargo: sessao.cargo,
    secretaria: sessao.secretaria,
  });

  if (!resultado.ok) {
    return { ok: false, erro: resultado.erro };
  }

  // Sugestões são rascunhos — cada geração substitui as pendentes anteriores.
  await db
    .delete(alertasSugeridos)
    .where(eq(alertasSugeridos.prefeituraId, sessao.prefeituraId));

  if (resultado.sugestoes.length > 0) {
    await db.insert(alertasSugeridos).values(
      resultado.sugestoes.map((s) => ({
        id: gerarId("sugestao"),
        prefeituraId: sessao.prefeituraId,
        titulo: s.titulo,
        descricao: s.descricao,
        prioridade: s.prioridade,
        secretaria: s.secretaria,
        justificativa: s.justificativa,
      }))
    );
  }

  revalidatePath("/dashboard/alertas");
  return { ok: true };
}

export async function aprovarSugestao(id: string) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");

  const linhas = await db
    .select()
    .from(alertasSugeridos)
    .where(eq(alertasSugeridos.id, id))
    .limit(1);
  const sugestao = linhas[0];
  if (!sugestao || sugestao.prefeituraId !== sessao.prefeituraId) return;

  await db.insert(alertas).values({
    id: gerarId("alerta"),
    prefeituraId: sugestao.prefeituraId,
    titulo: sugestao.titulo,
    descricao: sugestao.descricao,
    prioridade: sugestao.prioridade,
    secretaria: sugestao.secretaria,
  });

  if (sugestao.prioridade === "urgente") {
    await notificarAlertaUrgente({
      prefeituraId: sugestao.prefeituraId,
      titulo: sugestao.titulo,
      descricao: sugestao.descricao,
    });
  }

  await db.delete(alertasSugeridos).where(eq(alertasSugeridos.id, id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/alertas");
}

export async function descartarSugestao(id: string) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");

  const linhas = await db
    .select({ prefeituraId: alertasSugeridos.prefeituraId })
    .from(alertasSugeridos)
    .where(eq(alertasSugeridos.id, id))
    .limit(1);
  if (!linhas[0] || linhas[0].prefeituraId !== sessao.prefeituraId) return;

  await db.delete(alertasSugeridos).where(eq(alertasSugeridos.id, id));

  revalidatePath("/dashboard/alertas");
}
