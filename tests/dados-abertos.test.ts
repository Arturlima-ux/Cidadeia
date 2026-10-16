import { describe, expect, it } from "vitest";
import { CONJUNTOS, definicaoDe, descreverFrescor, haQuanto, linhasDe, maisRecente, paraCsv, paraJson, type Fontes } from "@/lib/dados-abertos";
import { fontesDoExemplo } from "@/lib/portal-exemplo";

const HOJE = new Date("2026-10-16T15:00:00Z");

describe("o arquivo CSV", () => {
  it("abre no Excel brasileiro: BOM, ponto e vírgula, vírgula decimal e aspas quando precisa", () => {
    const csv = paraCsv(
      [
        { chave: "a", titulo: "Nome" },
        { chave: "b", titulo: "Valor (R$)" },
      ],
      [
        { a: "Praça; Centro", b: 1250.5 },
        { a: 'Obra "nova"', b: null },
      ]
    );
    expect(csv.startsWith("﻿Nome;Valor (R$)\r\n")).toBe(true);
    expect(csv).toContain('"Praça; Centro";1250,5');
    expect(csv).toContain('"Obra ""nova""";');
  });
});

describe("os conjuntos", () => {
  const fontes = fontesDoExemplo(HOJE.getTime());

  it("cada conjunto tem colunas que as linhas preenchem", () => {
    for (const def of CONJUNTOS) {
      for (const linha of linhasDe(def.chave, fontes)) {
        expect(Object.keys(linha).sort()).toEqual(def.colunas.map((c) => c.chave).sort());
      }
    }
  });

  it("manifestação nunca leva nome, contato, assunto ou texto", () => {
    const comTudo: Fontes = {
      ...fontes,
      manifestacoes: [{ tipo: "reclamacao", secretaria: "obras", status: "respondido", createdAt: "2026-10-01 10:00:00-03", respondidoEm: "2026-10-04 10:00:00-03", nome: "Maria", email: "m@x", mensagem: "texto" } as never],
    };
    const [linha] = linhasDe("manifestacoes", comTudo);
    expect(linha).toEqual({ tipo: "Reclamação", area: "obras", situacao: "Respondida", aberta_em: "2026-10-01", respondida_em: "2026-10-04", dias_para_responder: 3 });
  });

  it("o JSON leva a origem, a licença e o endereço fixo", () => {
    const def = definicaoDe("obras")!;
    const json = JSON.parse(paraJson(def, linhasDe("obras", fontes), { municipio: "Bela Aurora", frescor: { quando: "2026-10-15 05:50:00-03", sozinho: true, fonte: "PNCP" }, endereco: "https://x/transparencia/exemplo/dados/obras.json" }));
    expect(json.origem).toBe("importado automaticamente do PNCP");
    expect(json.atualizado_em).toBe("2026-10-15T08:50:00.000Z");
    expect(json.licenca).toContain("Uso livre");
    expect(json.registros.length).toBe(5);
  });
});

describe("o selo de atualização", () => {
  it("diz há quanto tempo, em dias de Brasília", () => {
    expect(haQuanto("2026-10-16 08:00:00-03", HOJE)).toBe("hoje");
    expect(haQuanto("2026-10-15 23:30:00-03", HOJE)).toBe("ontem");
    expect(haQuanto("2026-10-10 10:00:00-03", HOJE)).toBe("há 6 dias");
    expect(haQuanto("2026-08-01T12:00:00Z", HOJE)).toBe("em 01/08/2026");
  });

  it("separa o que entrou sozinho do que a prefeitura lançou", () => {
    expect(descreverFrescor({ quando: "2026-10-14 05:50:00-03", sozinho: true, fonte: "PNCP" }, HOJE)).toBe("Atualizado sozinho há 2 dias, direto do PNCP");
    expect(descreverFrescor({ quando: "2026-10-16 09:00:00-03", sozinho: false, fonte: "prefeitura" }, HOJE)).toBe("Atualizado pela prefeitura hoje");
  });

  it("o mais recente entre formatos diferentes", () => {
    expect(maisRecente(["2026-10-01 10:00:00-03", "2026-10-02T00:00:00Z", null])).toBe("2026-10-02T00:00:00Z");
  });
});
