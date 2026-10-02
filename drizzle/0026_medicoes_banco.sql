-- ── DISPONIBILIDADE APURADA, EM VEZ DE PROMETIDA ──
--
-- O acordo de nível de serviço tem uma cláusula de disponibilidade mínima
-- mensal, e ela estava em branco. Fui procurar um percentual defensável e
-- encontrei o contrário: o Supabase não oferece SLA de disponibilidade nos
-- planos Free, Pro ou Team — só no Enterprise.
--
-- Prometer um número a uma prefeitura seria assumir sozinho um risco que o
-- fornecedor não garante, com multa contratual atrelada. E é o que quase todo
-- fornecedor de software público faz: copia "99,9%" de um modelo e torce.
--
-- A saída não é escolher um número melhor. É medir e publicar.
--
-- ── O QUE ESTA TABELA GUARDA ──
--
-- Uma linha por verificação do banco. A rota /api/manter-vivo já executava
-- `select 1` todo dia às 9h, pelo cron do vercel.json, e já media a latência —
-- e jogava fora. Guardar custa uma linha por dia.
--
-- Com isso a cláusula passa a dizer onde a disponibilidade é publicada, em vez
-- de afirmar um percentual. Quem vai assinar confere em vez de acreditar.
--
-- A tabela NÃO tem prefeitura_id: a medição é da plataforma inteira, não de um
-- município. É o único dado do sistema que é legitimamente global.

CREATE TABLE IF NOT EXISTS medicoes_banco (
  id text PRIMARY KEY,
  -- Instante da verificação, em ISO. Texto, como o resto do schema.
  verificado_em text NOT NULL,
  -- true quando o `select 1` respondeu.
  ok boolean NOT NULL,
  -- Latência em milissegundos. Serve para notar degradação antes de virar
  -- queda: um número que sai de 500ms para 5s é aviso.
  ms integer NOT NULL,
  -- Nome do erro quando falhou. NUNCA a mensagem crua, que pode conter a
  -- string de conexão.
  detalhe text,
  -- De onde veio a verificação: "cron" (automática) ou "manual".
  origem text NOT NULL DEFAULT 'cron'
);

ALTER TABLE medicoes_banco ENABLE ROW LEVEL SECURITY;

-- A página de disponibilidade varre por data, do mais recente para trás.
CREATE INDEX IF NOT EXISTS medicoes_banco_data_idx
  ON medicoes_banco (verificado_em DESC);

-- ── POR QUE NÃO HÁ LIMPEZA AUTOMÁTICA AQUI ──
--
-- Uma linha por dia são 365 por ano. O histórico é justamente o que dá valor
-- à publicação: "disponível em 364 dos últimos 365 dias" só pode ser dito por
-- quem guardou os 365. Apagar o passado para economizar espaço seria apagar a
-- única prova que a cláusula oferece.
