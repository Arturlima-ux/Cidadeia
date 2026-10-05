"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { prefeituras, usuarios } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { gerarHashSenha, senhaForte } from "@/lib/senha";
import { normalizarDocumento, validarCpfOuCnpj } from "@/lib/documento";
import { criarSessao } from "@/lib/sessao";
import { ehAdmin } from "@/lib/pedidos";
import { codigoConfere, PREFEITURA_EQUIPE_ID } from "@/lib/equipe";

// ── CRIAR A CONTA DA EQUIPE ──
//
// Nome, CPF, e-mail e senha. Sem estado, município nem CNPJ: a equipe não é
// prefeitura. Duas travas, e as duas precisam passar:
//
// 1. o código de criação (EQUIPE_CODIGO, na Vercel), que só quem tem acesso
//    ao projeto conhece;
// 2. o e-mail estar em ADMIN_EMAILS.
//
// A conta entra na prefeitura interna da equipe (lib/equipe.ts), que é criada
// aqui na primeira vez e não aparece em lista pública nenhuma.

const schema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome."),
  documento: z.string().refine((v) => validarCpfOuCnpj(v), "CPF inválido."),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string(),
  codigo: z.string().min(1, "Informe o código de criação."),
});

export type ResultadoEquipe = { ok: false; erro: string; campo?: string };

export async function criarContaEquipe(entrada: unknown): Promise<ResultadoEquipe> {
  const parsed = schema.safeParse(entrada);
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, erro: p?.message ?? "Dados inválidos.", campo: String(p?.path?.[0] ?? "") };
  }
  const d = parsed.data;

  // Mesma mensagem para código errado e código não configurado: quem tenta
  // adivinhar não descobre qual dos dois é.
  if (!codigoConfere(d.codigo)) {
    return { ok: false, erro: "Código de criação incorreto.", campo: "codigo" };
  }
  if (!ehAdmin(d.email)) {
    return {
      ok: false,
      erro: "Este e-mail não está na lista da equipe (ADMIN_EMAILS, na Vercel).",
      campo: "email",
    };
  }
  const forte = senhaForte(d.senha);
  if (!forte.ok) return { ok: false, erro: forte.motivo!, campo: "senha" };

  const documento = normalizarDocumento(d.documento);
  const [existente] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.cpfCnpj, documento))
    .limit(1);
  if (existente) {
    return {
      ok: false,
      erro: "Este CPF já tem conta no CidadeIA. Para a equipe, use outro CPF ou peça para remover a conta antiga.",
      campo: "documento",
    };
  }

  const usuarioId = gerarId("user");
  try {
    const [interna] = await db
      .select({ id: prefeituras.id })
      .from(prefeituras)
      .where(eq(prefeituras.id, PREFEITURA_EQUIPE_ID))
      .limit(1);
    if (!interna) {
      await db.insert(prefeituras).values({
        id: PREFEITURA_EQUIPE_ID,
        nome: "Equipe CidadeIA",
        estado: "--",
        municipio: "Equipe interna",
        // Não é CNPJ: a coluna exige um valor único, e este não colide com
        // nenhum documento real (tem letras).
        cnpj: "EQUIPE-CIDADEIA",
        planosContratados: "[]",
      });
    }
    await db.insert(usuarios).values({
      id: usuarioId,
      prefeituraId: PREFEITURA_EQUIPE_ID,
      cpfCnpj: documento,
      senhaHash: await gerarHashSenha(d.senha),
      email: d.email.trim().toLowerCase(),
      nome: d.nome,
      cargo: "admin",
    });
  } catch (e) {
    console.error("[equipe] conta não criada:", e);
    return { ok: false, erro: "Não foi possível criar a conta agora. Tente de novo em instantes." };
  }

  await criarSessao({ usuarioId, prefeituraId: PREFEITURA_EQUIPE_ID, nome: d.nome, cargo: "admin" });
  redirect("/admin/pedidos");
}
