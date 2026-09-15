-- Leads do site: quem deixou e-mail no Raio-X de um município.
CREATE TABLE IF NOT EXISTS leads (
  id text PRIMARY KEY,
  origem text NOT NULL,
  codigo_ibge text,
  municipio text,
  uf text,
  nome text NOT NULL,
  cargo text,
  email text NOT NULL,
  email_enviado boolean NOT NULL DEFAULT false,
  created_at text NOT NULL DEFAULT now()::text
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
