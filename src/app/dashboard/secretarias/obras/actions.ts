"use server";

import { z } from "zod";
import { db } from "@/db";
import { obras } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { gerarId } from "@/lib/id";
import { LIMITES_BRASIL } from "@/lib/coordenadas";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { revalidatePath } from "next/cache";

async function exigirAcesso(prefeituraId: string) {
  const sessao = await lerSessao();
  if (!sessao || sessao.prefeituraId !== prefeituraId || !temAcessoSecretaria(sessao, "obras")) {
    return null;
  }
  return sessao;
}

export async function buscarObras(prefeituraId: string) {
  if (!(await exigirAcesso(prefeituraId))) return [];
  return db
    .select()
    .from(obras)
    .where(eq(obras.prefeituraId, prefeituraId))
    .orderBy(desc(obras.createdAt));
}

const schemaObra = z.object({
  nome: z.string().min(2, "Informe o nome da obra."),
  bairro: z.string().optional(),
  progressoAtual: z.coerce.number().min(0).max(100).default(0),
  progressoEsperado: z.coerce.number().min(0).max(100).default(0),
  valorContrato: z.coerce.number().optional(),
  // Caixa do Brasil, não o mundo: pega latitude e longitude trocadas, que
  // antes passavam e caíam no oceano (src/lib/coordenadas.ts).
  latitude: z.coerce.number().min(LIMITES_BRASIL.latitude.min).max(LIMITES_BRASIL.latitude.max).optional(),
  longitude: z.coerce.number().min(LIMITES_BRASIL.longitude.min).max(LIMITES_BRASIL.longitude.max).optional(),
  status: z.enum(["planejada", "em_andamento", "atrasada", "concluida", "paralisada"]),
});

export async function criarObra(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (!temAcessoSecretaria(sessao, "obras")) throw new Error("Sem permissão para esta secretaria.");

  const dados = schemaObra.parse({
    nome: formData.get("nome"),
    bairro: formData.get("bairro") || undefined,
    progressoAtual: formData.get("progressoAtual") || 0,
    progressoEsperado: formData.get("progressoEsperado") || 0,
    valorContrato: formData.get("valorContrato") || undefined,
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    status: formData.get("status"),
  });

  await db.insert(obras).values({
    id: gerarId("obra"),
    prefeituraId: sessao.prefeituraId,
    nome: dados.nome,
    bairro: dados.bairro ?? null,
    progressoAtual: dados.progressoAtual,
    progressoEsperado: dados.progressoEsperado,
    valorContrato: dados.valorContrato ?? null,
    latitude: dados.latitude ?? null,
    longitude: dados.longitude ?? null,
    status: dados.status,
  });

  revalidatePath("/dashboard/secretarias/obras");
}

const schemaAtualizarProgresso = z.object({
  id: z.string(),
  progressoAtual: z.coerce.number().min(0).max(100),
  status: z.enum(["planejada", "em_andamento", "atrasada", "concluida", "paralisada"]),
});

export async function atualizarProgressoObra(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (!temAcessoSecretaria(sessao, "obras")) throw new Error("Sem permissão para esta secretaria.");

  const dados = schemaAtualizarProgresso.parse({
    id: formData.get("id"),
    progressoAtual: formData.get("progressoAtual"),
    status: formData.get("status"),
  });

  await db
    .update(obras)
    .set({
      progressoAtual: dados.progressoAtual,
      status: dados.status,
      atualizadoEm: new Date().toISOString(),
    })
    .where(and(eq(obras.id, dados.id), eq(obras.prefeituraId, sessao.prefeituraId)));

  revalidatePath("/dashboard/secretarias/obras");
}

// ── EXCLUSÃO ──
// Não existia: dava para adicionar, nunca para tirar. Um cadastro duplicado
// ficava para sempre — e a lista com oito vezes a mesma obra deixa de
// ser confiável na primeira olhada.
//
// O WHERE inclui a prefeitura da sessão de propósito. O id sozinho viria do
// navegador, e um id de outra prefeitura apagaria dado alheio.
export async function excluirObra(id: string): Promise<{ erro: string | null }> {
  const sessao = await lerSessao();
  if (!sessao) return { erro: "Sessão expirada." };
  if (!temAcessoSecretaria(sessao, "obras")) return { erro: "Sem permissão." };

  await db
    .delete(obras)
    .where(and(eq(obras.id, id), eq(obras.prefeituraId, sessao.prefeituraId)));

  revalidatePath("/dashboard/secretarias/obras");
  return { erro: null };
}
