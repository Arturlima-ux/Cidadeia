import reserva from "@/dados/rgf-reserva.json";
import type { ImportacaoRgf, Periodicidade, ResultadoRgf } from "@/lib/siconfi-rgf";

// ── QUANDO O TESOURO CAI, O SITE NÃO FICA MUDO ──
//
// A despesa com pessoal é o número que mais vende, e ele depende de uma API
// pública que às vezes não responde. Sem reserva, a visita daquela hora via
// "não foi possível consultar agora" e ia embora.
//
// A vigia semanal (scripts/vigia/) já lê o RGF de todas as prefeituras toda
// segunda, com o mesmo código da home. O que ela leu fica guardado aqui
// (dados/rgf-reserva.json), e só entra em cena quando a consulta da hora
// FALHA — nunca no lugar de uma resposta, nunca quando o Tesouro diz que não
// há RGF. E entra dito como é: "o Tesouro não respondeu agora; este é o
// número conferido pelo CidadeIA em tal data".

/** [exercício, periodicidade, período, mês, RCL ajustada, RCL, despesa,
 *   limite de alerta, prudencial, máximo, RCL de reserva (0/1), instituição] */
export type LinhaReserva = [
  number,
  Periodicidade,
  number,
  number,
  number,
  number,
  number,
  number | null,
  number | null,
  number | null,
  0 | 1,
  string | null,
];

const DADOS = reserva as { geradoEm: string | null; m: Record<string, LinhaReserva> };

/** O RGF em uma linha curta, para o arquivo semanal. */
export function compactar(d: ImportacaoRgf): LinhaReserva {
  return [
    d.periodo.exercicio,
    d.periodo.periodicidade,
    d.periodo.periodo,
    d.periodo.mesReferencia,
    d.rclAjustada,
    d.rcl,
    d.despesaTotal,
    d.limiteAlerta,
    d.limitePrudencial,
    d.limiteMaximo,
    d.rclVeioDeReserva ? 1 : 0,
    d.instituicao,
  ];
}

export function descompactar(l: LinhaReserva): ImportacaoRgf {
  return {
    periodo: { exercicio: l[0], periodicidade: l[1], periodo: l[2], mesReferencia: l[3] },
    rclAjustada: l[4],
    rcl: l[5],
    despesaTotal: l[6],
    limiteAlerta: l[7],
    limitePrudencial: l[8],
    limiteMaximo: l[9],
    rclVeioDeReserva: l[10] === 1,
    instituicao: l[11],
  };
}

/**
 * O resultado da consulta, ou, se ela falhou, o último RGF conferido pela
 * vigia. Qualquer outra resposta (inclusive "não publicado") passa intacta.
 */
export function comReserva(
  codigoIbge: string,
  r: ResultadoRgf,
  dados: { geradoEm: string | null; m: Record<string, LinhaReserva> } = DADOS
): ResultadoRgf {
  if (r.ok || r.causa !== "consulta_falhou" || !dados.geradoEm) return r;
  const linha = dados.m[codigoIbge];
  if (!linha) return r;
  return { ok: true, dados: descompactar(linha), reserva: { conferidoEm: dados.geradoEm } };
}
