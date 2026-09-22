// Vocabulário das ocorrências por unidade, compartilhado entre tela,
// ações e leitura automática. Fora do "use server" de propósito.

export const TIPOS_OCORRENCIA = [
  { chave: "sem_medico", rotulo: "Sem médico", exemplo: "Médico faltou; sem substituto." },
  { chave: "sem_profissional", rotulo: "Sem outro profissional", exemplo: "Sem enfermeiro / dentista / ACS." },
  { chave: "falta_medicamento", rotulo: "Faltou medicamento", exemplo: "Insulina, anti-hipertensivo, antibiótico…" },
  { chave: "falta_insumo", rotulo: "Faltou insumo", exemplo: "Luva, seringa, teste rápido, vacina." },
  { chave: "equipamento_quebrado", rotulo: "Equipamento quebrado", exemplo: "Geladeira de vacina, autoclave, ar-condicionado." },
  { chave: "fila", rotulo: "Fila / demora", exemplo: "Espera acima de 2 horas; agenda lotada." },
  { chave: "estrutura", rotulo: "Estrutura", exemplo: "Sem água, sem energia, goteira, porta quebrada." },
  { chave: "outro", rotulo: "Outro", exemplo: "" },
] as const;

export type TipoOcorrencia = (typeof TIPOS_OCORRENCIA)[number]["chave"];

export function rotuloOcorrencia(chave: string): string {
  return TIPOS_OCORRENCIA.find((t) => t.chave === chave)?.rotulo ?? chave;
}

/** Dias que uma ocorrência está aberta. */
export function diasAberta(createdAt: string, hoje: Date = new Date()): number {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((hoje.getTime() - d.getTime()) / 86_400_000));
}

/**
 * O que merece atenção numa unidade, a partir do que está aberto nela.
 * Regra simples e explicável: urgente aberta há 2+ dias, ou 3+ abertas.
 */
export function situacaoDaUnidade(abertas: { gravidade: string; createdAt: string }[], hoje: Date = new Date()): "normal" | "atencao" | "urgente" {
  if (abertas.some((o) => o.gravidade === "urgente" && diasAberta(o.createdAt, hoje) >= 2)) return "urgente";
  if (abertas.some((o) => o.gravidade === "urgente")) return "atencao";
  if (abertas.length >= 3) return "atencao";
  return "normal";
}
