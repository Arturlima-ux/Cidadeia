import reserva from "@/dados/rgf-reserva.json";
import { municipioPorCodigo } from "@/lib/municipios";
import { rotuloDoPeriodoRgf } from "@/lib/fatos-do-municipio";
import { LIMITE_ALERTA, LIMITE_PESSOAL, LIMITE_PRUDENCIAL } from "@/lib/despesa-pessoal";
import { descompactar, type LinhaReserva } from "@/lib/rgf-reserva";

// ── QUEM ABORDAR, E COM QUAL NÚMERO (novembro de 2026) ──
//
// O maior atrito da prospecção era descobrir qual cidade procurar e com que
// número abrir a conversa (guia de vendas: "O gancho"). A vigia já lê o RGF
// de todas as prefeituras duas vezes por semana e guarda o de cada uma em
// dados/rgf-reserva.json (a reserva do Raio-X). Daqui sai a lista da mesa de
// prospecção: as prefeituras com a despesa com pessoal na faixa de alerta,
// no prudencial ou acima do limite da LRF, cada uma com o gancho escrito.
//
// Só para a equipe (/admin/prospeccao). O que é público continua sendo o
// agregado do panorama; cada cidade já se vê no próprio Raio-X, que mostra
// o mesmo número a qualquer um.

export type Faixa = "acima" | "prudencial" | "alerta";

export const ROTULO_FAIXA: Record<Faixa, string> = {
  acima: "Acima do limite",
  prudencial: "No prudencial",
  alerta: "No alerta",
};

export type CidadeComGancho = {
  codigoIbge: string;
  municipio: string;
  uf: string;
  populacao: number | null;
  /** Despesa com pessoal sobre a receita corrente líquida ajustada, em %. */
  pct: number;
  faixa: Faixa;
  periodo: string;
  gancho: string;
  /** Alto demais para ser comum: pode ser erro de declaração; conferir no Raio-X antes. */
  conferir: boolean;
};

/** Acima disso, a despesa com pessoal é rara de verdade e costuma ser erro de declaração. */
export const PCT_A_CONFERIR = 70;
const ORDEM_FAIXA: Record<Faixa, number> = { acima: 0, prudencial: 1, alerta: 2 };

type Reserva = { geradoEm: string | null; m: Record<string, LinhaReserva> };
const DADOS = reserva as unknown as Reserva;

const umaCasa = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function faixaDe(pct: number): Faixa | null {
  if (pct > LIMITE_PESSOAL) return "acima";
  if (pct >= LIMITE_PRUDENCIAL) return "prudencial";
  if (pct >= LIMITE_ALERTA) return "alerta";
  return null;
}

/** A frase que abre a conversa: o número, o período e a régua da LRF. */
export function fraseDoGancho(pct: number, faixa: Faixa, periodo: string): string {
  const regua =
    faixa === "acima"
      ? `acima do limite de ${umaCasa(LIMITE_PESSOAL)}% da LRF`
      : faixa === "prudencial"
        ? `acima do limite prudencial da LRF (${umaCasa(LIMITE_PRUDENCIAL)}%)`
        : `acima do limite de alerta da LRF (${umaCasa(LIMITE_ALERTA)}%)`;
  return `Despesa com pessoal em ${umaCasa(pct)}% da receita corrente líquida no ${periodo}, ${regua}`;
}

/**
 * As prefeituras com gancho de despesa com pessoal, da maior para a menor.
 * Ficam de fora o DF (limites de estado), quem não tem RCL, os números que
 * não fecham (acima de 90% ou abaixo de 20% é erro de declaração, não gestão)
 * e os códigos em `ignorar` (as cidades que já estão na mesa).
 */
export function cidadesComGancho(
  o: { uf?: string | null; ignorar?: Set<string>; limite?: number } = {},
  dados: Reserva = DADOS
): CidadeComGancho[] {
  const out: CidadeComGancho[] = [];
  for (const [codigo, linha] of Object.entries(dados.m)) {
    if (codigo === "5300108" || o.ignorar?.has(codigo)) continue;
    const m = municipioPorCodigo(codigo);
    if (!m || m.uf === "DF" || (o.uf && m.uf !== o.uf)) continue;
    const d = descompactar(linha);
    if (!d.rclAjustada || d.rclAjustada <= 0) continue;
    const pct = (d.despesaTotal / d.rclAjustada) * 100;
    if (!Number.isFinite(pct) || pct < 20 || pct > 90) continue;
    const faixa = faixaDe(pct);
    if (!faixa) continue;
    const periodo = rotuloDoPeriodoRgf(d.periodo);
    out.push({
      codigoIbge: codigo,
      municipio: m.nome,
      uf: m.uf,
      populacao: m.populacao,
      pct,
      faixa,
      periodo,
      gancho: fraseDoGancho(pct, faixa, periodo),
      conferir: pct >= PCT_A_CONFERIR,
    });
  }
  // A ordem de abordar: a faixa que a LRF mais pesa primeiro (acima do limite
  // tem prazo de recondução, o prudencial tem vedações), e dentro dela a
  // cidade maior, que tem orçamento maior. Por percentual puro, o topo seria
  // de números altos demais, que costumam ser erro de declaração.
  out.sort((a, b) => ORDEM_FAIXA[a.faixa] - ORDEM_FAIXA[b.faixa] || (b.populacao ?? 0) - (a.populacao ?? 0) || b.pct - a.pct);
  return o.limite ? out.slice(0, o.limite) : out;
}

/** Quantas prefeituras há em cada faixa (para o resumo da mesa). */
export function contarPorFaixa(lista: CidadeComGancho[]): Record<Faixa, number> {
  const c: Record<Faixa, number> = { acima: 0, prudencial: 0, alerta: 0 };
  for (const x of lista) c[x.faixa] += 1;
  return c;
}

/** O dia em que a vigia leu os RGFs ("AAAA-MM-DD"), ou null. */
export function conferidoEm(dados: Reserva = DADOS): string | null {
  return dados.geradoEm;
}
