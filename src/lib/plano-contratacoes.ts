// ── O PLANO, LIDO DE UM LUGAR SÓ ──
//
// Duas superfícies mostram o plano: a tela de Licitações e o CSV que o gestor
// leva ao setor de compras. As duas precisam montar o plano a partir das mesmas
// sete perguntas ao banco.
//
// Este arquivo existe para que sejam UMA leitura, e não duas. A lição é recente
// e cara: três cópias da leitura da rede de escolas divergiram duas vezes no
// mesmo mês, e numa delas o PDF que circula por e-mail passou a discordar da
// tela ao lado.
//
// ── E A GUARDA MORA AQUI ──
//
// Pelo mesmo motivo de lib/rede-educacao.ts: sem acesso à pasta, devolve null.
// Quem esquecer de checar não recebe dado, em vez de receber tudo. A rota de
// CSV é justamente o caminho que o proxy de /dashboard não cobre.

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { licitacoes, contratos } from "@/db/schema";
import { temAcessoSecretaria } from "@/lib/sessao";
import { analisarFracionamento, type ProcessoDispensa } from "@/lib/fracionamento";
import { montarPlano, type Plano } from "@/lib/pca";

export type LeituraPlano = {
  plano: Plano;
  /** Ano de onde saiu o histórico. É sempre o anterior ao planejado. */
  exercicioDeReferencia: number;
  /** Quantos contratos e processos sustentam o plano — a régua da confiança. */
  baseDeContratos: number;
  baseDeProcessos: number;
};

export async function lerPlanoContratacoes(
  prefeituraId: string,
  quem: { cargo: string; secretaria?: string | null },
  anoPlano: number
): Promise<LeituraPlano | null> {
  if (!temAcessoSecretaria(quem, "licitacoes")) return null;
  // Cargo de uma instalação só não planeja contratação do município.
  if (quem.cargo === "escola" || quem.cargo === "unidade") return null;

  let processos: (typeof licitacoes.$inferSelect)[] = [];
  let osContratos: (typeof contratos.$inferSelect)[] = [];

  try {
    [processos, osContratos] = await Promise.all([
      db.select().from(licitacoes).where(eq(licitacoes.prefeituraId, prefeituraId)),
      db.select().from(contratos).where(eq(contratos.prefeituraId, prefeituraId)),
    ]);
  } catch (e) {
    // Banco fora não vira tela de erro: o plano sai vazio e o resto da página
    // continua. O erro vai para o log — catch mudo já escondeu uma queda de
    // banco por dias neste projeto.
    console.error("[plano-contratacoes] leitura:", e);
  }

  // O histórico de fracionamento é o do exercício ANTERIOR ao planejado: é o
  // que já fechou e portanto o que dá para somar inteiro. Somar o exercício
  // corrente, ainda pela metade, mostraria grupos que ainda vão crescer.
  const exercicioDeReferencia = anoPlano - 1;
  const dispensasDoExercicio: ProcessoDispensa[] = processos
    .filter(
      (l) =>
        /dispensa/i.test(l.modalidade ?? "") &&
        l.valorEstimado !== null &&
        l.status !== "cancelada" &&
        (l.createdAt ?? "").startsWith(String(exercicioDeReferencia))
    )
    .map((l) => ({
      id: l.id,
      numero: l.numero,
      objeto: l.objeto,
      valor: l.valorEstimado as number,
      data: l.createdAt ?? "",
    }));

  const analise = analisarFracionamento(dispensasDoExercicio, exercicioDeReferencia);

  const plano = montarPlano(
    anoPlano,
    osContratos.map((c) => ({
      id: c.id,
      objeto: c.objeto,
      vigenciaFim: c.vigenciaFim,
      valorGlobal: c.valorGlobal,
      fornecedorNome: c.fornecedorNome,
    })),
    processos.map((l) => ({
      numero: l.numero,
      objeto: l.objeto,
      modalidade: l.modalidade,
      valorEstimado: l.valorEstimado,
      status: l.status,
      data: l.createdAt ?? "",
    })),
    analise.gruposSuspeitos
  );

  return {
    plano,
    exercicioDeReferencia,
    baseDeContratos: osContratos.length,
    baseDeProcessos: processos.length,
  };
}

/** Só para a rota do CSV, que precisa do nome do arquivo. */
export function nomeDoArquivoPlano(anoPlano: number, municipio: string): string {
  const slug = municipio
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `plano-contratacoes-${anoPlano}-${slug || "municipio"}.csv`;
}
