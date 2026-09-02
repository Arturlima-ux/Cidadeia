import type { PlanoAddon } from "@/lib/planos";
import { PLANOS_ADDON } from "@/lib/planos";
import { caminhoSugerido, type CaminhoContratacao } from "@/lib/contratacao";

// ── PREÇO POR MÓDULO E PORTE DO MUNICÍPIO ──
//
// Uma prefeitura de 8 mil habitantes não pode pagar o mesmo que uma de 200
// mil, então o preço varia por porte. Cada módulo continua avulso.

export type PorteMunicipio = "ate10k" | "de10a50k" | "acima50k";

// A primeira faixa é escrita como intervalo fechado, "0 a 10 mil", e não como
// teto ("Até 10 mil"). A diferença não é cosmética: quase metade dos 5.570
// municípios brasileiros tem menos de 10 mil habitantes, e é justamente o
// prefeito desses que assume não caber em software de gestão. Um teto convida
// a pensar "será que sou pequeno demais?"; um intervalo que começa no zero
// responde a pergunta antes de ela ser feita.
export const PORTES: { chave: PorteMunicipio; rotulo: string; detalhe: string }[] = [
  { chave: "ate10k", rotulo: "0 a 10 mil", detalhe: "habitantes" },
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
 * `null` significa PREÇO AINDA NÃO DEFINIDO. Enquanto houver null, a página
 * mostra "sob consulta" e o montador avisa que o total está incompleto, em vez
 * de exibir um número inventado.
 *
 * ── COMO ESTES VALORES FORAM ESCOLHIDOS ──
 *
 * O teto não é o mercado, é a lei. A promessa central do site é caber na
 * dispensa por valor, então NENHUMA combinação pode passar do limite anual do
 * art. 75, II — hoje R$ 65.492,11. A combinação mais cara possível (município
 * acima de 50 mil contratando os seis módulos) fecha o ano em R$ 47.880, ou
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
export const PRECO_MENSAL: Record<PlanoAddon, Record<PorteMunicipio, number | null>> = {
  essencial: { ate10k: 490, de10a50k: 690, acima50k: 950 },
  gestao: { ate10k: 360, de10a50k: 520, acima50k: 740 },
  saude: { ate10k: 290, de10a50k: 450, acima50k: 630 },
  educacao: { ate10k: 290, de10a50k: 450, acima50k: 630 },
  obras: { ate10k: 240, de10a50k: 370, acima50k: 520 },
  licitacoes: { ate10k: 240, de10a50k: 370, acima50k: 520 },
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
