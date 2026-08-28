"use server";

import { createHash } from "crypto";
import { z } from "zod";
import { db } from "@/db";
import { usuarios, tokensRecuperacaoSenha } from "@/db/schema";
import { eq } from "drizzle-orm";
import { gerarHashSenha, senhaForte } from "@/lib/senha";

const schema = z.object({
  token: z.string().min(1),
  novaSenha: z.string(),
});

export type ResultadoRedefinicao = { ok: true } | { ok: false; erro: string };

export async function redefinirSenha(
  dadosBrutos: z.infer<typeof schema>
): Promise<ResultadoRedefinicao> {
  const parsed = schema.safeParse(dadosBrutos);
  if (!parsed.success) {
    return { ok: false, erro: "Dados inválidos." };
  }

  const forte = senhaForte(parsed.data.novaSenha);
  if (!forte.ok) {
    return { ok: false, erro: forte.motivo! };
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");

  const [linha] = await db
    .select()
    .from(tokensRecuperacaoSenha)
    .where(eq(tokensRecuperacaoSenha.tokenHash, tokenHash))
    .limit(1);

  const invalido =
    !linha || linha.usadoEm !== null || new Date(linha.expiraEm).getTime() < Date.now();

  if (invalido) {
    return {
      ok: false,
      erro: "Este link expirou ou já foi usado. Solicite a recuperação novamente.",
    };
  }

  const senhaHash = await gerarHashSenha(parsed.data.novaSenha);

  await db.update(usuarios).set({ senhaHash }).where(eq(usuarios.id, linha.usuarioId));

  await db
    .update(tokensRecuperacaoSenha)
    .set({ usadoEm: new Date().toISOString() })
    .where(eq(tokensRecuperacaoSenha.id, linha.id));

  return { ok: true };
}
