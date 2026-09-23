import { describe, it, expect } from "vitest";
import {
  diasDeAula,
  situacaoDoItemMerenda,
  quantidadeAPedirMerenda,
  montarPedidoMerenda,
  pedidoMerendaParaCsv,
  cabeNaAgriculturaFamiliar,
  itemDoCatalogoMerenda,
  contagemVelhaMerenda,
  DIAS_AULA_DE_REPOSICAO,
  DIAS_AULA_ATENCAO,
} from "@/lib/merenda";
import { apurarPnae, projetarFechamento, cobertura, PERCENTUAL_MINIMO_AF, anosPnae } from "@/lib/pnae";

const HOJE = new Date("2026-09-22T12:00:00Z");
const diasAtras = (n: number) => new Date(HOJE.getTime() - n * 86_400_000).toISOString();

describe("estoque da merenda, em dias de aula", () => {
  it("a cobertura é contada em dia letivo, não em mês", () => {
    // 20 kg de arroz, 2 kg por dia de aula → 10 dias de aula.
    expect(diasDeAula(20, 2)).toBe(10);
    expect(diasDeAula(0, 2)).toBe(0);
    expect(diasDeAula(20, 0)).toBeNull();
  });

  it("classifica pelo que a cozinha entende", () => {
    expect(situacaoDoItemMerenda(0, 2)).toBe("falta");
    expect(situacaoDoItemMerenda(4, 2)).toBe("critico");
    expect(situacaoDoItemMerenda(16, 2)).toBe("atencao");
    expect(situacaoDoItemMerenda(60, 2)).toBe("ok");
    expect(situacaoDoItemMerenda(60, 0)).toBe("sem_consumo");
  });

  it("pede o que falta para cobrir um mês letivo", () => {
    expect(quantidadeAPedirMerenda(10, 2)).toBe(2 * DIAS_AULA_DE_REPOSICAO - 10);
    expect(quantidadeAPedirMerenda(100, 2)).toBe(0);
    expect(quantidadeAPedirMerenda(10, 0)).toBe(0);
  });

  it("contagem de alimento vence mais rápido que a da farmácia", () => {
    expect(contagemVelhaMerenda(diasAtras(10), HOJE)).toBe(false);
    expect(contagemVelhaMerenda(diasAtras(20), HOJE)).toBe(true);
  });

  const linha = (item: string, saldo: number, consumo: number, escola = "EM A", escolaId = "e1") => ({
    item,
    categoria: "graos" as const,
    unidadeMedida: "kg",
    saldo,
    consumoDiario: consumo,
    atualizadoEm: diasAtras(1),
    escolaId,
    escolaNome: escola,
  });

  it("o pedido traz só o que precisa, do mais grave para o menos", () => {
    const pedido = montarPedidoMerenda([
      linha("Arroz", 100, 2),
      linha("Feijão", 0, 3),
      linha("Leite", 4, 2),
      linha("Óleo", 8, 1),
    ]);
    expect(pedido.map((p) => p.item)).toEqual(["Feijão", "Leite", "Óleo"]);
    expect(pedido[0]!.situacao).toBe("falta");
  });

  it("o item que cabe na agricultura familiar é reconhecido pelo nome, com ou sem acento", () => {
    expect(cabeNaAgriculturaFamiliar("Feijão")).toBe(true);
    expect(cabeNaAgriculturaFamiliar("feijao")).toBe(true);
    expect(cabeNaAgriculturaFamiliar("Arroz")).toBe(false);
    expect(cabeNaAgriculturaFamiliar("Óleo de soja")).toBe(false);
  });

  it("o item do catálogo entrega categoria e unidade de graça", () => {
    expect(itemDoCatalogoMerenda("banana")).toMatchObject({ categoria: "hortifruti", unidade: "kg" });
    expect(itemDoCatalogoMerenda("chocolate")).toBeUndefined();
  });

  it("o CSV marca a coluna da agricultura familiar", () => {
    const csv = pedidoMerendaParaCsv(montarPedidoMerenda([linha("Feijão", 0, 3), linha("Arroz", 0, 2)]));
    const linhas = csv.split("\r\n");
    expect(linhas[0]).toContain("Cabe na agricultura familiar");
    expect(linhas.find((l) => l.includes("Feijão"))).toContain('"Sim"');
    expect(linhas.find((l) => l.includes("Arroz"))).not.toContain('"Sim"');
  });

  it("o limite de atenção é de dias de aula, não corridos", () => {
    expect(situacaoDoItemMerenda(DIAS_AULA_ATENCAO * 2, 2)).toBe("atencao");
    expect(situacaoDoItemMerenda((DIAS_AULA_ATENCAO + 1) * 2, 2)).toBe("ok");
  });
});

describe("os 30% da agricultura familiar", () => {
  const compra = (valor: number, af: boolean, data = "2026-03-10") => ({ valor, agriculturaFamiliar: af, dataCompra: data });

  it("sem o repasse informado, não inventa a base da conta", () => {
    const r = apurarPnae([compra(50_000, true)], 0);
    expect(r.situacao).toBe("sem_base");
    expect(r.percentual).toBeNull();
    expect(r.frase).toMatch(/sobre o repasse/);
  });

  it("o percentual é sobre o REPASSE, não sobre o total gasto", () => {
    // Gastou 50 mil, tudo da agricultura familiar, mas recebeu 300 mil:
    // 100% do gasto e apenas 16,7% do repasse. É o repasse que vale.
    const r = apurarPnae([compra(50_000, true)], 300_000);
    expect(r.percentual).toBeCloseTo(16.67, 1);
    expect(r.situacao).toBe("abaixo");
  });

  it("diz em reais quanto falta comprar para fechar a lei", () => {
    const r = apurarPnae([compra(50_000, true)], 300_000);
    expect(r.faltaEmReais).toBeCloseTo(300_000 * 0.3 - 50_000, 2);
  });

  it("cumprido quando alcança os 30%", () => {
    const r = apurarPnae([compra(90_000, true), compra(120_000, false)], 300_000);
    expect(r.percentual).toBeCloseTo(30, 5);
    expect(r.situacao).toBe("cumprido");
    expect(r.faltaEmReais).toBe(0);
    expect(r.frase).toMatch(new RegExp(`${PERCENTUAL_MINIMO_AF}%`));
  });

  it("aponta repasse que ainda não virou compra lançada", () => {
    const r = apurarPnae([compra(90_000, true)], 300_000);
    expect(r.naoAplicado).toBe(210_000);
    expect(cobertura(r)).toBeCloseTo(30, 5);
  });

  it("projeta onde o ano fecha, e se cala quando é cedo demais para projetar", () => {
    const meio = new Date("2026-07-01T12:00:00Z");
    const r = apurarPnae([compra(45_000, true)], 300_000); // 15% em meio ano
    const p = projetarFechamento(r, meio);
    expect(p!.percentualProjetado).toBeGreaterThan(29);
    expect(projetarFechamento(r, new Date("2026-01-10T12:00:00Z"))).toBeNull();
  });

  it("sem repasse informado não há projeção", () => {
    expect(projetarFechamento(apurarPnae([compra(10_000, true)], 0), HOJE)).toBeNull();
  });

  it("oferece o ano corrente e os dois anteriores", () => {
    expect(anosPnae(HOJE)).toEqual([2026, 2025, 2024]);
  });
});
