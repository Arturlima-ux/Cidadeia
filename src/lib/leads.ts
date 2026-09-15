// Quem pode ser quem deixa e-mail no Raio-X. Fica fora do arquivo de ação
// ("use server" só exporta funções assíncronas) e serve ao formulário e à
// validação.
export const CARGOS_LEAD = [
  "Prefeito(a)",
  "Secretário(a)",
  "Servidor(a) da prefeitura",
  "Vereador(a)",
  "Contador(a) / assessoria",
  "Imprensa",
  "Cidadão(ã)",
] as const;
export type CargoLead = (typeof CARGOS_LEAD)[number];
