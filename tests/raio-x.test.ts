import { describe, it, expect } from "vitest";
import { extrairReceita, bimestresEncerrados, proporcaoDaReceita } from "@/lib/raio-x";
import type { LinhaSiconfi } from "@/lib/siconfi";

function linha(conta: string, coluna: string, valor: number): LinhaSiconfi {
  return { conta, coluna, cod_conta: "x", valor };
}

const COLUNA = "Até o Bimestre (c)";

describe("leitura da receita no Anexo 01", () => {
  it("pega o total realizado, e não a previsão", () => {
    // O mesmo conta aparece em várias colunas. Somar a errada mostraria ao
    // visitante a receita ORÇADA como se fosse a arrecadada.
    const linhas = [
      linha("RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)", "PREVISÃO INICIAL", 90_000_000),
      linha("RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)", COLUNA, 28_400_000),
    ];
    expect(extrairReceita(linhas)).toBe(28_400_000);
  });

  it("ignora subcontas para não somar duas vezes", () => {
    // "RECEITAS CORRENTES" está DENTRO do total. Contar as duas dobraria parte
    // da arrecadação.
    const linhas = [
      linha("RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)", COLUNA, 28_400_000),
      linha("RECEITAS CORRENTES", COLUNA, 26_000_000),
      linha("IMPOSTOS, TAXAS E CONTRIBUIÇÕES DE MELHORIA", COLUNA, 4_000_000),
    ];
    expect(extrairReceita(linhas)).toBe(28_400_000);
  });

  it("devolve null quando a conta não veio", () => {
    // Null vira "não informado" na tela. Devolver zero afirmaria que o
    // município não arrecadou nada.
    expect(extrairReceita([linha("OUTRA COISA", COLUNA, 10)])).toBeNull();
    expect(extrairReceita([])).toBeNull();
  });
});

describe("bimestres encerrados", () => {
  it("só conta os que já fecharam", () => {
    // Em maio, apenas o 1º e o 2º bimestre terminaram. Cobrar publicação do 6º
    // seria alarme sobre algo impossível.
    expect(bimestresEncerrados(2026, new Date("2026-05-20T12:00:00Z"))).toEqual([1, 2]);
  });

  it("em janeiro nenhum bimestre do ano fechou ainda", () => {
    expect(bimestresEncerrados(2026, new Date("2026-01-15T12:00:00Z"))).toEqual([]);
  });

  it("no fim do ano conta os seis", () => {
    expect(bimestresEncerrados(2026, new Date("2026-12-31T12:00:00Z"))).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("proporção da receita", () => {
  it("calcula quando os dois números existem", () => {
    expect(proporcaoDaReceita(5_000_000, 20_000_000)).toBeCloseTo(25);
  });

  it("não divide por zero nem inventa número faltando", () => {
    // Um indício que aparece como 0% ou Infinity seria pior que ausência.
    expect(proporcaoDaReceita(5_000_000, 0)).toBeNull();
    expect(proporcaoDaReceita(null, 20_000_000)).toBeNull();
    expect(proporcaoDaReceita(5_000_000, null)).toBeNull();
  });
});
