import type { Area } from "@/lib/alerta-por-area";

// As áreas que o cidadão escolhe no portal. Arquivo à parte, leve, porque vai
// para o navegador: em ouvidoria-avisos.ts moram também os e-mails, que só
// servem no servidor e pesariam no celular de quem abre o portal.
export const OPCOES_DE_AREA: { valor: Area; nome: string }[] = [
  { valor: "saude", nome: "Saúde" },
  { valor: "educacao", nome: "Educação" },
  { valor: "obras", nome: "Obras e serviços urbanos" },
  { valor: "licitacoes", nome: "Compras e contratos" },
];
