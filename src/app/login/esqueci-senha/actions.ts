"use server";

import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { db } from "@/db";
import { usuarios, tokensRecuperacaoSenha } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizarDocumento } from "@/lib/documento";
import { linkApp } from "@/lib/url-app";
import { enviarEmail } from "@/lib/email";
import { gerarId } from "@/lib/id";
import { limitarUso } from "@/lib/rate-limit";

const schema = z.object({ documento: z.string().min(1) });

const DURACAO_TOKEN_MS = 60 * 60 * 1000; // 1 hora

export type ResultadoSolicitacao = { ok: true; avisoDev?: string } | { ok: false; erro: string };

// Sempre retorna a mesma mensagem de sucesso, exista ou não o documento —
// evita que a tela de recuperação seja usada para descobrir quem tem conta.
export async function solicitarRecuperacao(
  dadosBrutos: z.infer<typeof schema>
): Promise<ResultadoSolicitacao> {
  const parsed = schema.safeParse(dadosBrutos);
  if (!parsed.success) {
    return { ok: false, erro: "Informe seu CPF ou CNPJ." };
  }

  const documento = normalizarDocumento(parsed.data.documento);

  try {
    return await processarRecuperacao(documento);
  } catch (erro) {
    // Esta tela é pública e sem login: qualquer exceção que escape daqui vira
    // a fronteira de erro do Next ("Algo deu errado"), que não diz nada a
    // quem está tentando entrar e ainda parece site quebrado. Melhor devolver
    // uma mensagem acionável e deixar o motivo real no log do servidor.
    console.error("[recuperacao] falha inesperada:", erro);
    return {
      ok: false,
      erro: "Não conseguimos processar o pedido agora. Tente de novo em alguns minutos.",
    };
  }
}

async function processarRecuperacao(documento: string): Promise<ResultadoSolicitacao> {
  // Limite silencioso: se estourar, cai no mesmo retorno de "conta não
  // encontrada" — evita tanto spam de e-mail quanto vazar que a conta existe.
  const podeSolicitar = await limitarUso(`recuperacao:${documento}`, 3, 15);
  if (!podeSolicitar) {
    return { ok: true };
  }

  const [usuario] = await db
    .select({ id: usuarios.id, email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.cpfCnpj, documento))
    .limit(1);

  // Não revela se o documento existe, nem se a conta tem e-mail cadastrado —
  // mesma mensagem de sucesso em ambos os casos.
  if (!usuario || !usuario.email) {
    return { ok: true };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await db.insert(tokensRecuperacaoSenha).values({
    id: gerarId("reset"),
    usuarioId: usuario.id,
    tokenHash,
    expiraEm: new Date(Date.now() + DURACAO_TOKEN_MS).toISOString(),
  });

  const link = linkApp(`/login/redefinir-senha?token=${token}`);

  const resultado = await enviarEmail({
    para: usuario.email,
    assunto: "Redefinir sua senha — CidadeIA",
    html: `<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${link}">Clique aqui para criar uma nova senha</a></p><p>Este link expira em 1 hora. Se você não pediu isso, ignore este e-mail.</p>`,
  });

  if (!resultado.enviado) {
    return { ok: true, avisoDev: resultado.motivo };
  }

  return { ok: true };
}
