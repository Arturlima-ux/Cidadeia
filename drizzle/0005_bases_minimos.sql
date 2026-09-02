-- Base de cálculo dos mínimos constitucionais de educação e saúde.
--
-- Escrito à mão, em Postgres: as migrations 0000-0004 foram geradas quando o
-- projeto ainda usava SQLite (crases no lugar de aspas) e os snapshots em
-- drizzle/meta estão corrompidos, então `drizzle-kit generate` não produz
-- saída aplicável neste banco.
--
-- RLS habilitada como em todas as outras tabelas: a aplicação conecta como
-- dona e passa por cima dela, mas a política fecha a API PostgREST que o
-- Supabase expõe sozinho.
CREATE TABLE IF NOT EXISTS bases_minimos (
  id              text PRIMARY KEY,
  prefeitura_id   text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  exercicio       integer NOT NULL,
  area            text NOT NULL CHECK (area IN ('educacao', 'saude')),
  base_calculo    double precision NOT NULL,
  aplicado        double precision NOT NULL,
  mes_referencia  integer NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  origem_aplicado text NOT NULL DEFAULT 'manual' CHECK (origem_aplicado IN ('manual', 'siconfi')),
  atualizado_em   text NOT NULL DEFAULT now()::text
);

-- Um registro por prefeitura, exercício e área. É o que permite o formulário
-- gravar sem duplicar e o painel ler sem ordenar por data.
CREATE UNIQUE INDEX IF NOT EXISTS bases_minimos_unico
  ON bases_minimos (prefeitura_id, exercicio, area);

ALTER TABLE bases_minimos ENABLE ROW LEVEL SECURITY;
