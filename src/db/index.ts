import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Banco: Postgres via Supabase. DATABASE_URL deve ser a connection string do
// pooler (Settings → Database → Connection string → "Transaction" / porta
// 6543) — é a que funciona bem em ambiente serverless (Vercel). `prepare:
// false` é necessário porque o pooler do Supabase roda em modo transaction,
// que não suporta prepared statements entre requisições.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL não configurado. Defina a connection string do Supabase no .env (veja .env.example)."
  );
}

// ssl: "require" — força criptografia na conexão com o Postgres (o pooler
// da Supabase aceita TLS; sem isso o driver pode tentar conexão em texto
// plano dependendo do ambiente).
const client = postgres(url, { prepare: false, ssl: "require" });

export const db = drizzle(client, { schema });
