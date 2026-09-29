-- ── CONTRATOS ──
--
-- A etapa anterior trouxe as CONTRATAÇÕES do PNCP (o edital, o processo). Falta
-- o que vem depois dele e é onde mora o risco que tira prefeito do cargo:
--
--   1. QUEM VENCEU. A consulta de contratações não informa fornecedor, então o
--      detector de concentração rodava sobre um campo digitado à mão, casando
--      empresas por semelhança de nome. Aqui vem o CNPJ, que é identidade.
--
--   2. ATÉ QUANDO VALE. Medido em São Sepé/RS em 29/09/2026: 39 contratos já
--      vencidos e 27 vencendo em 90 dias, três deles no dia seguinte. Contrato
--      que vence sem ninguém ver é o começo da sequência que termina em
--      fracionamento — o serviço não pode parar, entra dispensa emergencial,
--      a emergencial vira duas, e a soma passa do limite do art. 75.
--
--   3. QUANTO CRESCEU. valor_inicial contra valor_global é o que o art. 125
--      limita a 25% (50% em reforma).
--
-- ── SOBRE fornecedor_documento ──
--
-- Guarda CNPJ ou CPF conforme o contratado. Dos 134 contratos medidos, 16 são
-- com pessoa física (locação de área de terra, shows de festejos) — e aí o
-- campo é CPF, que é dado pessoal ainda que publicado no portal. A coluna
-- existe porque é a única identidade confiável para agrupar contratos do mesmo
-- contratado; a exibição mascara o CPF (ver lib/contratos-pncp.ts). Publicidade
-- legal no PNCP não é licença para reproduzir CPF inteiro em tela nossa.

CREATE TABLE IF NOT EXISTS contratos (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,

  -- Identificador do contrato no PNCP. Único no país; null quando cadastrado
  -- à mão.
  numero_controle_pncp text,
  -- Identificador da CONTRATAÇÃO que originou o contrato. É a junção com
  -- licitacoes.numero_controle_pncp. Nos dados reais, 100% dos contratos
  -- trazem este campo preenchido.
  numero_controle_pncp_compra text,

  numero_contrato text,
  processo text,
  objeto text NOT NULL,

  fornecedor_documento text,
  fornecedor_nome text,
  -- "PJ" ou "PF". Decide se o documento é CNPJ ou CPF, e portanto se a tela
  -- mascara.
  fornecedor_tipo_pessoa text,

  valor_inicial double precision,
  valor_global double precision,

  data_assinatura text,
  vigencia_inicio text,
  vigencia_fim text,

  tipo_contrato text,
  categoria text,
  fruto_adesao boolean NOT NULL DEFAULT false,
  numero_retificacao integer,

  origem text NOT NULL DEFAULT 'manual',
  created_at text NOT NULL DEFAULT now()::text
);

ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

-- Torna a reimportação idempotente, do mesmo jeito que em licitacoes: clicar
-- duas vezes não cria segunda cópia. Parcial porque contrato digitado à mão
-- não tem a chave.
CREATE UNIQUE INDEX IF NOT EXISTS contratos_pncp_unico
  ON contratos (prefeitura_id, numero_controle_pncp)
  WHERE numero_controle_pncp IS NOT NULL;

CREATE INDEX IF NOT EXISTS contratos_prefeitura_idx
  ON contratos (prefeitura_id);

-- O radar de vigência varre por data de fim dentro da prefeitura; é a consulta
-- que a tela faz em toda abertura.
CREATE INDEX IF NOT EXISTS contratos_vigencia_idx
  ON contratos (prefeitura_id, vigencia_fim);

-- A junção com o processo de licitação.
CREATE INDEX IF NOT EXISTS contratos_compra_idx
  ON contratos (prefeitura_id, numero_controle_pncp_compra);
