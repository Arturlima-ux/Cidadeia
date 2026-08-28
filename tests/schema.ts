// Espelho mínimo do schema de produção (src/db/schema.ts, Postgres) em
// SQLite — só as tabelas e colunas que os testes de fato tocam. Existe
// porque rodar um Postgres real ou emulado (PGlite, pg-mem) nesta máquina
// não é viável: só 4GB de RAM, e um Postgres em WASM estoura a memória
// disponível (testado e confirmado). SQLite em memória via libsql é leve o
// suficiente e cobre a mesma coisa que os testes verificam de verdade: que
// as queries filtram por prefeitura/documento corretamente — não é um teste
// de compatibilidade com o dialeto Postgres.
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const prefeituras = sqliteTable("prefeituras", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  estado: text("estado").notNull(),
  municipio: text("municipio").notNull(),
  cnpj: text("cnpj").notNull().unique(),
});

export const usuarios = sqliteTable("usuarios", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id").notNull(),
  cpfCnpj: text("cpf_cnpj").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  email: text("email"),
  nome: text("nome").notNull(),
  cargo: text("cargo", { enum: ["prefeito", "secretario", "admin"] })
    .notNull()
    .default("admin"),
  secretaria: text("secretaria"),
  createdAt: text("created_at").notNull().default("1970-01-01T00:00:00.000Z"),
});

export const alertas = sqliteTable("alertas", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  prioridade: text("prioridade", { enum: ["urgente", "medio", "info"] })
    .notNull()
    .default("info"),
  secretaria: text("secretaria"),
  resolvido: integer("resolvido", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default("1970-01-01T00:00:00.000Z"),
});

export const alertasSugeridos = sqliteTable("alertas_sugeridos", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  prioridade: text("prioridade", { enum: ["urgente", "medio", "info"] })
    .notNull()
    .default("info"),
  secretaria: text("secretaria"),
  justificativa: text("justificativa").notNull(),
  status: text("status", { enum: ["pendente", "descartado"] })
    .notNull()
    .default("pendente"),
  createdAt: text("created_at").notNull().default("1970-01-01T00:00:00.000Z"),
});

export const tentativasLogin = sqliteTable("tentativas_login", {
  documento: text("documento").primaryKey(),
  tentativas: integer("tentativas").notNull().default(0),
  bloqueadoAte: text("bloqueado_ate"),
  ultimaTentativa: text("ultima_tentativa").notNull().default("1970-01-01T00:00:00.000Z"),
});

// Limite genérico de uso — protege endpoints caros (chamadas de IA,
// importação do SICONFI) contra abuso e custo descontrolado.
export const limitesUso = sqliteTable("limites_uso", {
  chave: text("chave").primaryKey(),
  contagem: integer("contagem").notNull().default(0),
  janelaInicio: text("janela_inicio").notNull().default("1970-01-01T00:00:00.000Z"),
});

// Investimento por secretaria (manual ou importado do Tesouro Nacional).
export const investimentos = sqliteTable("investimentos", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id").notNull(),
  secretaria: text("secretaria").notNull(),
  valor: integer("valor").notNull(),
  descricao: text("descricao"),
  competencia: text("competencia").notNull(),
  origem: text("origem").notNull().default("manual"),
  createdAt: text("created_at").notNull().default("1970-01-01T00:00:00.000Z"),
});
