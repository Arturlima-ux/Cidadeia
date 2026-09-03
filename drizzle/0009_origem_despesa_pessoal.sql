-- Marca de onde veio cada período de despesa com pessoal.
--
-- Importa porque a tela passa a ter duas fontes com confiabilidades muito
-- diferentes: o RGF publicado no Tesouro é o número oficial que o Tribunal de
-- Contas vai olhar; o valor digitado é a estimativa do contador, normalmente
-- mais atual e menos definitiva. Sem a marca, um sobrescreve o outro sem que
-- ninguém saiba qual está na tela.
ALTER TABLE despesa_pessoal
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';

ALTER TABLE despesa_pessoal DROP CONSTRAINT IF EXISTS despesa_pessoal_origem_check;

ALTER TABLE despesa_pessoal
  ADD CONSTRAINT despesa_pessoal_origem_check
  CHECK (origem IN ('manual', 'siconfi'));
