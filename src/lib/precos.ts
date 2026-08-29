import type { PlanoAddon } from "@/lib/planos";
import { PLANOS_ADDON } from "@/lib/planos";
import { caminhoSugerido, type CaminhoContratacao } from "@/lib/contratacao";

// ── PREÇO POR MÓDULO E PORTE DO MUNICÍPIO ──
//
// Uma prefeitura de 8 mil habitantes não pode pagar o mesmo que uma de 200
// mil, então o preço varia por porte. Cada módulo continua avulso.

export type PorteMunicipio = "ate10k" | "de10a50k" | "acima50k";

export const PORTES: { chave: PorteMunicipio; rotulo: string; detalhe: string }[] = [
  { chave: "ate10k", rotulo: "Até 10 mil", detalhe: "habitantes" },
  { chave: "de10a50k", rotulo: "10 a 50 mil", detalhe: "habitantes" },
  { chave: "acima50k", rotulo: "Acima de 50 mil", detalhe: "habitantes" },
];

/** Faixa de porte a partir da população cadastrada da prefeitura. */
export function porteDaPopulacao(populacao: number | null | undefined): PorteMunicipio {
  if (!populacao || populacao <= 10_000) return "ate10k";
  if (populacao <= 50_000) return "de10a50k";
  return "acima50k";
}

/**
 * Tabela de preços mensais, em reais.
 *
 * `null` significa PREÇO AINDA NÃO DEFINIDO — e é assim que nasce, de
 * propósito. Enquanto for null, a página mostra "sob consulta" e o montador
 * avisa que o total está incompleto, em vez de exibir um número inventado.
 * Para ligar a calculadora da home, basta preencher os valores aqui.
 */
export const PRECO_MENSAL: Record<PlanoAddon, Record<PorteMunicipio, number | null>> = {
  essencial: { ate10k: null, de10a50k: null, acima50k: null },
  gestao: { ate10k: null, de10a50k: null, acima50k: null },
  saude: { ate10k: null, de10a50k: null, acima50k: null },
  educacao: { ate10k: null, de10a50k: null, acima50k: null },
  obras: { ate10k: null, de10a50k: null, acima50k: null },
  licitacoes: { ate10k: null, de10a50k: null, acima50k: null },
};

export function precoDefinido(modulo: PlanoAddon, porte: PorteMunicipio): boolean {
  return PRECO_MENSAL[modulo][porte] !== null;
}

/** true quando TODOS os módulos já têm preço para aquele porte. */
export function tabelaCompleta(porte: PorteMunicipio): boolean {
  return PLANOS_ADDON.every((p) => precoDefinido(p.chave, porte));
}

export type ItemProposta = {
  modulo: PlanoAddon;
  nome: string;
  mensal: number | null;
};

export type Proposta = {
  itens: ItemProposta[];
  /** Soma do que TEM preço. Ver `incompleta` antes de mostrar como total. */
  mensal: number;
  anual: number;
  /** true se algum módulo escolhido ainda está sem preço definido. */
  incompleta: boolean;
  /** Só faz sentido quando `incompleta` é false. */
  caminho: CaminhoContratacao;
};

/**
 * Monta a proposta a partir do porte e dos módulos escolhidos.
 *
 * O anual é `mensal * 12` porque é o valor anual que o art. 75 usa para
 * decidir se cabe na dispensa — ver o comentário em lib/contratacao.ts.
 */
export function montarProposta(entrada: {
  porte: PorteMunicipio;
  modulos: PlanoAddon[];
}): Proposta {
  const escolhidos = new Set(entrada.modulos);
  const itens: ItemProposta[] = PLANOS_ADDON.filter((p) => escolhidos.has(p.chave)).map((p) => ({
    modulo: p.chave,
    nome: p.nome,
    mensal: PRECO_MENSAL[p.chave][entrada.porte],
  }));

  const mensal = itens.reduce((soma, item) => soma + (item.mensal ?? 0), 0);
  const anual = mensal * 12;

  return {
    itens,
    mensal,
    anual,
    incompleta: itens.some((item) => item.mensal === null),
    caminho: caminhoSugerido(anual),
  };
}
