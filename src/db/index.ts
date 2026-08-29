import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Banco: Postgres via Supabase. DATABASE_URL deve ser a connection string do
// pooler (Settings → Database → Connection string → "Transaction" / porta
// 6543) — é a que funciona bem em ambiente serverless (Vercel). `prepare:
// false` é necessário porque o pooler do Supabase roda em modo transaction,
// que não suporta prepared statements entre requisições.
//
// A conexão é criada PREGUIÇOSAMENTE, no primeiro uso real. Antes, o módulo
// lia DATABASE_URL e lançava erro já na importação — e como o `next build`
// importa as rotas para coletar dados de página, um ambiente de build sem a
// variável derrubava o build inteiro, mesmo sem precisar de banco para
// compilar. Adiar a criação torna o build independente de segredo de runtime
// e mantém a mensagem de erro clara para quem de fato tentar consultar.

type BancoDrizzle = ReturnType<typeof drizzle<typeof schema>>;

let instancia: BancoDrizzle | null = null;

function conectar(): BancoDrizzle {
  if (instancia) return instancia;

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
  instancia = drizzle(client, { schema });
  return instancia;
}

/**
 * Mesma interface de sempre (`db.select()`, `db.insert()`, ...) — o Proxy só
 * adia a conexão até o primeiro acesso a uma propriedade.
 */
export const db = new Proxy({} as BancoDrizzle, {
  get(_alvo, propriedade, receptor) {
    return Reflect.get(conectar(), propriedade, receptor);
  },
  has(_alvo, propriedade) {
    return Reflect.has(conectar(), propriedade);
  },
});
