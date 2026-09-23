import { describe, it, expect } from "vitest";
import { solucoesParaORaioX, resumoDasSolucoes, type EntradaSolucoes } from "@/lib/raio-x-solucoes";
import { PLANOS_ADDON } from "@/lib/planos";

const base: EntradaSolucoes = {
  municipio: "Bertolínia",
  codigoIbge: "2201150",
  receita: 40_000_000,
  despesaSaude: 8_000_000, // 20% — acima do indício
  despesaEducacao: 12_000_000, // 30% — acima do indício
  despesaObras: 2_000_000,
  rreoFaltando: [],
  rreoEsperados: 4,
  bimestreReferencia: 4,
};

describe("o Raio-X puxa a solução do próprio achado", () => {
  it("todo módulo citado existe de verdade na tabela de planos", () => {
    const chaves = PLANOS_ADDON.map((p) => p.chave);
    for (const s of solucoesParaORaioX(base)) {
      expect(chaves, `módulo ${s.modulo} não existe`).toContain(s.modulo);
    }
  });

  it("relatório faltando vira o primeiro item, com os bimestres citados", () => {
    const s = solucoesParaORaioX({ ...base, rreoFaltando: [2, 3] });
    expect(s[0]!.modulo).toBe("gestao");
    expect(s[0]!.achado).toMatch(/2 relatório/);
    expect(s[0]!.porque).toContain("2º, 3º");
  });

  it("aplicação baixa em educação entra como indício, nunca como acusação", () => {
    const s = solucoesParaORaioX({ ...base, despesaEducacao: 8_000_000 }); // 20%
    const achado = s.find((x) => x.achado.includes("Educação"));
    expect(achado).toBeDefined();
    expect(achado!.porque).toMatch(/Indício, não cálculo do mínimo/);
    // Nenhum texto pode afirmar descumprimento — a base legal do mínimo é outra.
    for (const x of s) {
      expect(x.achado + x.porque + x.resolve).not.toMatch(/descumpr|ilegal|irregular/i);
    }
  });

  it("aplicação acima do indício não gera item de mínimo", () => {
    const s = solucoesParaORaioX(base);
    expect(s.some((x) => x.achado.includes("Educação em"))).toBe(false);
    expect(s.some((x) => x.achado.includes("Saúde em"))).toBe(false);
  });

  it("mesmo sem nenhum problema público, sobra o que base pública não alcança", () => {
    const s = solucoesParaORaioX(base);
    expect(s.length).toBeGreaterThanOrEqual(4);
    expect(s.map((x) => x.modulo)).toContain("saude");
    expect(s.map((x) => x.modulo)).toContain("educacao");
    expect(s.map((x) => x.modulo)).toContain("essencial");
  });

  it("sem investimento publicado, não inventa conversa de obras", () => {
    expect(solucoesParaORaioX({ ...base, despesaObras: null }).some((x) => x.modulo === "obras")).toBe(false);
    expect(solucoesParaORaioX({ ...base, despesaObras: 0 }).some((x) => x.modulo === "obras")).toBe(false);
    expect(solucoesParaORaioX(base).some((x) => x.modulo === "obras")).toBe(true);
  });

  it("sem receita publicada, os percentuais não viram achado", () => {
    const s = solucoesParaORaioX({ ...base, receita: null, despesaEducacao: 10, despesaSaude: 10 });
    expect(s.some((x) => x.achado.includes("% da receita"))).toBe(false);
  });

  it("os itens vêm do que dói mais para o que dói menos", () => {
    const s = solucoesParaORaioX({ ...base, rreoFaltando: [3], despesaEducacao: 8_000_000 });
    const pesos = s.map((x) => x.peso);
    expect(pesos).toEqual([...pesos].sort((a, b) => b - a));
  });

  it("o resumo conta quantos pontos apareceram", () => {
    expect(resumoDasSolucoes({ ...base, rreoFaltando: [3] })).toMatch(/um ponto/);
    expect(resumoDasSolucoes({ ...base, rreoFaltando: [3], despesaEducacao: 8_000_000 })).toMatch(/2 pontos/);
  });

  it("quando está tudo em dia, o resumo diz isso em vez de fingir problema", () => {
    const r = resumoDasSolucoes(base);
    expect(r).toMatch(/está em dia/);
    expect(r).toMatch(/base pública nenhuma alcança/);
  });

  it("o nome do município aparece no texto — é dele que a pessoa veio atrás", () => {
    expect(resumoDasSolucoes(base)).toContain("Bertolínia");
    expect(solucoesParaORaioX(base).some((x) => x.achado.includes("Bertolínia"))).toBe(true);
  });
});
