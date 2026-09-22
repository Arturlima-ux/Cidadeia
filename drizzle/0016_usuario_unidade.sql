-- Acesso próprio da gerência de hospital/UBS: cargo "unidade" com a unidade.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS unidade_id text;
