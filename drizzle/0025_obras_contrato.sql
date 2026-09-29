-- ── A OBRA PASSA A TER PRAZO DE VERDADE ──
--
-- O módulo comparava progresso_atual com progresso_esperado. Os dois eram
-- digitados à mão, e o segundo é um número que alguém inventou: não existe
-- fonte para "a esta altura a obra deveria estar em 60%". Comparar um palpite
-- com outro produz alerta de atraso que não sustenta conversa — o prefeito
-- pergunta de onde saiu o número e não há resposta.
--
-- O contrato tem a resposta, e ele já está no banco. Obra municipal não tem
-- cadastro nacional obrigatório (o Obrasgov existe e é bom, mas a adesão do
-- município é FACULTATIVA: medido no Piauí, 9 de 400 projetos têm tomador
-- municipal, e só 7 dos 224 municípios do estado aparecem). O contrato de obra,
-- esse sim, é obrigatório no PNCP desde abril de 2024 — num município medido,
-- 16 dos 134 contratos são de Obras ou Serviços de Engenharia, R$ 9,4 milhões,
-- 10 deles com a vigência já encerrada.

ALTER TABLE obras
  ADD COLUMN IF NOT EXISTS numero_controle_pncp_contrato text,
  ADD COLUMN IF NOT EXISTS vigencia_inicio text,
  ADD COLUMN IF NOT EXISTS vigencia_fim text,
  ADD COLUMN IF NOT EXISTS fornecedor_nome text,
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';

-- ── POR QUE progresso_atual PASSA A ACEITAR NULL ──
--
-- Ele é NOT NULL DEFAULT 0, então "ninguém informou" e "a obra está em 0%" são
-- a mesma linha no banco. São coisas muito diferentes na tela: a primeira é um
-- pedido de medição à fiscalização, a segunda é uma obra que não saiu do papel.
--
-- Pior: uma obra importada do contrato entraria automaticamente como 0%, e a
-- tela afirmaria progresso zero sobre obra que ninguém mediu — inventando um
-- fato contra a prefeitura. NULL é a única forma de dizer "não sei".
--
-- As linhas existentes ficam com o valor que têm; nenhuma vira NULL aqui.
ALTER TABLE obras
  ALTER COLUMN progresso_atual DROP NOT NULL;

-- Idempotência da importação: reimportar o ano não cria segunda cópia da obra.
CREATE UNIQUE INDEX IF NOT EXISTS obras_contrato_unico
  ON obras (prefeitura_id, numero_controle_pncp_contrato)
  WHERE numero_controle_pncp_contrato IS NOT NULL;

CREATE INDEX IF NOT EXISTS obras_prefeitura_idx
  ON obras (prefeitura_id);
