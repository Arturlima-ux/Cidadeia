-- Marca de quando o prefeito encerrou a lista de implantação.
--
-- É a única coisa da implantação que fica gravada. Os passos ("município
-- reconhecido", "dados do Tesouro importados", "secretários com acesso"...)
-- são derivados dos próprios dados a cada carregamento, para a lista nunca
-- dizer "feito" quando o dado não existe. Encerrar a lista é uma decisão da
-- pessoa, não um fato sobre os dados — por isso é o que se guarda.
ALTER TABLE prefeituras
  ADD COLUMN IF NOT EXISTS implantacao_concluida_em text;
