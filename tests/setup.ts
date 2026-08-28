// Roda antes da suíte de testes. Usa SQLite em memória (via libsql) com um
// schema espelho (./tests/schema.ts) — leve o suficiente para esta máquina.
// Ver o comentário em tests/schema.ts para o motivo de não usar Postgres
// real/emulado aqui. Substitui @/db e @/db/schema em todos os módulos que os
// testes importam (inclusive os que a própria aplicação usa, como
// src/lib/dados-prefeitura.ts e src/lib/rate-limit.ts) por esta instância.
import { vi } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

process.env.AUTH_SECRET = "chave-de-teste-nao-usar-em-producao-0123456789";

const client = createClient({ url: ":memory:" });
const db = drizzle(client, { schema });

await client.batch([
  `CREATE TABLE prefeituras (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL, estado TEXT NOT NULL,
    municipio TEXT NOT NULL, cnpj TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE usuarios (
    id TEXT PRIMARY KEY, prefeitura_id TEXT NOT NULL, cpf_cnpj TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL, email TEXT, nome TEXT NOT NULL,
    cargo TEXT NOT NULL DEFAULT 'admin', secretaria TEXT,
    created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'
  )`,
  `CREATE TABLE alertas (
    id TEXT PRIMARY KEY, prefeitura_id TEXT NOT NULL, titulo TEXT NOT NULL,
    descricao TEXT, prioridade TEXT NOT NULL DEFAULT 'info', secretaria TEXT,
    resolvido INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'
  )`,
  `CREATE TABLE alertas_sugeridos (
    id TEXT PRIMARY KEY, prefeitura_id TEXT NOT NULL, titulo TEXT NOT NULL,
    descricao TEXT, prioridade TEXT NOT NULL DEFAULT 'info', secretaria TEXT,
    justificativa TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendente',
    created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'
  )`,
  `CREATE TABLE tentativas_login (
    documento TEXT PRIMARY KEY, tentativas INTEGER NOT NULL DEFAULT 0,
    bloqueado_ate TEXT, ultima_tentativa TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'
  )`,
  `CREATE TABLE limites_uso (
    chave TEXT PRIMARY KEY, contagem INTEGER NOT NULL DEFAULT 0,
    janela_inicio TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'
  )`,
  `CREATE TABLE investimentos (
    id TEXT PRIMARY KEY, prefeitura_id TEXT NOT NULL, secretaria TEXT NOT NULL,
    valor INTEGER NOT NULL, descricao TEXT, competencia TEXT NOT NULL,
    origem TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'
  )`,
], "write");

vi.mock("@/db", () => ({ db }));
vi.mock("@/db/schema", () => schema);
