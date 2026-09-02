"use server";

import { db } from "@/db";
import { prefeituras } from "@/db/schema";
import { eq } from "drizzle-orm";
import { lerSessao } from "@/lib/sessao";
import { limitarUso } from "@/lib/rate-limit";
import { buscarCodigoIbge, conferirEntregasSiconfi } from "@/lib/siconfi";
import {
  periodosDoExercicio,
  avaliarObrigacoes,
  montarPainelObrigacoes,
  periodicidadeRgf,
  type ObrigacaoAvaliada,
} from "@/lib/obrigacoes-fiscais";

export type ResultadoObrigacoes =
  | {
      ok: true;
      avaliadas: ObrigacaoAvaliada[];
      vencidas: number;
      vencendo: number;
      entregues: number;
      /** Períodos que o Tesouro não respondeu — não podem virar acusação. */
      inconclusivos: string[];
      exercicio: number;
    }
  | { ok: false; erro: string };

/**
 * Monta o calendário do exercício e confere no Tesouro o que já foi entregue.
 *
 * Roda sob pedido, não a cada abertura de tela: são seis consultas ao SICONFI,
 * uma por bimestre, contra uma API pública e gratuita que não deve ser
 * martelada. O limite local protege o Tesouro de nós.
 */
export async function conferirObrigacoes(
  optouRgfSemestral = false
): Promise<ResultadoObrigacoes> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  if (sessao.cargo === "secretario") {
    return { ok: false, erro: "Apenas o prefeito ou um administrador acompanha as obrigações fiscais." };
  }

  const podeUsar = await limitarUso(`obrigacoes:${sessao.prefeituraId}`, 8, 10);
  if (!podeUsar) {
    return { ok: false, erro: "Muitas conferências seguidas. Aguarde alguns minutos." };
  }

  const [prefeitura] = await db
    .select({
      municipio: prefeituras.municipio,
      estado: prefeituras.estado,
      populacao: prefeituras.populacao,
      codigoIbge: prefeituras.codigoIbge,
    })
    .from(prefeituras)
    .where(eq(prefeituras.id, sessao.prefeituraId))
    .limit(1);

  if (!prefeitura) return { ok: false, erro: "Município não encontrado." };

  const exercicio = new Date().getFullYear();
  const periodos = periodosDoExercicio(exercicio, {
    periodicidadeRgf: periodicidadeRgf(prefeitura.populacao, optouRgfSemestral),
  });

  // Sem código IBGE não há como consultar o Tesouro. O calendário continua
  // valendo — o que se perde é só a confirmação automática, e dizer isso é
  // melhor do que devolver tudo como "não entregue".
  const codigoIbge =
    prefeitura.codigoIbge ?? (await buscarCodigoIbge(prefeitura.municipio, prefeitura.estado));

  if (!codigoIbge) {
    const avaliadas = avaliarObrigacoes(periodos, new Set(), new Date());
    const painel = montarPainelObrigacoes(avaliadas);
    return {
      ok: true,
      avaliadas,
      vencidas: painel.vencidas.length,
      vencendo: painel.vencendo.length,
      entregues: 0,
      inconclusivos: avaliadas.filter((a) => a.obrigacao.verificavel).map((a) => `${a.obrigacao.chave}:${a.numero}`),
      exercicio,
    };
  }

  // Só os bimestres já encerrados: consultar período aberto gastaria chamada
  // para receber, corretamente, um vazio que não significa atraso.
  const hoje = new Date().toISOString().slice(0, 10);
  const periodosRreo = periodos
    .filter((p) => p.obrigacao.chave === "rreo" && p.fimDoPeriodo <= hoje)
    .map((p) => p.numero);

  const { entregues, inconclusivos } = await conferirEntregasSiconfi(codigoIbge, exercicio, {
    periodosRreo,
  });

  const avaliadas = avaliarObrigacoes(periodos, entregues, new Date());
  const painel = montarPainelObrigacoes(avaliadas);

  return {
    ok: true,
    avaliadas,
    vencidas: painel.vencidas.length,
    vencendo: painel.vencendo.length,
    entregues: painel.entregues,
    inconclusivos,
    exercicio,
  };
}
