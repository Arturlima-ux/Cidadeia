-- Publicações do portal da transparência.
--
-- A metade do portal que faltava: onde a prefeitura publica e o cidadão apenas
-- lê. Os tipos são fechados porque cada um corresponde a uma exigência de
-- conteúdo da LAI ou da Lei 13.460 — é o que permite ao painel apontar qual
-- inciso continua descoberto, em vez de o portal virar um blog.
CREATE TABLE IF NOT EXISTS publicacoes (
  id             text PRIMARY KEY,
  prefeitura_id  text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  tipo           text NOT NULL CHECK (tipo IN ('comunicado','servico','estrutura','faq','repasse','documento')),
  titulo         text NOT NULL,
  conteudo       text NOT NULL,
  secretaria     text,
  requisitos     text,
  prazo          text,
  contato        text,
  link_externo   text,
  -- Rascunho por padrão: publicar é ato deliberado.
  publicado      boolean NOT NULL DEFAULT false,
  atualizado_em  text NOT NULL DEFAULT now()::text,
  created_at     text NOT NULL DEFAULT now()::text
);

-- O portal lê por prefeitura e tipo, filtrando o que está publicado.
CREATE INDEX IF NOT EXISTS publicacoes_portal
  ON publicacoes (prefeitura_id, tipo, publicado);

ALTER TABLE publicacoes ENABLE ROW LEVEL SECURITY;
