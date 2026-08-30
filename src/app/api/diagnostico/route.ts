import { NextResponse } from "next/server";
import { db } from "@/db";
import { prefeituras } from "@/db/schema";
import { sql } from "drizzle-orm";

// ── ENDPOINT TEMPORÁRIO DE DIAGNÓSTICO ──
//
// Existe porque no plano Hobby da Vercel o log de runtime é praticamente ao
// vivo: se a requisição já passou, a linha some, e ficamos sem saber por que
// a produção falha. Este endpoint responde a mesma pergunta sob demanda.
//
// REGRA: nunca devolve VALOR de variável de ambiente, só se ela está
// preenchida (true/false). E do erro do banco devolve apenas o código e uma
// mensagem curta já higienizada — a string de conexão do Postgres carrega
// usuário e senha, e não pode vazar num endpoint público de jeito nenhum.
//
// APAGAR depois de diagnosticar. Não é parte do produto.

const VARIAVEIS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "ANTHROPIC_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/** Tira qualquer coisa que pareça credencial da mensagem de erro. */
function higienizar(texto: string): string {
  return texto
    .replace(/postgres(ql)?:\/\/[^\s]*/gi, "postgres://<omitido>")
    .replace(/:[^\s:@/]{4,}@/g, ":<omitido>@")
    .slice(0, 200);
}

export async function GET() {
  const ambiente: Record<string, boolean> = {};
  for (const nome of VARIAVEIS) {
    const valor = process.env[nome];
    ambiente[nome] = typeof valor === "string" && valor.trim() !== "";
  }

  let banco: { ok: boolean; codigo?: string; mensagem?: string };
  const inicio = Date.now();
  try {
    await db.select({ n: sql<number>`count(*)` }).from(prefeituras);
    banco = { ok: true };
  } catch (erro) {
    const e = erro as { code?: string; message?: string };
    banco = {
      ok: false,
      codigo: e.code ?? "sem-codigo",
      mensagem: higienizar(e.message ?? String(erro)),
    };
  }

  return NextResponse.json(
    {
      ambiente,
      banco: { ...banco, msDecorridos: Date.now() - inicio },
      regiao: process.env.VERCEL_REGION ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
