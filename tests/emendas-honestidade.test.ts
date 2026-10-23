import { describe, expect, it } from "vitest";
import { percentualDeCapital, situacaoDaEmenda, PISO_CAPITAL, type Emenda } from "@/lib/emendas-pix";
import { emendasDeExemplo } from "@/lib/emendas-pix-exemplo";
import { descreverFrescor, paraJson, definicaoDe } from "@/lib/dados-abertos";
import { frescorDoExemplo } from "@/lib/portal-exemplo";

const base: Emenda = { id: 1, codigo: null, ano: 2026, parlamentar: "X", numeroEmenda: null, objeto: "Obra", area: null, valor: 100, custeio: 0, investimento: 100, situacao: "Ciente", impedimento: null, planoTrabalho: null, relatorios: [], devolucoes: [] };
const plano = { situacao: "Aprovado", inicio: "2026-01-01", fim: "2026-12-31", aprovadoEm: "2026-01-02", analisePendente: false };

describe("emendas Pix contadas do jeito certo", () => {
  it("sem plano de trabalho aprovado, a situação é aguardar o plano, não prestar contas", () => {
    expect(situacaoDaEmenda(base).rotulo).toBe("Aguardando plano de trabalho");
    expect(situacaoDaEmenda({ ...base, planoTrabalho: { ...plano, aprovadoEm: null } }).rotulo).toBe("Aguardando plano de trabalho");
    expect(situacaoDaEmenda({ ...base, planoTrabalho: plano }).rotulo).toBe("Prestação de contas pendente");
    expect(situacaoDaEmenda({ ...base, planoTrabalho: plano, relatorios: [{ tipo: "Parcial", situacao: null, data: null, executado: null }] }).rotulo).toBe("Prestação de contas parcial");
    expect(situacaoDaEmenda({ ...base, planoTrabalho: plano, relatorios: [{ tipo: "Final", situacao: null, data: null, executado: null }] }).rotulo).toBe("Contas prestadas");
  });

  it("calcula a parte em capital por ano e marca o que fica abaixo dos 70%", () => {
    const anos = percentualDeCapital([
      { ...base, ano: 2026, custeio: 0, investimento: 800 },
      { ...base, id: 2, ano: 2025, custeio: 250, investimento: 300 },
      { ...base, id: 3, ano: 2024, custeio: 0, investimento: 0 },
    ]);
    expect(anos.map((a) => a.ano)).toEqual([2026, 2025]);
    expect(anos[0].abaixoDoPiso).toBe(false);
    expect(anos[1].percentual).toBeCloseTo(300 / 550);
    expect(anos[1].abaixoDoPiso).toBe(true);
    expect(PISO_CAPITAL).toBe(0.7);
  });

  it("no exemplo, a emenda sem plano não tem prazo e aparece como aguardando plano", () => {
    const b = emendasDeExemplo(new Date("2026-10-22T12:00:00Z")).find((e) => e.parlamentar?.includes("Senador"))!;
    expect(b.planoTrabalho).toBeNull();
    expect(situacaoDaEmenda(b).rotulo).toBe("Aguardando plano de trabalho");
  });
});

describe("dado de exemplo nunca se passa por dado oficial", () => {
  it("todo selo da cidade de exemplo diz que é ilustrativo", () => {
    const fr = frescorDoExemplo(Date.parse("2026-10-22T12:00:00Z"));
    for (const f of Object.values(fr)) {
      expect(f!.ilustrativo).toBe(true);
      const t = descreverFrescor(f!);
      expect(t).toMatch(/^Dados ilustrativos/);
      expect(t).not.toMatch(/^Atualizado sozinho/);
    }
    expect(descreverFrescor(fr.emendas!)).toBe("Dados ilustrativos. Numa prefeitura cliente, este bloco se atualiza sozinho pelo Transferegov");
  });

  it("o arquivo de dados abertos do exemplo não diz que veio de fonte oficial", () => {
    const fr = frescorDoExemplo(Date.now());
    const json = JSON.parse(paraJson(definicaoDe("emendas")!, [], { municipio: "Bela Aurora", frescor: fr.emendas!, endereco: "x" }));
    expect(json.origem).toMatch(/ilustrativos/);
    expect(json.origem).not.toMatch(/importado automaticamente/);
  });

  it("dado real continua com o selo de fonte oficial", () => {
    expect(descreverFrescor({ quando: new Date().toISOString(), sozinho: true, fonte: "Transferegov" })).toMatch(/^Atualizado sozinho .*Transferegov$/);
  });
});
