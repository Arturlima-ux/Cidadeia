import { describe, it, expect } from "vitest";
import { diasDeCobertura, situacaoDoItem, quantidadeAPedir, montarPedidoReposicao, pedidoParaCsv, contagemVelha, CATALOGO_ESTOQUE, DIAS_DE_REPOSICAO } from "@/lib/estoque-saude";

describe("estoque em dias de cobertura", () => {
  it("saldo / consumo diário; zero é falta; sem consumo não calcula", () => {
    expect(diasDeCobertura(30, 30)).toBe(30);
    expect(diasDeCobertura(12, 40)).toBe(9);
    expect(diasDeCobertura(0, 40)).toBe(0);
    expect(diasDeCobertura(10, 0)).toBeNull();
  });

  it("situação: falta, crítico (≤7), atenção (≤15), ok", () => {
    expect(situacaoDoItem(0, 24)).toBe("falta");
    expect(situacaoDoItem(5, 30)).toBe("critico");
    expect(situacaoDoItem(12, 30)).toBe("atencao");
    expect(situacaoDoItem(2400, 1800)).toBe("ok");
    expect(situacaoDoItem(10, 0)).toBe("sem_consumo");
  });

  it("pede o que falta para 45 dias, nunca negativo", () => {
    expect(quantidadeAPedir(0, 30)).toBe(45);
    expect(quantidadeAPedir(12, 40)).toBe(Math.ceil((40 / 30) * DIAS_DE_REPOSICAO) - 12);
    expect(quantidadeAPedir(5000, 30)).toBe(0);
    expect(quantidadeAPedir(10, 0)).toBe(0);
  });

  it("o pedido só traz o que precisa, do mais grave para o menos", () => {
    const base = { categoria: "medicamento" as const, unidadeMedida: "un", atualizadoEm: new Date().toISOString(), unidadeId: "u1", unidadeNome: "UBS A" };
    const pedido = montarPedidoReposicao([
      { ...base, item: "Ok", saldo: 1000, consumoMensal: 100 },
      { ...base, item: "Atenção", saldo: 12, consumoMensal: 30 },
      { ...base, item: "Falta", saldo: 0, consumoMensal: 30 },
      { ...base, item: "Crítico", saldo: 5, consumoMensal: 30 },
    ]);
    expect(pedido.map((p) => p.item)).toEqual(["Falta", "Crítico", "Atenção"]);
    const csv = pedidoParaCsv(pedido);
    expect(csv).toContain("Quantidade a pedir");
    expect(csv.split("\r\n")).toHaveLength(4);
  });

  it("contagem com mais de 30 dias é velha; catálogo tem os básicos", () => {
    expect(contagemVelha(new Date(Date.now() - 31 * 86_400_000).toISOString())).toBe(true);
    expect(contagemVelha(new Date().toISOString())).toBe(false);
    expect(CATALOGO_ESTOQUE.some((c) => /Insulina NPH/.test(c.nome))).toBe(true);
    expect(new Set(CATALOGO_ESTOQUE.map((c) => c.nome)).size).toBe(CATALOGO_ESTOQUE.length);
  });
});
