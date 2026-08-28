import type { Config } from "drizzle-kit";

// Migrations rodam contra a connection direta (porta 5432, sem pooler) —
// o pooler em modo transaction (porta 6543) não suporta os comandos DDL que
// o drizzle-kit precisa rodar. Em runtime a app usa DATABASE_URL (pooler);
// aqui usamos DIRECT_URL, ou caímos para DATABASE_URL se não houver uma
// connection direta separada configurada.
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
} satisfies Config;
