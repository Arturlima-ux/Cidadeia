"use server";

import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { db } from "@/db";
import { usuarios, tokensRecuperacaoSenha } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizarDocumento } from "@/lib/documento";
import { linkApp } from "@/lib/url-app";
import { enviarEmail, type CausaNaoEnviado } from "@/lib/email";
import { montarEmail, saudacao } from "@/lib/email-modelo";
import { gerarId } from "@/lib/id";
import { limitarUso } from "@/lib/rate-limit";

const schema = z.object({ documento: z.string().min(1) });

const DURACAO_TOKEN_MS = 60 * 60 * 1000; // 1 hora

export type ResultadoSolicitacao =
  | { ok: true; naoEnviado?: { causa: CausaNaoEnviado; motivo: string } }
  | { ok: false; erro: string };

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
    .select({ id: usuarios.id, email: usuarios.email, nome: usuarios.nome })
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
    // Segredo de acesso: nunca na caixa de saída da equipe (lib/email.ts).
    guardarNaCaixaDeSaida: false,
    para: usuario.email,
    assunto: "Redefinir sua senha do CidadeIA",
    html: montarEmail({
      remetente: { tipo: "cidadeia" },
      previa: "O link para criar uma nova senha vale por 1 hora.",
      etiqueta: { texto: "Segurança da conta" },
      titulo: "Redefinir sua senha",
      saudacao: saudacao(usuario.nome),
      blocos: [
        { p: "Recebemos um pedido para redefinir a senha da sua conta no CidadeIA. Para criar uma nova senha, use o botão abaixo." },
        { botao: "Criar uma nova senha", link },
        { destaque: "Este link vale por 1 hora e só pode ser usado uma vez. Se você não pediu a troca de senha, ignore este e-mail: sua senha atual continua valendo.", tom: "neutro" },
        { nota: "Por segurança, a equipe do CidadeIA nunca pede sua senha por e-mail, telefone ou mensagem." },
      ],
      motivo: "Você recebe este e-mail porque alguém pediu a redefinição de senha da sua conta no CidadeIA.",
    }),
  });

  if (!resultado.enviado) {
    // A causa sobe junto: a tela precisa dizer se ninguém vai receber e-mail
    // nenhum (servidor sem envio) ou se foi este envio que falhou.
    return { ok: true, naoEnviado: { causa: resultado.causa, motivo: resultado.motivo } };
  }

  return { ok: true };
}
