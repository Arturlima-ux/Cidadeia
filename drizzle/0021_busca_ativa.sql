-- Busca ativa escolar: um caso por aluno que sumiu, com as tentativas
-- datadas. É esse registro que a lei chama de "esgotados os recursos
-- escolares" (ECA, art. 56, II) e que vira o ofício ao Conselho Tutelar.
-- Ver src/lib/busca-ativa.ts.
--
-- Dado de criança: nome e turma, nada além. Sem CPF, sem NIS, sem endereço.

CREATE TABLE IF NOT EXISTS busca_ativa (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  escola_id text NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  aluno_nome text NOT NULL,
  aluno_turma text,
  idade integer,
  faltas integer NOT NULL DEFAULT 0,
  aulas_periodo integer NOT NULL DEFAULT 0,
  periodo text NOT NULL,
  ultima_presenca text,
  bolsa_familia boolean NOT NULL DEFAULT false,
  situacao text NOT NULL DEFAULT 'aberta',
  contato_familia_em text,
  visita_em text,
  conselho_tutelar_em text,
  ministerio_publico_em text,
  observacao text,
  registrado_por text NOT NULL,
  atualizado_em text NOT NULL DEFAULT now()::text,
  created_at text NOT NULL DEFAULT now()::text
);
CREATE INDEX IF NOT EXISTS busca_ativa_escola ON busca_ativa (escola_id, created_at DESC);
CREATE INDEX IF NOT EXISTS busca_ativa_situacao ON busca_ativa (prefeitura_id, situacao);
ALTER TABLE busca_ativa ENABLE ROW LEVEL SECURITY;
