-- Estoque por unidade de saúde, em dias de cobertura. Ver src/lib/estoque-saude.ts.
CREATE TABLE IF NOT EXISTS estoque_saude (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  unidade_id text NOT NULL REFERENCES unidades_saude(id) ON DELETE CASCADE,
  item text NOT NULL,
  categoria text NOT NULL DEFAULT 'medicamento',
  unidade_medida text NOT NULL DEFAULT 'unidade',
  saldo double precision NOT NULL DEFAULT 0,
  consumo_mensal double precision NOT NULL DEFAULT 0,
  atualizado_por text NOT NULL,
  atualizado_em text NOT NULL DEFAULT now()::text
);
CREATE UNIQUE INDEX IF NOT EXISTS estoque_saude_unidade_item ON estoque_saude (unidade_id, item);
ALTER TABLE estoque_saude ENABLE ROW LEVEL SECURITY;
