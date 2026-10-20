import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

const { dataDoBanco, fontesDevidas } = await import("@/lib/importacao-automatica");
const { bimestresVencidos } = await import("@/lib/importacoes");

const HOJE = new Date("2026-10-14T08:50:00Z");

describe("a data do banco", () => {
  it("entende o now()::text do Postgres, com fuso de duas casas e microssegundos", () => {
    expect(dataDoBanco("2026-10-14 12:04:43.865568-03").toISOString()).toBe("2026-10-14T15:04:43.865Z");
    expect(dataDoBanco("2026-10-14T12:04:43.000Z").toISOString()).toBe("2026-10-14T12:04:43.000Z");
    expect(dataDoBanco("2026-10-14 12:04:43+05:30").toISOString()).toBe("2026-10-14T06:34:43.000Z");
  });
});

describe("o que importar hoje", () => {
  it("só as fontes dos módulos contratados", () => {
    expect(fontesDevidas(["gestao"], {}, HOJE)).toEqual(["rgf", "rreo", "emendas-pix"]);
    expect(fontesDevidas(["saude", "obras"], {}, HOJE)).toEqual(["rreo", "cnes", "pncp-contratos", "obras", "obrasgov", "infodengue"]);
    // Educação também lê o RREO (mínimo de 25%) e as obras federais de escola.
    expect(fontesDevidas(["educacao"], {}, HOJE)).toEqual(["rreo", "obrasgov"]);
    expect(fontesDevidas(["essencial"], {}, HOJE)).toEqual(["emendas-pix"]);
  });

  it("uma vez por semana: a que rodou há 3 dias espera, a de 7 dias roda", () => {
    const ultimas = {
      rgf: { ok: "2026-10-11 05:50:00-03", falhou: null, resumo: null },
      rreo: { ok: "2026-10-07 05:52:00-03", falhou: null, resumo: null },
    };
    expect(fontesDevidas(["gestao"], ultimas, HOJE)).toEqual(["rreo", "emendas-pix"]);
  });

  it("um minuto a menos não empurra para a semana seguinte", () => {
    const ultimas = { rgf: { ok: "2026-10-07 05:51:00-03", falhou: null, resumo: null } };
    expect(fontesDevidas(["gestao"], ultimas, HOJE)).toContain("rgf");
  });

  it("falhou há pouco: espera o dia seguinte; falhou ontem: tenta", () => {
    const hoje = { rgf: { ok: null, falhou: "2026-10-14 05:00:00-03", resumo: null } };
    expect(fontesDevidas(["gestao"], hoje, HOJE)).not.toContain("rgf");
    const ontem = { rgf: { ok: null, falhou: "2026-10-13 05:50:00-03", resumo: null } };
    expect(fontesDevidas(["gestao"], ontem, HOJE)).toContain("rgf");
  });

  it("forçar roda tudo do plano (ao reconhecer o município)", () => {
    const ultimas = { rgf: { ok: "2026-10-14 05:00:00-03", falhou: null, resumo: null } };
    expect(fontesDevidas(["gestao"], ultimas, HOJE, true)).toEqual(["rgf", "rreo", "emendas-pix"]);
  });
});

describe("os bimestres do RREO que já deveriam estar no Tesouro", () => {
  it("em outubro, o 4º (prazo 30/09) e o 3º", () => {
    expect(bimestresVencidos(HOJE)).toEqual([
      { ano: 2026, bimestre: 4 },
      { ano: 2026, bimestre: 3 },
    ]);
  });

  it("em janeiro, os do ano anterior", () => {
    expect(bimestresVencidos(new Date("2026-01-20T10:00:00Z"))).toEqual([
      { ano: 2025, bimestre: 5 },
      { ano: 2025, bimestre: 4 },
    ]);
  });
});
