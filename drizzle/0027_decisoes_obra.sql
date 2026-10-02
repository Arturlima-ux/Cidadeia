-- ── A DECISÃO SOBRE A OBRA QUE PASSOU DO PRAZO ──
--
-- O módulo apontava a obra cujo prazo acabou sem conclusão e parava ali. O
-- gestor via o problema e não tinha onde registrar o que decidiu — nem a
-- justificativa que o Tribunal de Contas vai pedir depois, quando perguntar
-- por que a obra ficou parada e ninguém fez nada.
--
-- Apontar sem permitir agir transforma o sistema em acusador.
--
-- ── AS DECISÕES SAEM DO ART. 111 DA LEI 14.133/2021 ──
--
-- Obra é contratação de escopo predefinido, e pelo caput a vigência é
-- AUTOMATICAMENTE prorrogada quando o objeto não é concluído no prazo. O que
-- não prorroga sozinho é a responsabilidade: pelo parágrafo único, culpa do
-- contratado o constitui em mora com sanções (inciso I), e a Administração
-- pode optar pela extinção, adotando medidas para a continuidade (inciso II).
--
-- Por isso as opções não são um menu inventado: são as hipóteses da lei, mais
-- duas administrativas (a obra acabou; a data estava errada).
--
-- ── POR QUE É HISTÓRICO, E NÃO UM CAMPO NA OBRA ──
--
-- Uma obra pode ser prorrogada, depois prorrogada de novo, depois extinta. Um
-- campo guardaria só a última e apagaria o caminho — e o caminho é justamente
-- o que se pede quando a obra vira processo. Cada decisão é uma linha, e a que
-- vale é a mais recente.

CREATE TABLE IF NOT EXISTS decisoes_obra (
  id text PRIMARY KEY,
  prefeitura_id text NOT NULL REFERENCES prefeituras(id) ON DELETE CASCADE,
  obra_id text NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

  -- concluida | prorrogacao_automatica | mora_do_contratado | extincao |
  -- correcao_de_cadastro
  tipo text NOT NULL,

  -- O texto que responde ao Tribunal depois. Mínimo de 40 caracteres é
  -- validado na aplicação: campo que aceita "ok" vira campo preenchido com
  -- "ok", e registro com "ok" é pior que nenhum — dá aparência de processo a
  -- uma decisão que não foi fundamentada.
  justificativa text NOT NULL,

  -- Data de conclusão (quando a decisão é "concluída") ou nova previsão. É ela
  -- que faz a decisão VENCER: previsão passada traz o alerta de volta, senão
  -- bastaria registrar qualquer coisa para a obra sumir da tela para sempre.
  nova_previsao text,

  -- Nº do processo, ofício ou termo que documenta a decisão fora do sistema.
  documento text,

  decidido_por text NOT NULL,
  decidido_em text NOT NULL DEFAULT now()::text
);

ALTER TABLE decisoes_obra ENABLE ROW LEVEL SECURITY;

-- A tela busca a decisão mais recente de cada obra.
CREATE INDEX IF NOT EXISTS decisoes_obra_obra_idx
  ON decisoes_obra (obra_id, decidido_em DESC);

CREATE INDEX IF NOT EXISTS decisoes_obra_prefeitura_idx
  ON decisoes_obra (prefeitura_id);
