import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PREFEITURAS_INTERNAS } from "@/lib/prefeituras-internas";
import { PREFEITURA_EQUIPE_ID, PREFEITURA_TESTE_ID } from "@/lib/equipe";

// O painel de teste apareceu na home como "Ambiente de teste, --", ao lado
// da cidade de exemplo. Prefeitura interna não é cidade: nem na lista, nem
// no endereço público.
describe("portais internos não vão a público", () => {
  it("a lista de internas tem a equipe e o teste", () => {
    expect(PREFEITURAS_INTERNAS).toEqual(expect.arrayContaining([PREFEITURA_EQUIPE_ID, PREFEITURA_TESTE_ID]));
  });
  it("a lista pública e a busca do portal excluem as internas", () => {
    for (const arquivo of ["src/lib/portais.ts", "src/app/transparencia/actions.ts"]) {
      expect(readFileSync(arquivo, "utf8"), arquivo).toMatch(/notInArray\(configPublica\.prefeituraId, PREFEITURAS_INTERNAS\)/);
    }
  });
});
