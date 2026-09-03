-- Duas obrigações da mesma família dos mínimos, escritas à mão em Postgres
-- pelo motivo já registrado na 0005: as migrations 0000-0004 nasceram no
-- dialeto do SQLite e os snapshots em drizzle/meta estão corrompidos, então
-- `drizzle-kit generate` não produz saída aplicável neste banco.

-- ── 1. FUNDEB como terceira área de mínimo ──
--
-- O CHECK da 0005 fechava a coluna em ('educacao','saude'). Sem soltá-lo, o
-- INSERT do formulário falharia no banco depois de passar por toda a validação
-- da aplicação — o pior lugar para descobrir o erro.
ALTER TABLE bases_minimos DROP CONSTRAINT IF EXISTS bases_minimos_area_check;

ALTER TABLE bases_minimos
  ADD CONSTRAINT bases_minimos_area_check
  CHECK (area IN ('educacao', 'saude', 'fundeb'));

-- ── 2. Teto de despesa com pessoal ──
--
-- Sem UNIQUE por exercício: o art. 23 da LRF conta o prazo de recondução em
-- períodos de apuração, então o histórico É o dado. Guardar só o último
-- período tornaria impossível dizer se a prefeitura cortou o terço exigido.
CREATE TABLE IF NOT EXISTS despesa_pessoal (
  id             text PRIMARY KEY,
  prefeitura_id  text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  exercicio      integer NOT NULL,
  mes_referencia integer NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  rcl            double precision NOT NULL,
  despesa        double precision NOT NULL,
  atualizado_em  text NOT NULL DEFAULT now()::text
);

-- Um registro por período de apuração. Reenviar o mesmo mês corrige o número
-- em vez de criar uma segunda verdade sobre o mesmo período — o contador
-- costuma revisar a RCL depois de fechada.
CREATE UNIQUE INDEX IF NOT EXISTS despesa_pessoal_periodo
  ON despesa_pessoal (prefeitura_id, exercicio, mes_referencia);

-- Leitura do painel: a série cronológica da prefeitura, que é como o cálculo
-- de recondução consome os dados.
CREATE INDEX IF NOT EXISTS despesa_pessoal_serie
  ON despesa_pessoal (prefeitura_id, exercicio DESC, mes_referencia DESC);

ALTER TABLE despesa_pessoal ENABLE ROW LEVEL SECURITY;
