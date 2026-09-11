"use server";

import { z } from "zod";
import { db } from "@/db";
import { usuarios, prefeituras } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verificarSenha } from "@/lib/senha";
import { normalizarDocumento } from "@/lib/documento";
import { criarSessao } from "@/lib/sessao";
import { redirect } from "next/navigation";
import { verificarBloqueio, registrarTentativaFalha, limparTentativas } from "@/lib/rate-limit";

const schemaLogin = z.object({
  documento: z.string().min(1, "Informe seu CPF ou CNPJ."),
  senha: z.string().min(1, "Informe sua senha."),
});

export type ResultadoLogin = { ok: true } | { ok: false; erro: string };

export async function fazerLogin(
  dadosBrutos: z.infer<typeof schemaLogin>
): Promise<ResultadoLogin> {
  const parsed = schemaLogin.safeParse(dadosBrutos);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const documento = normalizarDocumento(parsed.data.documento);

  const minutosRestantes = await verificarBloqueio(documento);
  if (minutosRestantes !== null) {
    return {
      ok: false,
      erro: `Muitas tentativas incorretas. Tente novamente em ${minutosRestantes} minuto${minutosRestantes > 1 ? "s" : ""}.`,
    };
  }

  const linhas = await db
    .select({
      usuarioId: usuarios.id,
      prefeituraId: usuarios.prefeituraId,
      nome: usuarios.nome,
      cargo: usuarios.cargo,
      secretaria: usuarios.secretaria,
      senhaHash: usuarios.senhaHash,
      prefeituraNome: prefeituras.nome,
    })
    .from(usuarios)
    .innerJoin(prefeituras, eq(usuarios.prefeituraId, prefeituras.id))
    .where(eq(usuarios.cpfCnpj, documento))
    .limit(1);

  const usuario = linhas[0];

  // Mensagem genérica de propósito — não revela se o documento existe ou não,
  // para não facilitar enumeração de usuários cadastrados.
  const erroGenerico = "CPF/CNPJ ou senha incorretos.";

  if (!usuario) {
    await registrarTentativaFalha(documento);
    return { ok: false, erro: erroGenerico };
  }

  const senhaValida = await verificarSenha(parsed.data.senha, usuario.senhaHash);
  if (!senhaValida) {
    await registrarTentativaFalha(documento);
    return { ok: false, erro: erroGenerico };
  }

  await limparTentativas(documento);

  await criarSessao({
    usuarioId: usuario.usuarioId,
    prefeituraId: usuario.prefeituraId,
    nome: usuario.nome,
    cargo: usuario.cargo as "prefeito" | "secretario" | "admin",
    secretaria: usuario.secretaria,
  });

  // Quem entra cai na Visão Geral — é ela que recebe, com a saudação e o
  // nome. A Implantação fica no menu, primeiro item enquanto estiver aberta;
  // já foi porta de entrada e catraca, e as duas versões atrapalhavam mais
  // do que guiavam.
  redirect("/dashboard");
}

export async function sair() {
  const { encerrarSessao } = await import("@/lib/sessao");
  await encerrarSessao();
  redirect("/login");
}
