import { describe, it, expect } from "vitest";
import { REGIOES_DF, regioesComoMunicipios, regiaoPorCodigo, ehRegiaoDf, codigoDaRegiao } from "@/lib/regioes-df";
import { municipioDoParametro, municipioParaDados } from "@/lib/fatos-do-municipio";

describe("regiões administrativas do DF", () => {
  it("são as 35 oficiais, sem repetição", () => {
    expect(REGIOES_DF.length).toBe(35);
    expect(new Set(REGIOES_DF).size).toBe(35);
    expect(REGIOES_DF).toContain("Ceilândia");
    expect(REGIOES_DF).toContain("Água Quente");
  });

  it("código ida e volta", () => {
    const ceilandia = REGIOES_DF.indexOf("Ceilândia");
    expect(regiaoPorCodigo(codigoDaRegiao(ceilandia))?.nome).toBe("Ceilândia");
    expect(regiaoPorCodigo("DF-RA-99")).toBeNull();
    expect(regiaoPorCodigo("lixo")).toBeNull();
  });

  it("vêm em ordem alfabética para o seletor", () => {
    const nomes = regioesComoMunicipios().map((m) => m.nome);
    expect(nomes).toEqual([...nomes].sort((a, b) => a.localeCompare(b, "pt-BR")));
  });

  it("o parâmetro da home aceita região, e os dados são os do DF inteiro", () => {
    const m = municipioDoParametro("DF-RA-09");
    expect(m?.nome).toBe("Ceilândia");
    expect(ehRegiaoDf(m)).toBe(true);
    const dados = municipioParaDados(m!);
    expect(dados.codigo).toBe("5300108");
    expect(dados.nome).toBe("Brasília");
  });

  it("município comum passa direto", () => {
    const t = municipioDoParametro("2211001");
    expect(municipioParaDados(t!).codigo).toBe("2211001");
  });
});
