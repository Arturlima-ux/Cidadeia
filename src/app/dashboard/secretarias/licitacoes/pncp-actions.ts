"use server";

import { db } from "@/db";
import { licitacoes, prefeituras } from "@/db/schema";
import { eq } from "drizzle-orm";
import { lerSessao } from "@/lib/sessao";
import { limitarUso } from "@/lib/rate-limit";
import {
  buscarContratacoesPncp,
  conferirPublicacao,
  resumirConferencia,
  type Conferencia,
} from "@/lib/pncp";

export type ResultadoConferencia =
  | { ok: true; conferencias: Conferencia[]; total: number; publicadas: number; ano: number }
  | { ok: false; erro: string; limiteExcedido: boolean };

/**
 * Confere quais processos da prefeitura constam no PNCP.
 *
 * Roda sob pedido, e não a cada abertura de tela, por dois motivos: o PNCP
 * limita requisições com facilidade, e cada conferência dispara uma chamada
 * por modalidade. O limite local abaixo protege o PNCP de nós — sem ele, um
 * usuário atualizando a página levaria a consulta ao 429 e a tela passaria a
 * dizer "não publicado" para processos que estão lá.
 */
export async function conferirNoPncp(ano: number): Promise<ResultadoConferencia> {
  const sessao = await lerSessao();
  if (!sessao) {
    return { ok: false, erro: "Sessão expirada. Entre novamente.", limiteExcedido: false };
  }

  const podeUsar = await limitarUso(`pncp:${sessao.prefeituraId}`, 12, 10);
  if (!podeUsar) {
    return {
      ok: false,
      erro: "Muitas conferências seguidas. Aguarde alguns minutos antes de tentar de novo.",
      limiteExcedido: true,
    };
  }

  const [prefeitura] = await db
    .select({ cnpj: prefeituras.cnpj })
    .from(prefeituras)
    .where(eq(prefeituras.id, sessao.prefeituraId))
    .limit(1);

  if (!prefeitura?.cnpj) {
    return {
      ok: false,
      erro: "O CNPJ do município não está cadastrado — sem ele não dá para consultar o PNCP.",
      limiteExcedido: false,
    };
  }

  const consulta = await buscarContratacoesPncp(prefeitura.cnpj, ano);
  if (!consulta.ok) {
    return { ok: false, erro: consulta.erro, limiteExcedido: consulta.limiteExcedido };
  }

  const locais = await db
    .select({
      id: licitacoes.id,
      numero: licitacoes.numero,
      objeto: licitacoes.objeto,
      status: licitacoes.status,
    })
    .from(licitacoes)
    .where(eq(licitacoes.prefeituraId, sessao.prefeituraId));

  // Processo em planejamento ainda não deveria estar no PNCP — cobrar
  // publicação dele seria alarme falso, e alarme falso ensina o gestor a
  // ignorar a tela.
  const conferiveis = locais.filter((l) => l.status !== "planejamento");

  const conferencias = conferirPublicacao(conferiveis, consulta.contratacoes);
  const resumo = resumirConferencia(conferencias);

  return {
    ok: true,
    conferencias,
    total: resumo.total,
    publicadas: resumo.publicadas,
    ano,
  };
}
