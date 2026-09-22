-- Rede de saúde pelo CNES e ocorrências por unidade. Ver src/lib/cnes.ts.
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS codigo_cnes text;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS codigo_tipo_unidade integer;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS esfera text;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS turno text;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS atende_sus boolean;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS hospitalar boolean;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS centro_cirurgico boolean;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS centro_obstetrico boolean;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS cnes_atualizado_em text;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS sincronizado_em text;
ALTER TABLE unidades_saude ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS unidades_saude_cnes_unico ON unidades_saude (prefeitura_id, codigo_cnes) WHERE codigo_cnes IS NOT NULL;

CREATE TABLE IF NOT EXISTS ocorrencias_saude (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  unidade_id text NOT NULL REFERENCES unidades_saude(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  gravidade text NOT NULL DEFAULT 'atencao',
  descricao text NOT NULL,
  registrado_por text NOT NULL,
  status text NOT NULL DEFAULT 'aberta',
  resolvida_em text,
  created_at text NOT NULL DEFAULT now()::text
);
CREATE INDEX IF NOT EXISTS ocorrencias_saude_unidade ON ocorrencias_saude (unidade_id, created_at DESC);
ALTER TABLE ocorrencias_saude ENABLE ROW LEVEL SECURITY;
