-- Resultado por escola (IDEB, distorção idade-série, aprovação, abandono) e
-- o valor aluno/ano do FUNDEB, que transforma a diferença de matrícula em
-- reais. Ver src/lib/resultado-educacao.ts.
--
-- Os 70% do FUNDEB para remuneração (Lei 14.113/2020, art. 26) NÃO entram
-- aqui: já vivem em bases_minimos, com o contador.

CREATE TABLE IF NOT EXISTS educacao_resultados (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  escola_id text REFERENCES escolas(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  etapa text NOT NULL,
  indicador text NOT NULL,
  valor double precision NOT NULL,
  meta double precision,
  observacao text,
  registrado_por text NOT NULL,
  atualizado_em text NOT NULL DEFAULT now()::text
);
-- Um lançamento por escola/ano/etapa/indicador. Em Postgres NULL não colide
-- com NULL num índice único, então a linha da rede inteira (escola_id nulo)
-- precisa do seu próprio índice parcial — sem ele daria para lançar o mesmo
-- resultado da rede várias vezes.
CREATE UNIQUE INDEX IF NOT EXISTS educacao_resultados_escola_unico
  ON educacao_resultados (prefeitura_id, escola_id, ano, etapa, indicador)
  WHERE escola_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS educacao_resultados_rede_unico
  ON educacao_resultados (prefeitura_id, ano, etapa, indicador)
  WHERE escola_id IS NULL;
CREATE INDEX IF NOT EXISTS educacao_resultados_ano ON educacao_resultados (prefeitura_id, ano);
ALTER TABLE educacao_resultados ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS fundeb_educacao (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  valor_aluno_ano double precision NOT NULL,
  observacao text,
  registrado_por text NOT NULL,
  atualizado_em text NOT NULL DEFAULT now()::text
);
CREATE UNIQUE INDEX IF NOT EXISTS fundeb_educacao_ano_unico ON fundeb_educacao (prefeitura_id, ano);
ALTER TABLE fundeb_educacao ENABLE ROW LEVEL SECURITY;
