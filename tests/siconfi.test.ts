import { describe, it, expect } from "vitest";
import {
  agregarPorSecretaria,
  competenciaDoBimestre,
  MAPA_FUNCAO,
  type LinhaSiconfi,
} from "@/lib/siconfi";

const COL = "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)";

function linha(p: Partial<LinhaSiconfi>): LinhaSiconfi {
  return {
    conta: "Saúde",
    coluna: COL,
    cod_conta: "RREO2TotalDespesas",
    valor: 1000,
    ...p,
  };
}

describe("agregarPorSecretaria", () => {
  it("mapeia Saúde e Educação para as secretarias correspondentes", () => {
    const r = agregarPorSecretaria([
      linha({ conta: "Saúde", valor: 5000 }),
      linha({ conta: "Educação", valor: 3000 }),
    ]);
    expect(r.find((d) => d.secretaria === "saude")?.valor).toBe(5000);
    expect(r.find((d) => d.secretaria === "educacao")?.valor).toBe(3000);
  });

  it("soma Urbanismo + Saneamento + Transporte em Obras", () => {
    const r = agregarPorSecretaria([
      linha({ conta: "Urbanismo", valor: 100 }),
      linha({ conta: "Saneamento", valor: 50 }),
      linha({ conta: "Transporte", valor: 25 }),
    ]);
    const obras = r.find((d) => d.secretaria === "obras");
    expect(obras?.valor).toBe(175);
    expect(obras?.funcoes).toEqual(["Saneamento", "Transporte", "Urbanismo"]);
  });

  it("IGNORA linhas Intra-Orçamentárias (senão conta o mesmo real duas vezes)", () => {
    const r = agregarPorSecretaria([
      linha({ conta: "Saúde", valor: 5000, cod_conta: "RREO2TotalDespesas" }),
      linha({ conta: "Saúde", valor: 900, cod_conta: "RREO2TotalDespesasIntra" }),
    ]);
    expect(r.find((d) => d.secretaria === "saude")?.valor).toBe(5000);
  });

  it("usa só a coluna de despesa LIQUIDADA, ignorando empenhada e dotação", () => {
    const r = agregarPorSecretaria([
      linha({ conta: "Saúde", valor: 5000, coluna: COL }),
      linha({ conta: "Saúde", valor: 99999, coluna: "DOTAÇÃO INICIAL" }),
      linha({ conta: "Saúde", valor: 77777, coluna: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (b)" }),
    ]);
    expect(r.find((d) => d.secretaria === "saude")?.valor).toBe(5000);
  });

  it("ignora funções não mapeadas (ex: Legislativa, Previdência)", () => {
    const r = agregarPorSecretaria([
      linha({ conta: "Legislativa", valor: 400 }),
      linha({ conta: "Previdência Social", valor: 900 }),
    ]);
    expect(r).toHaveLength(0);
  });

  it("descarta valor inválido, zero ou negativo em vez de propagar lixo", () => {
    const r = agregarPorSecretaria([
      linha({ conta: "Saúde", valor: 0 }),
      linha({ conta: "Saúde", valor: -100 }),
      linha({ conta: "Educação", valor: NaN }),
      linha({ conta: "Educação", valor: Infinity }),
    ]);
    expect(r).toHaveLength(0);
  });

  it("lista vazia não quebra", () => {
    expect(agregarPorSecretaria([])).toEqual([]);
  });

  it("NÃO cria entrada para licitações — não existe função orçamentária equivalente", () => {
    const r = agregarPorSecretaria([
      linha({ conta: "Saúde", valor: 1 }),
      linha({ conta: "Educação", valor: 1 }),
      linha({ conta: "Urbanismo", valor: 1 }),
    ]);
    expect(r.some((d) => (d.secretaria as string) === "licitacoes")).toBe(false);
    expect(Object.values(MAPA_FUNCAO)).not.toContain("licitacoes");
  });
});

describe("competenciaDoBimestre", () => {
  it("converte bimestre no último mês do período", () => {
    expect(competenciaDoBimestre(2026, 1)).toBe("2026-02");
    expect(competenciaDoBimestre(2026, 3)).toBe("2026-06");
    expect(competenciaDoBimestre(2026, 6)).toBe("2026-12");
  });

  it("não estoura o mês 12", () => {
    expect(competenciaDoBimestre(2026, 9)).toBe("2026-12");
  });
});
