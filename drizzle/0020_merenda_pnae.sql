-- Estoque da merenda por escola e as compras do PNAE, com os 30% da
-- agricultura familiar (Lei 11.947/2009, art. 14).
-- Ver src/lib/merenda.ts e src/lib/pnae.ts.

CREATE TABLE IF NOT EXISTS estoque_merenda (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  escola_id text NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  item text NOT NULL,
  categoria text NOT NULL DEFAULT 'outro',
  unidade_medida text NOT NULL DEFAULT 'kg',
  saldo double precision NOT NULL DEFAULT 0,
  consumo_diario double precision NOT NULL DEFAULT 0,
  atualizado_por text NOT NULL,
  atualizado_em text NOT NULL DEFAULT now()::text
);
CREATE INDEX IF NOT EXISTS estoque_merenda_escola ON estoque_merenda (escola_id);
CREATE UNIQUE INDEX IF NOT EXISTS estoque_merenda_item_unico ON estoque_merenda (escola_id, item);
ALTER TABLE estoque_merenda ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS pnae_compras (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  descricao text NOT NULL,
  fornecedor text,
  valor double precision NOT NULL,
  agricultura_familiar boolean NOT NULL DEFAULT false,
  modalidade text NOT NULL DEFAULT 'outra',
  documento text,
  data_compra text NOT NULL,
  registrado_por text NOT NULL,
  created_at text NOT NULL DEFAULT now()::text
);
CREATE INDEX IF NOT EXISTS pnae_compras_ano ON pnae_compras (prefeitura_id, ano, data_compra DESC);
ALTER TABLE pnae_compras ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS pnae_repasses (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  valor double precision NOT NULL,
  motivo_dispensa text,
  observacao text,
  registrado_por text NOT NULL,
  atualizado_em text NOT NULL DEFAULT now()::text
);
CREATE UNIQUE INDEX IF NOT EXISTS pnae_repasses_ano_unico ON pnae_repasses (prefeitura_id, ano);
ALTER TABLE pnae_repasses ENABLE ROW LEVEL SECURITY;
