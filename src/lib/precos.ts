import type { PlanoAddon } from "@/lib/planos";
import { PLANOS_ADDON } from "@/lib/planos";
import { caminhoSugerido, type CaminhoContratacao } from "@/lib/contratacao";

// ── PREÇO POR MÓDULO E PORTE DO MUNICÍPIO ──
//
// Uma prefeitura de 8 mil habitantes não pode pagar o mesmo que uma de 200
// mil, então o preço varia por porte. Cada módulo continua avulso.

export type PorteMunicipio = "ate10k" | "de10a50k" | "de50a100k" | "de100a500k" | "de500ka1m" | "acima1m";

// A primeira faixa é escrita como intervalo fechado, "0 a 10 mil", e não como
// teto ("Até 10 mil"). A diferença não é cosmética: quase metade dos 5.570
// municípios brasileiros tem menos de 10 mil habitantes, e é justamente o
// prefeito desses que assume não caber em software de gestão. Um teto convida
// a pensar "será que sou pequeno demais?"; um intervalo que começa no zero
// responde a pergunta antes de ela ser feita.
//
// ── SEIS FAIXAS, NÃO TRÊS ──
// "Acima de 50 mil" juntava uma cidade de 60 mil com uma capital de 900
// mil na mesma tabela. As faixas grandes seguem o corte usual da gestão
// pública (médio porte até 100 mil, grande até 500 mil, metrópole acima).
//
// `garanteDispensa`: nas três primeiras faixas, a soma dos seis módulos
// fica abaixo do limite anual de dispensa por construção — é a promessa da
// home, e o teste em contratacao.test.ts a trava. Nas faixas grandes o
// caminho natural é o pregão, e o simulador diz isso; a promessa nunca foi
// "cabe para qualquer município", foi "veja se cabe".
export const PORTES: { chave: PorteMunicipio; rotulo: string; detalhe: string; garanteDispensa: boolean }[] = [
  { chave: "ate10k", rotulo: "0 a 10 mil", detalhe: "habitantes", garanteDispensa: true },
  { chave: "de10a50k", rotulo: "10 a 50 mil", detalhe: "habitantes", garanteDispensa: true },
  { chave: "de50a100k", rotulo: "50 a 100 mil", detalhe: "habitantes", garanteDispensa: true },
  { chave: "de100a500k", rotulo: "100 a 500 mil", detalhe: "habitantes", garanteDispensa: false },
  { chave: "de500ka1m", rotulo: "500 mil a 1 milhão", detalhe: "habitantes", garanteDispensa: false },
  { chave: "acima1m", rotulo: "Acima de 1 milhão", detalhe: "habitantes", garanteDispensa: false },
];

/** Faixa de porte a partir da população cadastrada da prefeitura. */
export function porteDaPopulacao(populacao: number | null | undefined): PorteMunicipio {
  if (!populacao || populacao <= 10_000) return "ate10k";
  if (populacao <= 50_000) return "de10a50k";
  if (populacao <= 100_000) return "de50a100k";
  if (populacao <= 500_000) return "de100a500k";
  if (populacao <= 1_000_000) return "de500ka1m";
  return "acima1m";
}

/**
 * Tabela de preços mensais, em reais.
 *
 * `null` significa PREÇO AINDA NÃO DEFINIDO. Enquanto houver null, a página
 * mostra "sob consulta" e o montador avisa que o total está incompleto, em vez
 * de exibir um número inventado.
 *
 * ── COMO ESTES VALORES FORAM ESCOLHIDOS ──
 *
 * O teto não é o mercado, é a lei. A promessa central do site é caber na
 * dispensa por valor, então NENHUMA combinação pode passar do limite anual do
 * art. 75, II — hoje R$ 65.492,11. A combinação mais cara possível (município
 * de 50 a 100 mil contratando os seis módulos) fecha o ano em R$ 47.880, ou
 * 73% do limite: sobra folga para reajuste e para o município crescer de faixa
 * sem quebrar o argumento da home.
 *
 * A faixa pequena carrega margem maior de propósito. Com poucos clientes, é o
 * custo fixo de infraestrutura que pesa — não o custo variável por município —,
 * e a prefeitura de menos de 10 mil habitantes é quase metade do mercado
 * brasileiro por número de entes.
 *
 * O teste de contratacao.test.ts trava a regra que importa: se alguém subir um
 * preço a ponto de a soma dos seis estourar a dispensa, a suíte quebra antes de
 * a home passar a mentir.
 */
//
// As três faixas grandes nascem em null — "sob consulta" na página e no
// simulador — até o valor ser decidido. É decisão comercial, não de código:
// preencher aqui é o único passo.
export const PRECO_MENSAL: Record<PlanoAddon, Record<PorteMunicipio, number | null>> = {
  essencial: { ate10k: 490, de10a50k: 690, de50a100k: 950, de100a500k: null, de500ka1m: null, acima1m: null },
  gestao: { ate10k: 360, de10a50k: 520, de50a100k: 740, de100a500k: null, de500ka1m: null, acima1m: null },
  saude: { ate10k: 290, de10a50k: 450, de50a100k: 630, de100a500k: null, de500ka1m: null, acima1m: null },
  educacao: { ate10k: 290, de10a50k: 450, de50a100k: 630, de100a500k: null, de500ka1m: null, acima1m: null },
  obras: { ate10k: 240, de10a50k: 370, de50a100k: 520, de100a500k: null, de500ka1m: null, acima1m: null },
  licitacoes: { ate10k: 240, de10a50k: 370, de50a100k: 520, de100a500k: null, de500ka1m: null, acima1m: null },
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
