import { PREFEITURA_EQUIPE_ID, PREFEITURA_TESTE_ID } from "@/lib/equipe";

// Prefeituras que existem no banco mas não são cidade: a conta da equipe e o
// painel de teste. Não aparecem na lista pública de portais nem respondem
// em /transparencia/[slug]; o morador nunca deve dar com "Ambiente de teste".
export const PREFEITURAS_INTERNAS = [PREFEITURA_EQUIPE_ID, PREFEITURA_TESTE_ID];
