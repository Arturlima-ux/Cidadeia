-- ── O CAMINHO ATÉ O DINHEIRO ──
-- Outubro de 2026: o módulo só liga depois do primeiro pagamento, a cobrança
-- é mensal e antecipada, e a conta trava se a fatura passar da carência.
-- Regra em src/lib/cobranca.ts.

ALTER TABLE pedidos_proposta
  ADD COLUMN IF NOT EXISTS numero_contrato text,
  ADD COLUMN IF NOT EXISTS numero_empenho text,
  ADD COLUMN IF NOT EXISTS valor_contratado double precision,
  ADD COLUMN IF NOT EXISTS dia_vencimento integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS ativado_em text,
  ADD COLUMN IF NOT EXISTS motivo_perda text;

-- Pedidos que já estavam "contratado" no modelo antigo tinham os módulos
-- ligados na assinatura. Passam a "ativo" para não serem cobrados de novo
-- pela primeira fatura nem lidos como "aguardando pagamento".
UPDATE pedidos_proposta SET status = 'ativo', ativado_em = contratado_em
  WHERE status = 'contratado';

CREATE TABLE IF NOT EXISTS pedido_eventos (
  id text PRIMARY KEY,
  pedido_id text NOT NULL,
  tipo text NOT NULL,
  descricao text NOT NULL,
  autor text NOT NULL,
  criado_em text NOT NULL DEFAULT now()::text
);
ALTER TABLE pedido_eventos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS pedido_eventos_pedido_idx ON pedido_eventos (pedido_id, criado_em);

CREATE TABLE IF NOT EXISTS faturas (
  id text PRIMARY KEY,
  pedido_id text NOT NULL,
  competencia text NOT NULL,
  valor double precision NOT NULL,
  vencimento text NOT NULL,
  status text NOT NULL DEFAULT 'aberta',
  paga_em text,
  forma_pagamento text,
  nota_fiscal text,
  observacao text,
  aviso_enviado text,
  created_at text NOT NULL DEFAULT now()::text
);
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS faturas_pedido_idx ON faturas (pedido_id, competencia);
CREATE INDEX IF NOT EXISTS faturas_abertas_idx ON faturas (vencimento) WHERE status = 'aberta';
