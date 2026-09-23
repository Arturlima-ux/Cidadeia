-- Rede de escolas pelo Censo Escolar/INEP, ocorrências por escola e acesso
-- próprio da direção. Ver src/lib/censo-escolar.ts e src/lib/leitura-escola.ts.
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS codigo_inep text;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS dependencia text;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS localizacao text;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS situacao text;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS etapas text;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS porte text;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS matriculas_censo integer;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS matriculas_atuais integer;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS censo_ano integer;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS dias_previstos integer;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS sincronizado_em text;
CREATE UNIQUE INDEX IF NOT EXISTS escolas_inep_unico ON escolas (prefeitura_id, codigo_inep) WHERE codigo_inep IS NOT NULL;

CREATE TABLE IF NOT EXISTS ocorrencias_escola (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  escola_id text NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  gravidade text NOT NULL DEFAULT 'atencao',
  descricao text NOT NULL,
  aulas_perdidas integer,
  alunos_afetados integer,
  registrado_por text NOT NULL,
  status text NOT NULL DEFAULT 'aberta',
  resolvida_em text,
  created_at text NOT NULL DEFAULT now()::text
);
CREATE INDEX IF NOT EXISTS ocorrencias_escola_escola ON ocorrencias_escola (escola_id, created_at DESC);
ALTER TABLE ocorrencias_escola ENABLE ROW LEVEL SECURITY;

-- Acesso próprio da direção da escola: cargo "escola" com a escola.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS escola_id text;
