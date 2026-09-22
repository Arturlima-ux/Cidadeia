-- Componente de qualidade da APS: resultado por indicador e quadrimestre.
-- Ver src/lib/aps.ts (Portaria GM/MS 3.493/2024; fonte SIAPS).
CREATE TABLE IF NOT EXISTS aps_resultados (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  indicador text NOT NULL,
  equipe text,
  ano integer NOT NULL,
  quadrimestre integer NOT NULL,
  resultado double precision NOT NULL,
  meta double precision,
  observacao text,
  registrado_por text NOT NULL,
  atualizado_em text NOT NULL DEFAULT now()::text
);
CREATE UNIQUE INDEX IF NOT EXISTS aps_resultados_unico
  ON aps_resultados (prefeitura_id, indicador, COALESCE(equipe, ''), ano, quadrimestre);
ALTER TABLE aps_resultados ENABLE ROW LEVEL SECURITY;
