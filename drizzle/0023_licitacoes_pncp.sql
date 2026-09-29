-- ── A CHAVE DO PNCP NO CADASTRO DE PROCESSOS ──
--
-- Os processos de licitação passam a entrar pelo próprio PNCP, onde todo
-- município é obrigado a publicar desde abril de 2024. Num município de
-- verdade (medido: São Sepé/RS, 2026) são 496 contratações no ano — ninguém
-- digita isso à mão, e enquanto não entram, a verificação de fracionamento
-- roda sobre a amostra que alguém teve paciência de cadastrar.
--
-- ── POR QUE A COLUNA É O NÚMERO DE CONTROLE, E NÃO O NÚMERO DO PROCESSO ──
--
-- Casávamos processo local com processo do portal pelo número + ano. Nos dados
-- reais isso não funciona: 496 contratações do mesmo CNPJ no mesmo ano têm só
-- 416 pares número+ano distintos, porque a numeração do PNCP REINICIA POR
-- MODALIDADE. "Dispensa 5/2026" e "Pregão 5/2026" convivem.
--
-- A consequência era o erro na direção pior. Um processo cadastrado como
-- "Dispensa 5/2026" encontrava o "Pregão 5/2026" do portal e a tela dizia
-- PUBLICADO — ou seja, tranquilizava o gestor sobre um contrato que, não tendo
-- divulgação, não produz efeito (art. 94 da Lei 14.133/2021) e transforma o
-- pagamento em despesa irregular na conta dele.
--
-- numeroControlePNCP é único no país e vem em toda resposta da consulta.
-- Guardá-lo faz o casamento ser exato onde ele pode ser exato.

ALTER TABLE licitacoes
  ADD COLUMN IF NOT EXISTS numero_controle_pncp text;

-- A unicidade é por prefeitura porque o mesmo identificador jamais se repete
-- dentro de um CNPJ, e é o que torna a importação idempotente: reimportar o
-- ano não cria segunda cópia, mesmo que alguém clique duas vezes.
--
-- Parcial (WHERE NOT NULL) porque processo cadastrado à mão não tem essa chave,
-- e um índice único sobre vários NULL só funciona assim em algumas versões —
-- melhor ser explícito do que depender do comportamento padrão.
CREATE UNIQUE INDEX IF NOT EXISTS licitacoes_pncp_unico
  ON licitacoes (prefeitura_id, numero_controle_pncp)
  WHERE numero_controle_pncp IS NOT NULL;

-- A tela lista e filtra processos por prefeitura em toda abertura; com centenas
-- de linhas por município isso deixa de ser desprezível.
CREATE INDEX IF NOT EXISTS licitacoes_prefeitura_idx
  ON licitacoes (prefeitura_id);
