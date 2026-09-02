import { describe, it, expect } from "vitest";
import {
  singular,
  termosDoObjeto,
  semelhanca,
  agruparPorObjeto,
  analisarFracionamento,
  BASE_LEGAL_FRACIONAMENTO,
  type ProcessoDispensa,
} from "@/lib/fracionamento";
import { LIMITE_DISPENSA } from "@/lib/contratacao";

function proc(id: string, objeto: string, valor: number, mes = 1): ProcessoDispensa {
  return {
    id,
    numero: `DL ${id}/2026`,
    objeto,
    valor,
    data: `2026-${String(mes).padStart(2, "0")}-10`,
  };
}

describe("termos do objeto", () => {
  it("remove acento, para 'aquisição' e 'aquisicao' serem a mesma palavra", () => {
    // Este é o ponto em que uma normalização mal escrita passa despercebida:
    // sem tirar acento, os mesmos objetos digitados de formas diferentes nunca
    // se encontram, e o fracionamento deixa de ser detectado em silêncio.
    const comAcento = termosDoObjeto("Aquisição de MATERIAL de limpeza");
    const semAcento = termosDoObjeto("aquisicao de material de limpeza");
    expect([...comAcento].sort()).toEqual([...semAcento].sort());
    expect(comAcento.has("limpeza")).toBe(true);
  });

  it("descarta o enchimento que aparece em todo objeto de licitação", () => {
    // "aquisição", "serviço", "empresa especializada" estão em quase tudo — se
    // contassem, qualquer processo pareceria do mesmo ramo.
    const t = termosDoObjeto(
      "Contratação de empresa especializada para prestação de serviços de limpeza"
    );
    expect(t.has("contratacao")).toBe(false);
    expect(t.has("empresa")).toBe(false);
    expect(t.has("servicos")).toBe(false);
    expect(t.has("limpeza")).toBe(true);
  });

  it("descarta números, porque quantidade não muda o ramo", () => {
    const a = termosDoObjeto("Aquisição de 500 resmas de papel");
    const b = termosDoObjeto("Aquisição de 200 resmas de papel");
    expect([...a].sort()).toEqual([...b].sort());
  });

  it("devolve conjunto vazio para objeto sem palavra significativa", () => {
    expect(termosDoObjeto("aquisição de diversos").size).toBe(0);
    expect(semelhanca(termosDoObjeto(""), termosDoObjeto("papel"))).toBe(0);
  });
});

describe("redução ao singular", () => {
  it("cobre as formas de plural que aparecem em objeto de licitação", () => {
    // Regras específicas do português. Se qualquer uma falhar, dois processos
    // do mesmo ramo deixam de se encontrar e o fracionamento passa em silêncio.
    expect(singular("materiais")).toBe("material");
    expect(singular("papeis")).toBe("papel");
    expect(singular("licitacoes")).toBe("licitacao");
    expect(singular("aquisicoes")).toBe("aquisicao");
    expect(singular("bens")).toBe("bem");
    expect(singular("veiculos")).toBe("veiculo");
    expect(singular("medicamentos")).toBe("medicamento");
  });

  it("não estraga palavra que já está no singular", () => {
    expect(singular("limpeza")).toBe("limpeza");
    expect(singular("merenda")).toBe("merenda");
    expect(singular("combustivel")).toBe("combustivel");
  });

  it("deixa palavra curta intacta", () => {
    expect(singular("gas")).toBe("gas");
  });
});

describe("agrupamento", () => {
  it("junta compras do mesmo ramo escritas de formas diferentes", () => {
    const grupos = agruparPorObjeto([
      proc("1", "Aquisição de material de limpeza", 30_000, 2),
      proc("2", "Compra de materiais de limpeza e higiene", 25_000, 6),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].processos.map((p) => p.id)).toEqual(["1", "2"]);
    expect(grupos[0].total).toBe(55_000);
  });

  it("NÃO junta ramos diferentes que compartilham palavra genérica", () => {
    // "material de limpeza" e "material de expediente" dividem "material" — se
    // o limiar fosse frouxo, a tela insinuaria irregularidade onde não há, e um
    // alerta injusto queima a confiança do gestor de vez.
    const grupos = agruparPorObjeto([
      proc("1", "Aquisição de material de limpeza", 40_000),
      proc("2", "Aquisição de material de expediente", 40_000),
    ]);
    expect(grupos).toHaveLength(0);
  });

  it("não trata processo sozinho como fracionamento", () => {
    // Uma compra é uma compra. Fracionamento exige divisão.
    expect(agruparPorObjeto([proc("1", "Aquisição de merenda escolar", 90_000)])).toHaveLength(0);
  });

  it("encadeia por semelhança, como a natureza comum exige", () => {
    // Se A se parece com B e B com C, os três são do mesmo ramo mesmo que A e C
    // não se pareçam diretamente — é exatamente o padrão do fracionamento.
    const grupos = agruparPorObjeto([
      proc("1", "Aquisição de combustivel gasolina frota", 30_000, 1),
      proc("2", "Aquisição de combustivel gasolina diesel frota", 30_000, 5),
      proc("3", "Aquisição de combustivel diesel frota", 30_000, 9),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].processos).toHaveLength(3);
  });

  it("mostra só os termos que TODOS do grupo compartilham", () => {
    // Exibir os termos de um processo só daria a impressão errada de que o
    // agrupamento saiu dele.
    const grupos = agruparPorObjeto([
      proc("1", "Aquisição de material de limpeza", 30_000),
      proc("2", "Aquisição de material de limpeza hospitalar", 30_000),
    ]);
    expect(grupos[0].termos).toContain("limpeza");
    expect(grupos[0].termos).not.toContain("hospitalar");
  });

  it("ordena os processos do grupo por data", () => {
    const grupos = agruparPorObjeto([
      proc("tarde", "Aquisição de merenda escolar", 30_000, 11),
      proc("cedo", "Aquisição de merenda escolar", 30_000, 3),
    ]);
    expect(grupos[0].processos.map((p) => p.id)).toEqual(["cedo", "tarde"]);
  });

  it("ordena os grupos pela maior soma", () => {
    const grupos = agruparPorObjeto([
      proc("a1", "Aquisição de merenda escolar", 10_000),
      proc("a2", "Aquisição de merenda escolar", 10_000),
      proc("b1", "Aquisição de combustivel frota", 50_000),
      proc("b2", "Aquisição de combustivel frota", 50_000),
    ]);
    expect(grupos[0].total).toBe(100_000);
    expect(grupos[1].total).toBe(20_000);
  });
});

describe("análise", () => {
  const metadeDoLimite = LIMITE_DISPENSA.valor / 2;

  it("marca o grupo que passou do limite anual", () => {
    const r = analisarFracionamento(
      [
        proc("1", "Aquisição de merenda escolar", metadeDoLimite + 1000, 2),
        proc("2", "Aquisição de merenda escolar", metadeDoLimite + 1000, 8),
      ],
      2026
    );
    expect(r.gruposSuspeitos).toHaveLength(1);
    expect(r.gruposSuspeitos[0].excedeLimite).toBe(true);
    expect(r.gruposSuspeitos[0].excedente).toBeCloseTo(2000);
  });

  it("avisa antes de estourar, com o grupo ainda dentro do limite", () => {
    // Serve para o gestor saber, ANTES de abrir a próxima dispensa, que aquele
    // ramo já está no fim da margem — que é quando ainda dá para escolher outro
    // caminho de contratação.
    const r = analisarFracionamento(
      [
        proc("1", "Aquisição de merenda escolar", LIMITE_DISPENSA.valor * 0.45, 2),
        proc("2", "Aquisição de merenda escolar", LIMITE_DISPENSA.valor * 0.4, 7),
      ],
      2026
    );
    expect(r.gruposSuspeitos).toHaveLength(0);
    expect(r.gruposEmAtencao).toHaveLength(1);
  });

  it("não acusa grupo pequeno", () => {
    const r = analisarFracionamento(
      [
        proc("1", "Aquisição de merenda escolar", 5_000, 2),
        proc("2", "Aquisição de merenda escolar", 5_000, 8),
      ],
      2026
    );
    expect(r.gruposSuspeitos).toHaveLength(0);
    expect(r.gruposEmAtencao).toHaveLength(0);
  });

  it("soma todas as dispensas do exercício, mesmo as de ramos distintos", () => {
    const r = analisarFracionamento(
      [proc("1", "Aquisição de merenda escolar", 10_000), proc("2", "Aquisição de combustivel", 7_000)],
      2026
    );
    expect(r.totalDispensas).toBe(17_000);
    expect(r.limite).toBe(LIMITE_DISPENSA.valor);
  });

  it("com nenhum processo não inventa achado", () => {
    const r = analisarFracionamento([], 2026);
    expect(r.totalDispensas).toBe(0);
    expect(r.gruposSuspeitos).toHaveLength(0);
    expect(r.gruposEmAtencao).toHaveLength(0);
  });

  it("carrega a base legal junto do achado", () => {
    // A prefeitura precisa citar o dispositivo ao justificar internamente.
    expect(BASE_LEGAL_FRACIONAMENTO).toContain("75");
    expect(BASE_LEGAL_FRACIONAMENTO).toContain("14.133");
  });
});
