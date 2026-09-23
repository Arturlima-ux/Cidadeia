// ── O ESTOQUE DA MERENDA, EM DIAS DE AULA ──
//
// O estoque da farmácia se conta por mês (src/lib/estoque-saude.ts). O da
// merenda, não: escola não serve almoço no sábado. O que a cozinheira
// precisa saber é "dá para quantos dias de aula" — e é essa conta que
// dispara o pedido antes de faltar.
//
// Quem lança é quem conta: a própria escola, na ficha dela.

export type CategoriaMerenda = "hortifruti" | "proteina" | "graos" | "laticinio" | "panificacao" | "mercearia" | "outro";

export type ItemMerenda = {
  nome: string;
  categoria: CategoriaMerenda;
  unidade: string;
  /**
   * Item que a agricultura familiar do município costuma fornecer. Não é
   * regra — é a dica que faz o gestor lembrar dos 30% da Lei 11.947/2009
   * na hora de comprar. Ver src/lib/pnae.ts.
   */
  agriculturaFamiliar?: boolean;
};

// Gêneros mais comuns no cardápio da rede municipal. A escola pode lançar
// item fora da lista.
export const CATALOGO_MERENDA: ItemMerenda[] = [
  { nome: "Arroz", categoria: "graos", unidade: "kg" },
  { nome: "Feijão", categoria: "graos", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Macarrão", categoria: "graos", unidade: "kg" },
  { nome: "Farinha de mandioca", categoria: "graos", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Fubá de milho", categoria: "graos", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Óleo de soja", categoria: "mercearia", unidade: "litro" },
  { nome: "Açúcar", categoria: "mercearia", unidade: "kg" },
  { nome: "Sal", categoria: "mercearia", unidade: "kg" },
  { nome: "Café", categoria: "mercearia", unidade: "kg" },
  { nome: "Extrato de tomate", categoria: "mercearia", unidade: "kg" },
  { nome: "Carne bovina", categoria: "proteina", unidade: "kg" },
  { nome: "Frango", categoria: "proteina", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Peixe", categoria: "proteina", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Ovo", categoria: "proteina", unidade: "dúzia", agriculturaFamiliar: true },
  { nome: "Carne suína", categoria: "proteina", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Leite", categoria: "laticinio", unidade: "litro", agriculturaFamiliar: true },
  { nome: "Leite em pó", categoria: "laticinio", unidade: "kg" },
  { nome: "Queijo", categoria: "laticinio", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Iogurte", categoria: "laticinio", unidade: "litro", agriculturaFamiliar: true },
  { nome: "Pão", categoria: "panificacao", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Bolacha / biscoito", categoria: "panificacao", unidade: "kg" },
  { nome: "Banana", categoria: "hortifruti", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Laranja", categoria: "hortifruti", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Melancia", categoria: "hortifruti", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Batata", categoria: "hortifruti", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Cenoura", categoria: "hortifruti", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Tomate", categoria: "hortifruti", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Cebola", categoria: "hortifruti", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Alho", categoria: "hortifruti", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Abóbora", categoria: "hortifruti", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Couve", categoria: "hortifruti", unidade: "maço", agriculturaFamiliar: true },
  { nome: "Repolho", categoria: "hortifruti", unidade: "kg", agriculturaFamiliar: true },
  { nome: "Polpa de fruta", categoria: "hortifruti", unidade: "kg", agriculturaFamiliar: true },
];

export const NOME_CATEGORIA_MERENDA: Record<CategoriaMerenda, string> = {
  hortifruti: "Hortifrúti",
  proteina: "Proteína",
  graos: "Grãos e massas",
  laticinio: "Laticínio",
  panificacao: "Panificação",
  mercearia: "Mercearia",
  outro: "Outro",
};

export type SituacaoMerenda = "falta" | "critico" | "atencao" | "ok" | "sem_consumo";

/** Abaixo disso, entra no pedido — contados em DIAS DE AULA, não corridos. */
export const DIAS_AULA_ATENCAO = 10;
export const DIAS_AULA_CRITICO = 3;
/** Contagem mais velha que isso não é confiável — alimento gira rápido. */
export const DIAS_CONTAGEM_VELHA_MERENDA = 14;
/** O pedido repõe para este horizonte, em dias de aula (cerca de um mês letivo). */
export const DIAS_AULA_DE_REPOSICAO = 20;

/** Dias de aula que o saldo cobre. null = consumo zero (não dá para calcular). */
export function diasDeAula(saldo: number, consumoPorDiaLetivo: number): number | null {
  if (consumoPorDiaLetivo <= 0) return null;
  if (saldo <= 0) return 0;
  return Math.floor(saldo / consumoPorDiaLetivo);
}

export function situacaoDoItemMerenda(saldo: number, consumoPorDiaLetivo: number): SituacaoMerenda {
  if (saldo <= 0) return "falta";
  const dias = diasDeAula(saldo, consumoPorDiaLetivo);
  if (dias === null) return "sem_consumo";
  if (dias <= DIAS_AULA_CRITICO) return "critico";
  if (dias <= DIAS_AULA_ATENCAO) return "atencao";
  return "ok";
}

export const ROTULO_SITUACAO_MERENDA: Record<SituacaoMerenda, string> = {
  falta: "Acabou",
  critico: "Acaba esta semana",
  atencao: "Repor",
  ok: "Ok",
  sem_consumo: "Sem consumo informado",
};

/** Quanto pedir para cobrir DIAS_AULA_DE_REPOSICAO; zero se não precisa. */
export function quantidadeAPedirMerenda(saldo: number, consumoPorDiaLetivo: number): number {
  if (consumoPorDiaLetivo <= 0) return 0;
  const alvo = Math.ceil(consumoPorDiaLetivo * DIAS_AULA_DE_REPOSICAO);
  return Math.max(0, Math.ceil(alvo - Math.max(0, saldo)));
}

export function contagemVelhaMerenda(atualizadoEm: string, hoje: Date = new Date()): boolean {
  const d = new Date(atualizadoEm);
  if (Number.isNaN(d.getTime())) return true;
  return (hoje.getTime() - d.getTime()) / 86_400_000 > DIAS_CONTAGEM_VELHA_MERENDA;
}

export type LinhaMerenda = {
  item: string;
  categoria: CategoriaMerenda;
  unidadeMedida: string;
  saldo: number;
  consumoDiario: number;
  atualizadoEm: string;
};

export type ItemDoPedidoMerenda = LinhaMerenda & {
  escolaId: string;
  escolaNome: string;
  dias: number | null;
  situacao: SituacaoMerenda;
  pedir: number;
};

/** O pedido de reposição da merenda: o que acabou, acaba esta semana ou está abaixo de 10 dias de aula. */
export function montarPedidoMerenda(linhas: (LinhaMerenda & { escolaId: string; escolaNome: string })[]): ItemDoPedidoMerenda[] {
  const ordem: Record<SituacaoMerenda, number> = { falta: 0, critico: 1, atencao: 2, sem_consumo: 3, ok: 4 };
  return linhas
    .map((l) => ({
      ...l,
      dias: diasDeAula(l.saldo, l.consumoDiario),
      situacao: situacaoDoItemMerenda(l.saldo, l.consumoDiario),
      pedir: quantidadeAPedirMerenda(l.saldo, l.consumoDiario),
    }))
    .filter((l) => l.situacao === "falta" || l.situacao === "critico" || l.situacao === "atencao")
    .sort(
      (a, b) =>
        ordem[a.situacao] - ordem[b.situacao] ||
        a.escolaNome.localeCompare(b.escolaNome, "pt-BR") ||
        a.item.localeCompare(b.item, "pt-BR")
    );
}

/**
 * CSV do pedido. A coluna da agricultura familiar não é enfeite: é o
 * lembrete de que aquele item pode (e costuma) ser comprado do produtor
 * local, que é o que fecha os 30% da Lei 11.947/2009.
 */
export function pedidoMerendaParaCsv(itens: ItemDoPedidoMerenda[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const cab = ["Escola", "Item", "Categoria", "Saldo", "Consumo por dia de aula", "Dias de aula cobertos", "Situação", "Quantidade a pedir", "Unidade", "Cabe na agricultura familiar"]
    .map(esc)
    .join(";");
  const linhas = itens.map((i) =>
    [
      i.escolaNome,
      i.item,
      NOME_CATEGORIA_MERENDA[i.categoria],
      i.saldo,
      i.consumoDiario,
      i.dias ?? "",
      ROTULO_SITUACAO_MERENDA[i.situacao],
      i.pedir,
      i.unidadeMedida,
      cabeNaAgriculturaFamiliar(i.item) ? "Sim" : "",
    ]
      .map(esc)
      .join(";")
  );
  return "﻿" + [cab, ...linhas].join("\r\n");
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** O item está na lista do que a agricultura familiar costuma fornecer. */
export function cabeNaAgriculturaFamiliar(item: string): boolean {
  const n = normalizar(item);
  return CATALOGO_MERENDA.some((c) => c.agriculturaFamiliar && normalizar(c.nome) === n);
}

/** O item do catálogo com esse nome, se houver — dá categoria e unidade de graça. */
export function itemDoCatalogoMerenda(nome: string): ItemMerenda | undefined {
  const n = normalizar(nome);
  return CATALOGO_MERENDA.find((c) => normalizar(c.nome) === n);
}
