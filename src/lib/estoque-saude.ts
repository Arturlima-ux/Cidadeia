// ── ESTOQUE POR UNIDADE, EM DIAS DE COBERTURA ──
//
// "62% de estoque" não diz nada para quem está na UBS. O que a gerência
// precisa saber é: a insulina acaba em quantos dias? A conta é simples e
// honesta — saldo dividido pelo consumo diário — e é o que dispara o
// pedido de reposição antes de faltar, não depois.
//
// Quem lança é quem conta: a gerência da unidade, na ficha dela. Uma linha
// por item por unidade, sempre a última contagem.

export type CategoriaEstoque = "medicamento" | "insumo" | "vacina";

export type ItemCatalogo = { nome: string; categoria: CategoriaEstoque; unidade: string };

// Itens da farmácia básica (RENAME / componente básico) mais comuns em UBS
// e hospital de pequeno porte. A gerência pode lançar item fora da lista.
export const CATALOGO_ESTOQUE: ItemCatalogo[] = [
  { nome: "Insulina NPH 100 UI/mL", categoria: "medicamento", unidade: "frasco" },
  { nome: "Insulina regular 100 UI/mL", categoria: "medicamento", unidade: "frasco" },
  { nome: "Metformina 850 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Glibenclamida 5 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Losartana 50 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Enalapril 10 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Captopril 25 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Hidroclorotiazida 25 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Atenolol 50 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Anlodipino 5 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Sinvastatina 20 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "AAS 100 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Amoxicilina 500 mg", categoria: "medicamento", unidade: "cápsula" },
  { nome: "Azitromicina 500 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Dipirona 500 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Paracetamol 500 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Ibuprofeno 600 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Omeprazol 20 mg", categoria: "medicamento", unidade: "cápsula" },
  { nome: "Salbutamol spray 100 mcg", categoria: "medicamento", unidade: "frasco" },
  { nome: "Prednisona 20 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Sulfato ferroso 40 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Ácido fólico 5 mg", categoria: "medicamento", unidade: "comprimido" },
  { nome: "Levonorgestrel + etinilestradiol", categoria: "medicamento", unidade: "cartela" },
  { nome: "Soro fisiológico 0,9% 500 mL", categoria: "insumo", unidade: "frasco" },
  { nome: "Luva de procedimento", categoria: "insumo", unidade: "par" },
  { nome: "Seringa 3 mL com agulha", categoria: "insumo", unidade: "unidade" },
  { nome: "Gaze estéril", categoria: "insumo", unidade: "pacote" },
  { nome: "Teste rápido de gravidez", categoria: "insumo", unidade: "unidade" },
  { nome: "Teste rápido HIV/sífilis", categoria: "insumo", unidade: "unidade" },
  { nome: "Fita de glicemia", categoria: "insumo", unidade: "unidade" },
  { nome: "Vacina tríplice viral", categoria: "vacina", unidade: "dose" },
  { nome: "Vacina pentavalente", categoria: "vacina", unidade: "dose" },
  { nome: "Vacina influenza", categoria: "vacina", unidade: "dose" },
  { nome: "Vacina antitetânica (dT)", categoria: "vacina", unidade: "dose" },
];

export const NOME_CATEGORIA: Record<CategoriaEstoque, string> = {
  medicamento: "Medicamento",
  insumo: "Insumo",
  vacina: "Vacina",
};

export type SituacaoEstoque = "falta" | "critico" | "atencao" | "ok" | "sem_consumo";

/** Abaixo disso, entra no pedido de reposição. */
export const DIAS_ATENCAO = 15;
export const DIAS_CRITICO = 7;
/** Contagem mais velha que isso não é confiável. */
export const DIAS_CONTAGEM_VELHA = 30;
/** O pedido repõe para este horizonte. */
export const DIAS_DE_REPOSICAO = 45;

/** Dias que o saldo dura no consumo informado. null = consumo zero (não dá para calcular). */
export function diasDeCobertura(saldo: number, consumoMensal: number): number | null {
  if (consumoMensal <= 0) return null;
  if (saldo <= 0) return 0;
  return Math.floor(saldo / (consumoMensal / 30));
}

export function situacaoDoItem(saldo: number, consumoMensal: number): SituacaoEstoque {
  if (saldo <= 0) return "falta";
  const dias = diasDeCobertura(saldo, consumoMensal);
  if (dias === null) return "sem_consumo";
  if (dias <= DIAS_CRITICO) return "critico";
  if (dias <= DIAS_ATENCAO) return "atencao";
  return "ok";
}

export const ROTULO_SITUACAO: Record<SituacaoEstoque, string> = {
  falta: "Em falta",
  critico: "Acaba em dias",
  atencao: "Repor",
  ok: "Ok",
  sem_consumo: "Sem consumo informado",
};

/** Quanto pedir para cobrir DIAS_DE_REPOSICAO; zero se não precisa. */
export function quantidadeAPedir(saldo: number, consumoMensal: number): number {
  if (consumoMensal <= 0) return 0;
  const alvo = Math.ceil((consumoMensal / 30) * DIAS_DE_REPOSICAO);
  return Math.max(0, alvo - Math.max(0, saldo));
}

export function contagemVelha(atualizadoEm: string, hoje: Date = new Date()): boolean {
  const d = new Date(atualizadoEm);
  if (Number.isNaN(d.getTime())) return true;
  return (hoje.getTime() - d.getTime()) / 86_400_000 > DIAS_CONTAGEM_VELHA;
}

export type LinhaEstoque = { item: string; categoria: CategoriaEstoque; unidadeMedida: string; saldo: number; consumoMensal: number; atualizadoEm: string };

export type ItemDoPedido = LinhaEstoque & { unidadeId: string; unidadeNome: string; dias: number | null; situacao: SituacaoEstoque; pedir: number };

/** O pedido de reposição: tudo que está em falta, crítico ou em atenção, com a quantidade a pedir. */
export function montarPedidoReposicao(linhas: (LinhaEstoque & { unidadeId: string; unidadeNome: string })[]): ItemDoPedido[] {
  const ordem: Record<SituacaoEstoque, number> = { falta: 0, critico: 1, atencao: 2, sem_consumo: 3, ok: 4 };
  return linhas
    .map((l) => ({ ...l, dias: diasDeCobertura(l.saldo, l.consumoMensal), situacao: situacaoDoItem(l.saldo, l.consumoMensal), pedir: quantidadeAPedir(l.saldo, l.consumoMensal) }))
    .filter((l) => l.situacao === "falta" || l.situacao === "critico" || l.situacao === "atencao")
    .sort((a, b) => ordem[a.situacao] - ordem[b.situacao] || a.unidadeNome.localeCompare(b.unidadeNome, "pt-BR") || a.item.localeCompare(b.item, "pt-BR"));
}

/** CSV do pedido, para mandar à farmácia central / fornecedor. */
export function pedidoParaCsv(itens: ItemDoPedido[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const cab = ["Unidade", "Item", "Categoria", "Saldo", "Consumo mensal", "Dias de cobertura", "Situação", "Quantidade a pedir", "Unidade de medida"].map(esc).join(";");
  const linhas = itens.map((i) => [i.unidadeNome, i.item, NOME_CATEGORIA[i.categoria], i.saldo, i.consumoMensal, i.dias ?? "", ROTULO_SITUACAO[i.situacao], i.pedir, i.unidadeMedida].map(esc).join(";"));
  return "﻿" + [cab, ...linhas].join("\r\n");
}
