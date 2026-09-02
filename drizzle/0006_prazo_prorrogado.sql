-- Marca a prorrogação formal do prazo de resposta ao cidadão.
--
-- A LAI (art. 11, § 2º) e a Lei 13.460/2017 (art. 16) permitem estender o
-- prazo, mas condicionam isso a justificativa expressa comunicada ao
-- requerente. O painel de prazos só concede os dias extras quando este campo
-- está marcado — deduzir a prorrogação sozinho daria à prefeitura um prazo que
-- ela juridicamente não tem.
ALTER TABLE atendimentos
  ADD COLUMN IF NOT EXISTS prazo_prorrogado boolean NOT NULL DEFAULT false;
