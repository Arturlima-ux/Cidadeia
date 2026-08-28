"use server";

import { z } from "zod";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { gerarId } from "@/lib/id";
import { gerarHashSenha, senhaForte } from "@/lib/senha";
import { validarCpfOuCnpj, normalizarDocumento } from "@/lib/documento";
import { lerSessao } from "@/lib/sessao";
import { revalidatePath } from "next/cache";

const schemaUsuario = z.object({
  nome: z.string().min(3, "Informe o nome."),
  documento: z.string().refine((v) => validarCpfOuCnpj(v), "CPF/CNPJ inválido."),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  senha: z.string(),
  secretaria: z.enum(["saude", "educacao", "obras", "licitacoes"]),
});

export type ResultadoCriarUsuario =
  | { ok: true }
  | { ok: false; erro: string };

export async function criarUsuarioSecretario(
  formData: FormData
): Promise<ResultadoCriarUsuario> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Não autenticado." };

  // Só prefeito/admin pode criar contas de secretário.
  if (sessao.cargo === "secretario") {
    return { ok: false, erro: "Você não tem permissão para criar usuários." };
  }

  const parsed = schemaUsuario.safeParse({
    nome: formData.get("nome"),
    documento: formData.get("documento"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    secretaria: formData.get("secretaria"),
  });

  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parsed.data;

  const forte = senhaForte(dados.senha);
  if (!forte.ok) return { ok: false, erro: forte.motivo! };

  const documento = normalizarDocumento(dados.documento);

  const existente = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.cpfCnpj, documento))
    .limit(1);
  if (existente.length > 0) {
    return { ok: false, erro: "Já existe um usuário com este CPF/CNPJ." };
  }

  const senhaHash = await gerarHashSenha(dados.senha);

  await db.insert(usuarios).values({
    id: gerarId("user"),
    prefeituraId: sessao.prefeituraId,
    cpfCnpj: documento,
    senhaHash,
    email: dados.email || null,
    nome: dados.nome,
    cargo: "secretario",
    secretaria: dados.secretaria,
  });

  revalidatePath("/dashboard/configuracoes");
  return { ok: true };
}

export async function removerUsuario(usuarioId: string) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (sessao.cargo === "secretario") throw new Error("Sem permissão.");
  if (usuarioId === sessao.usuarioId) {
    throw new Error("Você não pode remover sua própria conta por aqui.");
  }

  await db
    .delete(usuarios)
    .where(and(eq(usuarios.id, usuarioId), eq(usuarios.prefeituraId, sessao.prefeituraId)));
  revalidatePath("/dashboard/configuracoes");
}
