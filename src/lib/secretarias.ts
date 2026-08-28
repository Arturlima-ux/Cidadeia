export const SECRETARIAS = [
  { chave: "saude", label: "Saúde" },
  { chave: "educacao", label: "Educação" },
  { chave: "obras", label: "Obras" },
  { chave: "licitacoes", label: "Licitações" },
] as const;

export type ChaveSecretaria = (typeof SECRETARIAS)[number]["chave"];

export function labelSecretaria(chave: string | null | undefined): string {
  return SECRETARIAS.find((s) => s.chave === chave)?.label ?? chave ?? "—";
}
