-- Trilha de auditoria: quem mudou o quê, quando. Ver src/lib/auditoria.ts.
CREATE TABLE IF NOT EXISTS auditoria (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  usuario_id text NOT NULL,
  usuario_nome text NOT NULL,
  usuario_cargo text NOT NULL,
  acao text NOT NULL,
  entidade text NOT NULL,
  entidade_id text,
  resumo text NOT NULL,
  created_at text NOT NULL DEFAULT now()::text
);
CREATE INDEX IF NOT EXISTS auditoria_prefeitura_data ON auditoria (prefeitura_id, created_at DESC);
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
