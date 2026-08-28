"use server";

import { z } from "zod";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { lerSessao } from "@/lib/sessao";
import { verificarSenha, gerarHashSenha, senhaForte } from "@/lib/senha";
import { enviarFotoPerfil } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

const schemaPerfil = z.object({
  nome: z.string().min(3, "Informe seu nome."),
  celular: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
});

export async function atualizarPerfil(formData: FormData): Promise<ResultadoAcao> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Não autenticado." };

  const parsed = schemaPerfil.safeParse({
    nome: formData.get("nome"),
    celular: formData.get("celular") || undefined,
    email: formData.get("email") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await db
    .update(usuarios)
    .set({
      nome: parsed.data.nome,
      celular: parsed.data.celular || null,
      email: parsed.data.email || null,
    })
    .where(eq(usuarios.id, sessao.usuarioId));

  revalidatePath("/dashboard/conta");
  return { ok: true };
}

const schemaSenha = z
  .object({
    senhaAtual: z.string().min(1, "Informe sua senha atual."),
    senhaNova: z.string(),
    confirmacao: z.string(),
  })
  .refine((d) => d.senhaNova === d.confirmacao, {
    message: "A confirmação não bate com a nova senha.",
    path: ["confirmacao"],
  });

export async function trocarSenha(formData: FormData): Promise<ResultadoAcao> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Não autenticado." };

  const parsed = schemaSenha.safeParse({
    senhaAtual: formData.get("senhaAtual"),
    senhaNova: formData.get("senhaNova"),
    confirmacao: formData.get("confirmacao"),
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const forte = senhaForte(parsed.data.senhaNova);
  if (!forte.ok) return { ok: false, erro: forte.motivo! };

  const linhas = await db
    .select({ senhaHash: usuarios.senhaHash })
    .from(usuarios)
    .where(eq(usuarios.id, sessao.usuarioId))
    .limit(1);
  const usuario = linhas[0];
  if (!usuario) return { ok: false, erro: "Usuário não encontrado." };

  const senhaValida = await verificarSenha(parsed.data.senhaAtual, usuario.senhaHash);
  if (!senhaValida) return { ok: false, erro: "Senha atual incorreta." };

  const novoHash = await gerarHashSenha(parsed.data.senhaNova);
  await db.update(usuarios).set({ senhaHash: novoHash }).where(eq(usuarios.id, sessao.usuarioId));

  return { ok: true };
}

export async function atualizarFotoPerfil(formData: FormData): Promise<ResultadoAcao> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Não autenticado." };

  const arquivo = formData.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: "Escolha uma imagem." };
  }

  const resultado = await enviarFotoPerfil(sessao.usuarioId, arquivo);
  if (!resultado.ok) return resultado;

  await db
    .update(usuarios)
    .set({ fotoUrl: resultado.url })
    .where(eq(usuarios.id, sessao.usuarioId));

  revalidatePath("/dashboard/conta");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
