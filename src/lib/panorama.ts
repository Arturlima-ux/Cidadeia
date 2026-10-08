// ── O PANORAMA DAS PREFEITURAS, EM NÚMEROS QUE SE CONFEREM ──
//
// Toda semana a vigia (scripts/vigia/) lê o RGF mais recente das 5.570
// prefeituras no Tesouro e grava só os agregados em dados/panorama-rgf.json.
// É a nossa prova de autoridade: não um "+10.000 clientes" escrito à mão, e
// sim o país inteiro conferido, com data e fonte, por qualquer um que abra o
// Raio-X da própria cidade.
//
// Nenhuma prefeitura aparece por nome aqui. O retrato é do Brasil; cada
// cidade se vê na página dela.

import dados from "@/dados/panorama-rgf.json";
import { LIMITE_ALERTA, LIMITE_PESSOAL, LIMITE_PRUDENCIAL } from "@/lib/despesa-pessoal";

export type ContagemPanorama = {
  municipios: number;
  comNumero: number;
  alerta: number;
  prudencial: number;
  acimaDoLimite: number;
  rgfAtrasado: number;
  numerosQueNaoFecham: number;
  semRgf: number;
};

export type Panorama = {
  geradoEm: string;
  fonte: string;
  brasil: ContagemPanorama;
  porUf: Record<string, ContagemPanorama>;
};

export const PANORAMA = dados as Panorama;

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "7 de outubro de 2026". */
export function dataDoPanorama(p: Panorama = PANORAMA): string {
  const [a, m, d] = p.geradoEm.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** "outubro de 2026", para frases correntes. */
export function mesDoPanorama(p: Panorama = PANORAMA): string {
  const [a, m] = p.geradoEm.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

export const numeroBr = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

/** Quem passou do sinal de alerta da LRF: alerta, prudencial ou acima. */
export function passaramDoAlerta(c: ContagemPanorama): number {
  return c.alerta + c.prudencial + c.acimaDoLimite;
}

/** Fração sobre as prefeituras com número, em "33,2%". */
export function fracao(n: number, c: ContagemPanorama): string {
  return `${((n / Math.max(1, c.comNumero)) * 100).toFixed(1).replace(".", ",")}%`;
}

/**
 * "uma em cada três", "quase uma em cada três": a fração em palavras, sem
 * exagero. 33,2% não é "uma em cada três" (seria 33,3%); é "quase". Abaixo
 * de 95% da fração redonda, desce para o denominador seguinte, que é
 * verdade sem qualificação.
 */
export function umaEmCada(n: number, c: ContagemPanorama): string | null {
  const f = n / Math.max(1, c.comNumero);
  if (f <= 0) return null;
  const nomes: Record<number, string> = {
    2: "duas", 3: "três", 4: "quatro", 5: "cinco", 6: "seis", 7: "sete", 8: "oito", 9: "nove", 10: "dez",
  };
  const redondo = Math.round(1 / f);
  if (nomes[redondo] && f >= 1 / redondo) return `uma em cada ${nomes[redondo]}`;
  if (nomes[redondo] && f >= 0.95 / redondo) return `quase uma em cada ${nomes[redondo]}`;
  const seguro = Math.ceil(1 / f);
  return nomes[seguro] ? `uma em cada ${nomes[seguro]}` : null;
}

const pct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

/** As faixas, com a régua da lei ao lado de cada uma. */
export function faixasDoPanorama(c: ContagemPanorama) {
  return [
    {
      chave: "acima",
      rotulo: "acima do limite",
      regua: `mais de ${pct(LIMITE_PESSOAL)} da receita corrente líquida`,
      consequencia: "Tem dois quadrimestres para eliminar o excesso; sem isso, perde transferências voluntárias e crédito.",
      base: "LRF, art. 23",
      valor: c.acimaDoLimite,
      cor: "var(--urgente)",
    },
    {
      chave: "prudencial",
      rotulo: "no limite prudencial",
      regua: `de ${pct(LIMITE_PRUDENCIAL)} a ${pct(LIMITE_PESSOAL)}`,
      consequencia: "Não pode dar reajuste, criar cargo nem nomear, salvo as exceções da lei.",
      base: "LRF, art. 22, parágrafo único",
      valor: c.prudencial,
      cor: "var(--medio)",
    },
    {
      chave: "alerta",
      rotulo: "no sinal de alerta",
      regua: `de ${pct(LIMITE_ALERTA)} a ${pct(LIMITE_PRUDENCIAL)}`,
      consequencia: "O Tribunal de Contas emite o alerta formal.",
      base: "LRF, art. 59, § 1º, II",
      valor: c.alerta,
      cor: "var(--accent-claro)",
    },
  ] as const;
}
