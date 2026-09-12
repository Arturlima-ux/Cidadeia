-- Pedidos de proposta vindos do site, sem login.
--
-- O pedido era um "mailto:" — dependia do programa de e-mail do visitante,
-- que numa máquina de prefeitura muitas vezes não existe. Agora o sistema
-- grava o pedido e envia o e-mail. Gravar vem antes de enviar: é o registro
-- do primeiro contato, e sobrevive a uma falha de envio.
CREATE TABLE IF NOT EXISTS pedidos_proposta (
  id text PRIMARY KEY,
  codigo_ibge text NOT NULL,
  municipio text NOT NULL,
  uf text NOT NULL,
  populacao integer NOT NULL,
  porte text NOT NULL,
  modulos text NOT NULL,
  mensal double precision,
  nome text NOT NULL,
  cargo text,
  email text NOT NULL,
  telefone text,
  observacao text,
  email_enviado boolean NOT NULL DEFAULT false,
  created_at text NOT NULL DEFAULT now()::text
);
ALTER TABLE pedidos_proposta ENABLE ROW LEVEL SECURITY;
