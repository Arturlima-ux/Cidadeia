"use server";

import { db } from "@/db";
import { prefeituras } from "@/db/schema";
import { eq } from "drizzle-orm";
import { lerSessao , ehGestor } from "@/lib/sessao";
import { limitarUso } from "@/lib/rate-limit";
import { buscarCodigoIbge } from "@/lib/siconfi";
import { conferirSituacaoFiscal } from "@/lib/vigia-fiscal";
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
      /** O RGF é cobrado por semestre (e não por quadrimestre). */
      rgfSemestral: boolean;
      /** A periodicidade veio do que a prefeitura já entregou, não do cadastro. */
      periodicidadeDoExtrato: boolean;
    }
  | { ok: false; erro: string };

/**
 * Monta o calendário do exercício e confere no Tesouro o que já foi entregue.
 *
 * Roda sob pedido, não a cada abertura de tela: a API do Tesouro é pública e
 * gratuita e não deve ser martelada. O limite local protege o Tesouro de nós.
 */
export async function conferirObrigacoes(
  optouRgfSemestral = false
): Promise<ResultadoObrigacoes> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  if (!ehGestor(sessao)) {
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

  // Sem código IBGE não há como consultar o Tesouro. O calendário continua
  // valendo — o que se perde é só a confirmação automática, e dizer isso é
  // melhor do que devolver tudo como "não entregue".
  const codigoIbge =
    prefeitura.codigoIbge ?? (await buscarCodigoIbge(prefeitura.municipio, prefeitura.estado));

  if (!codigoIbge) {
    const exercicio = new Date().getFullYear();
    const periodos = periodosDoExercicio(exercicio, {
      periodicidadeRgf: periodicidadeRgf(prefeitura.populacao, optouRgfSemestral),
    });
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
      rgfSemestral: periodicidadeRgf(prefeitura.populacao, optouRgfSemestral) === "semestral",
      periodicidadeDoExtrato: false,
    };
  }

  // A mesma conferência que a rotina diária usa para gerar os alertas
  // (lib/vigia-fiscal.ts): extrato de entregas do Tesouro, RREO e RGF.
  const situacao = await conferirSituacaoFiscal({
    codigoIbge,
    populacao: prefeitura.populacao,
    optouRgfSemestral,
    conferirPessoal: false,
  });
  const painel = montarPainelObrigacoes(situacao.avaliadas);
  const naoConferido = (o: ObrigacaoAvaliada) => situacao.inconclusivos.includes(`${o.obrigacao.chave}:${o.numero}`);

  return {
    ok: true,
    avaliadas: situacao.avaliadas,
    // Período que o Tesouro não respondeu não conta como atraso.
    vencidas: painel.vencidas.filter((o) => !naoConferido(o)).length,
    vencendo: painel.vencendo.length,
    entregues: painel.entregues,
    inconclusivos: situacao.inconclusivos,
    exercicio: situacao.exercicio,
    rgfSemestral: situacao.periodicidadeRgf === "semestral",
    periodicidadeDoExtrato: situacao.periodicidadeDoExtrato,
  };
}
