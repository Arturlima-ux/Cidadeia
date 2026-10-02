-- ── MEDIR SEM RASTREAR ──
--
-- O pedido era Google Analytics e Meta Pixel. Os dois contradizem o produto:
-- o acordo de tratamento de dados que vai ao jurídico da prefeitura declara
-- onde o dado fica e que não vai para terceiros, e a LGPD exige consentimento
-- para cookie não essencial. Uma GovTech que vende conformidade carregando o
-- Pixel da Meta é a primeira incoerência que um procurador acha.
--
-- A medição fica aqui, no próprio banco. Sem cookie, sem script de terceiro,
-- sem banner de consentimento — porque não há o que consentir quando não se
-- guarda dado pessoal.
--
-- ── O QUE ESTA TABELA NÃO TEM ──
--
-- IP. Navegador. Cookie. Identificador que atravesse o dia.
--
-- `visitante` é HMAC(segredo, dia) sobre o IP TRUNCADO e o navegador. Muda
-- sozinho à meia-noite, então ninguém é seguido de um dia para o outro — nem
-- por nós. E sem o segredo não volta ao IP, que é o que separa isto de
-- "anonimização" de fachada: hash de IP puro não é anônimo, porque IPv4 tem
-- 4 bilhões de valores e qualquer um os percorre em minutos.
--
-- `dispositivo` guarda uma de duas palavras. Versão de sistema e modelo de
-- aparelho são o que torna uma impressão digital única, e não servem para
-- decisão nenhuma aqui.
--
-- `origem` guarda só o host. O caminho completo de onde a pessoa veio pode
-- trazer busca, identificador de campanha e às vezes dado de sessão de outro
-- site.
--
-- ── NÃO TEM prefeitura_id ──
--
-- A maior parte destes eventos acontece ANTES de existir prefeitura: são
-- visitantes do site público. É a segunda tabela global do sistema, junto com
-- medicoes_banco.

CREATE TABLE IF NOT EXISTS eventos (
  id text PRIMARY KEY,
  -- visita | raio_x | demo | proposta_aberta | proposta_enviada |
  -- kit_baixado | modulo
  tipo text NOT NULL,
  caminho text NOT NULL,

  -- Município consultado, quando o evento é sobre um.
  uf text,
  codigo_ibge text,
  municipio text,

  -- Rótulo livre: chave do módulo, documento do kit. Nunca dado de pessoa.
  detalhe text,

  -- Resumo do dia. Ver o cabeçalho.
  visitante text NOT NULL,
  origem text,
  dispositivo text NOT NULL,

  criado_em text NOT NULL DEFAULT now()::text
);

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- O funil conta por tipo dentro de um período.
CREATE INDEX IF NOT EXISTS eventos_tipo_data_idx ON eventos (tipo, criado_em DESC);

-- Visitante único por dia, e municípios mais consultados.
CREATE INDEX IF NOT EXISTS eventos_data_idx ON eventos (criado_em DESC);
CREATE INDEX IF NOT EXISTS eventos_municipio_idx ON eventos (uf, municipio) WHERE municipio IS NOT NULL;
