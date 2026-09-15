import { describe, it, expect } from "vitest";
import { slugDeMunicipio, municipioPorSlug, caminhoDoRaioX } from "@/lib/slug-municipio";
import { todosOsMunicipios } from "@/lib/municipios";

// Cada município tem um endereço no site, derivado do nome oficial. Se dois
// municípios da mesma UF gerassem o mesmo slug, um deles não teria página.
describe("slug de município", () => {
  it("sem acento, minúsculas, hífen", () => {
    expect(slugDeMunicipio("Barro Duro")).toBe("barro-duro");
    expect(slugDeMunicipio("Santa Bárbara d'Oeste")).toBe("santa-barbara-d-oeste");
    expect(slugDeMunicipio("Mogi-Guaçu")).toBe("mogi-guacu");
    expect(slugDeMunicipio("São João do Piauí")).toBe("sao-joao-do-piaui");
  });

  it("do slug volta ao município certo, na UF certa", () => {
    expect(municipioPorSlug("PI", "barro-duro")?.codigo).toBe("2201408");
    expect(municipioPorSlug("pi", "BARRO-DURO")?.codigo).toBe("2201408");
    expect(municipioPorSlug("CE", "barro-duro")).toBeNull();
    expect(municipioPorSlug("XX", "barro-duro")).toBeNull();
  });

  it("nenhum slug se repete dentro da mesma UF — todos os 5.571 têm endereço", () => {
    const vistos = new Set<string>();
    const repetidos: string[] = [];
    for (const m of todosOsMunicipios()) {
      const chave = `${m.uf}/${slugDeMunicipio(m.nome)}`;
      if (vistos.has(chave)) repetidos.push(chave);
      vistos.add(chave);
    }
    expect(repetidos).toEqual([]);
  });

  it("caminho completo", () => {
    expect(caminhoDoRaioX({ uf: "PI", nome: "Barro Duro" })).toBe("/raio-x/pi/barro-duro");
  });
});
