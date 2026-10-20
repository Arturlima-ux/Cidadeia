import { describe, expect, it } from "vitest";
import {
  achadosDoSiope,
  bimestresParaConferir,
  codigoSiope,
  lerIndicadores,
  prazoDoBimestre,
  resumirEstado,
  type FotografiaSiope,
  type IndicadorCru,
} from "@/lib/siope";

// Linhas no formato conferido ao vivo (Angical do Piauí, 2025, 6º bimestre).
const linha = (exib: string, nome: string, valor: string, extra: Partial<IndicadorCru> = {}): IndicadorCru => ({
  TIPO: "Municipal",
  NUM_ANO: 2025,
  NUM_PERI: 6,
  COD_MUNI: 220060,
  NOM_MUNI: "Angical do Piauí",
  COD_EXIB: exib,
  NOM_INDI: nome,
  VAL_INDI: valor,
  ...extra,
});
const MDE = "Percentual de aplicação das receitas de impostos e transferências vinculadas à educação em MDE (mínimo de 25% para estados, DF e municípios)";
const F70 = "Percentual de aplicação do FUNDEB na remuneração dos profissionais da educação (mínimo de 70%) - Inciso XXII";
const NAO = "Percentual das receitas do  FUNDEB não aplicadas no exercício (máximo de10%)";

describe("SIOPE: códigos e prazos", () => {
  it("município com 6 dígitos", () => {
    expect(codigoSiope("2205300")).toBe("220530");
  });

  it("prazo é 30 dias depois do fim do bimestre", () => {
    expect(prazoDoBimestre(2026, 1)).toBe("2026-03-30");
    expect(prazoDoBimestre(2026, 4)).toBe("2026-09-30");
    expect(prazoDoBimestre(2025, 6)).toBe("2026-01-30");
  });

  it("em outubro: fechamento do ano anterior e os bimestres vencidos do ano", () => {
    expect(bimestresParaConferir(new Date("2026-10-20T12:00:00Z"))).toEqual([
      { ano: 2025, bimestre: 6 },
      { ano: 2026, bimestre: 1 },
      { ano: 2026, bimestre: 2 },
      { ano: 2026, bimestre: 3 },
      { ano: 2026, bimestre: 4 },
    ]);
  });

  it("no dia do prazo ainda não venceu", () => {
    const l = bimestresParaConferir(new Date("2026-09-30T12:00:00Z"));
    expect(l.at(-1)).toEqual({ ano: 2026, bimestre: 3 });
  });

  it("em janeiro, antes de vencer o 6º, olha os do ano anterior", () => {
    expect(bimestresParaConferir(new Date("2026-01-15T12:00:00Z"))).toEqual([1, 2, 3, 4, 5].map((b) => ({ ano: 2025, bimestre: b })));
  });
});

describe("SIOPE: indicadores", () => {
  it("lê pelo código de exibição, confirmando pelo nome", () => {
    const i = lerIndicadores(
      [linha("1.1", MDE, "31.34"), linha("1.2", F70, "77.07"), linha("1.4", NAO, "1.9"), linha("8.1", "Valor exigido de aplicação de impostos em MDE (Mínimo de 25%)", "5656281.89"), linha("8.2", "Valor aplicado em MDE da receita de impostos", "7091077.95")],
      2025,
      6
    );
    expect(i).toEqual({ ano: 2025, bimestre: 6, mde: 31.34, fundeb70: 77.07, fundebNaoAplicado: 1.9, exigidoMde: 5656281.89, aplicadoMde: 7091077.95 });
  });

  it("código renumerado com outro nome não é lido como o mínimo", () => {
    expect(lerIndicadores([linha("1.1", "Outro indicador qualquer", "3")], 2025, 6)).toBeNull();
  });

  it("negativo do meio do ano passa como está", () => {
    expect(lerIndicadores([linha("1.1", MDE, "-0.36")], 2026, 4)?.mde).toBe(-0.36);
  });

  it("resumo do estado conta só municípios", () => {
    const e = resumirEstado(
      [
        linha("1.1", MDE, "24.9", { COD_MUNI: 1 }),
        linha("1.2", F70, "65", { COD_MUNI: 1 }),
        linha("1.1", MDE, "26", { COD_MUNI: 2 }),
        linha("1.2", F70, "71", { COD_MUNI: 2 }),
        linha("1.1", MDE, "10", { TIPO: "Estadual", COD_MUNI: null }),
      ],
      2025
    );
    expect(e).toEqual({ ano: 2025, comDado: 2, abaixo25: 1, abaixo70: 1 });
  });
});

const base: FotografiaSiope = {
  codigo: "220530",
  uf: "PI",
  totalNoEstado: 224,
  declaracoes: [],
  parcial: null,
  fechamento: null,
  estado: null,
};
const decl = (ano: number, bimestre: number, declaradoEm: string | null, noEstado: number) => ({ ano, bimestre, prazo: prazoDoBimestre(ano, bimestre), declaradoEm, noEstado });

describe("SIOPE: alertas", () => {
  it("Jerumenha, outubro de 2026: quatro bimestres sem declaração", () => {
    const [a, ...resto] = achadosDoSiope({
      ...base,
      declaracoes: [decl(2025, 6, "2026-07-13", 224), decl(2026, 1, null, 210), decl(2026, 2, null, 203), decl(2026, 3, null, 183), decl(2026, 4, null, 23)],
    });
    expect(resto).toEqual([]);
    expect(a.prioridade).toBe("urgente");
    expect(a.titulo).toBe("SIOPE em atraso: 1º, 2º, 3º e 4º bimestres de 2026 sem declaração");
    expect(a.descricao).toContain("do 1º bimestre de 2026, venceu em 30/03/2026");
    expect(a.descricao).toContain("210 de 224 municípios");
    expect(a.descricao).toContain("art. 38, § 1º");
    expect(a.chave).toBe("siope:atraso:2026-4");
  });

  it("bimestre em que ninguém do estado aparece não acusa (a consulta é que falhou)", () => {
    expect(achadosDoSiope({ ...base, declaracoes: [decl(2026, 4, null, 0)] })).toEqual([]);
  });

  it("em dia, nada", () => {
    expect(achadosDoSiope({ ...base, declaracoes: [decl(2026, 1, "2026-03-20", 200)] })).toEqual([]);
  });

  it("fechamento abaixo dos mínimos: 25%, 70% e o que sobrou do FUNDEB", () => {
    const a = achadosDoSiope({
      ...base,
      fechamento: { ano: 2025, bimestre: 6, mde: 23.4, fundeb70: 66.1, fundebNaoAplicado: 12.5, exigidoMde: 1_000_000, aplicadoMde: 936_000 },
      estado: { ano: 2025, comDado: 224, abaixo25: 3, abaixo70: 5 },
    });
    expect(a.map((x) => [x.chave, x.prioridade])).toEqual([
      ["siope:mde:2025", "urgente"],
      ["siope:fundeb70:2025", "urgente"],
      ["siope:naoaplicado:2025", "medio"],
    ]);
    expect(a[0].descricao).toContain("23,40%");
    expect(a[0].descricao).toContain("faltaram R$");
    expect(a[0].descricao).toContain("3 de 224 municípios");
    expect(a[1].descricao).toContain("5 de 224");
  });

  it("exatamente 25% cumpre", () => {
    expect(achadosDoSiope({ ...base, fechamento: { ano: 2025, bimestre: 6, mde: 25, fundeb70: 96.94, fundebNaoAplicado: 0.36, exigidoMde: 1, aplicadoMde: 1 } })).toEqual([]);
  });

  it("parcial do ano nunca vira alerta", () => {
    expect(achadosDoSiope({ ...base, parcial: { ano: 2026, bimestre: 4, mde: -0.36, fundeb70: 48, fundebNaoAplicado: 35, exigidoMde: null, aplicadoMde: null } })).toEqual([]);
  });
});
