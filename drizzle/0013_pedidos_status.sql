-- O pedido de proposta passa a ter dono (conta da prefeitura) e caminho
-- (recebido → proposta_enviada → contratado). Ver src/db/schema.ts.
ALTER TABLE pedidos_proposta ADD COLUMN IF NOT EXISTS prefeitura_id text;
ALTER TABLE pedidos_proposta ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'recebido';
ALTER TABLE pedidos_proposta ADD COLUMN IF NOT EXISTS contratado_em text;
