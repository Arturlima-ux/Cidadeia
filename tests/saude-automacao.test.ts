import { describe, expect, it } from "vitest";
import { achadosDasArboviroses, lerSemanas, vizinhosDe, type FotografiaArboviroses, type Semana, type SemanaCru } from "@/lib/arboviroses";
import { achadoDaBaseVelha } from "@/lib/minimos-automaticos";
import tabela from "@/dados/municipios.json";

const UF = new Map(((tabela as unknown as { municipios: [string, string, string, number | null][] }).municipios).map((m) => [m[0], m[2]]));

const cru = (se: number, nivel: number, casos_est: number, extra: Partial<SemanaCru> = {}): SemanaCru => ({
  SE: se,
  data_iniSE: Date.UTC(2026, 0, 4) + (se - 202601) * 7 * 86_400_000,
  casos: Math.floor(casos_est * 0.8),
  casos_est,
  p_inc100k: casos_est * 3.217,
  nivel,
  Rt: 1.234,
  ...extra,
});

const semana = (nivel: number, estimados: number, se = 202640): Semana => ({ se, inicio: "2026-10-04", casos: estimados, estimados, incidencia: 12.5, nivel, rt: null });

describe("InfoDengue: leitura das semanas", () => {
  it("ordena da mais recente, corta em 8 e arredonda", () => {
    const lista = Array.from({ length: 12 }, (_, i) => cru(202630 + i, 1, i + 0.6));
    const s = lerSemanas(lista.reverse().reverse());
    expect(s).toHaveLength(8);
    expect(s[0].se).toBe(202641);
    expect(s[7].se).toBe(202634);
    expect(s[0].estimados).toBe(12);
    expect(s[0].rt).toBe(1.23);
    expect(s[0].inicio).toMatch(/^2026-\d{2}-\d{2}$/);
  });

  it("nível fora da escala vira 1 a 4; Rt zero vira nulo; estimativa ausente usa notificados", () => {
    const [s] = lerSemanas([cru(202640, 7, 0, { casos_est: null, casos: 5, Rt: 0 })]);
    expect(s.nivel).toBe(4);
    expect(s.rt).toBeNull();
    expect(s.estimados).toBe(5);
    expect(lerSemanas([cru(202640, 0, 1)])[0].nivel).toBe(1);
  });

  it("descarta linha sem semana", () => {
    expect(lerSemanas([{ SE: undefined as unknown as number, data_iniSE: 1 }, cru(202640, 1, 1)])).toHaveLength(1);
  });
});

describe("InfoDengue: alertas", () => {
  const base: FotografiaArboviroses = { dengue: [], chikungunya: [], vizinhos: [] };

  it("verde não alerta", () => {
    expect(achadosDasArboviroses({ ...base, dengue: [semana(1, 3)] })).toEqual([]);
  });

  it("prioridade segue o nível, com chave por doença e nível", () => {
    const a = achadosDasArboviroses({ ...base, dengue: [semana(4, 90), semana(3, 60)], chikungunya: [semana(2, 1)] });
    expect(a.map((x) => [x.chave, x.prioridade])).toEqual([
      ["arbovirose:dengue:nivel4", "urgente"],
      ["arbovirose:chikungunya:nivel2", "info"],
    ]);
    expect(a[0].secretaria).toBe("saude");
    expect(a[0].descricao).toContain("subindo (60 na semana anterior)");
    expect(a[0].descricao).toContain("semana 40 de 2026");
    expect(a[1].descricao).toContain("Hora de prevenir");
  });

  it("laranja é médio", () => {
    expect(achadosDasArboviroses({ ...base, dengue: [semana(3, 20), semana(3, 25)] })[0]).toMatchObject({ prioridade: "medio" });
  });

  it("vizinho em laranja ou vermelho avisa quem ainda está calmo", () => {
    const f = {
      ...base,
      dengue: [semana(1, 0)],
      vizinhos: [
        { codigo: "1", nome: "Floriano", nivel: 3, incidencia: 80 },
        { codigo: "2", nome: "Amarante", nivel: 1, incidencia: 0 },
        { codigo: "3", nome: "Guadalupe", nivel: 4, incidencia: 300 },
      ],
    };
    const [a] = achadosDasArboviroses(f);
    expect(a.chave).toBe("arbovirose:vizinhos");
    expect(a.titulo).toBe("Dengue avança em 2 cidades vizinhas");
    // O mais grave primeiro; o vizinho verde fica de fora.
    expect(a.descricao.indexOf("Guadalupe")).toBeLessThan(a.descricao.indexOf("Floriano"));
    expect(a.descricao).not.toContain("Amarante");
  });

  it("se a cidade já está em alerta alto, o aviso dos vizinhos não repete", () => {
    const f = { ...base, dengue: [semana(3, 40)], vizinhos: [{ codigo: "1", nome: "X", nivel: 4, incidencia: 1 }] };
    expect(achadosDasArboviroses(f).map((a) => a.chave)).toEqual(["arbovirose:dengue:nivel3"]);
  });
});

describe("vizinhos pelo mapa", () => {
  it("Jerumenha (PI): 5 cidades próximas, sem ela mesma", () => {
    const v = vizinhosDe("2205300");
    expect(v).toHaveLength(5);
    expect(v).not.toContain("2205300");
    expect(v).toEqual(expect.arrayContaining(["2204501", "2203909"])); // Guadalupe, Floriano
  });

  it("atravessa a divisa: Teresina (PI) tem Timon (MA) ao lado", () => {
    const v = vizinhosDe("2211001");
    expect(v).toContain("2112209");
    expect(UF.get("2112209")).toBe("MA");
  });

  it("código desconhecido não quebra", () => {
    expect(vizinhosDe("9999999")).toEqual([]);
  });
});

describe("mínimos: RREO mais novo que a base", () => {
  it("sem RREO, nada", () => {
    expect(achadoDaBaseVelha("saude", { mesReferencia: 6 }, null)).toBeNull();
  });

  it("base do mesmo mês ou mais nova, nada", () => {
    expect(achadoDaBaseVelha("saude", { mesReferencia: 8 }, { valor: 1, mesReferencia: 8 })).toBeNull();
  });

  it("base velha vira lembrete, sem mexer no percentual", () => {
    const a = achadoDaBaseVelha("educacao", { mesReferencia: 6 }, { valor: 1_234_567, mesReferencia: 8 });
    expect(a).toMatchObject({ prioridade: "info", secretaria: "educacao", chave: "minimo:educacao:rreo:8" });
    expect(a!.titulo).toContain("25%");
    expect(a!.descricao).toContain("até agosto");
    expect(a!.descricao).toContain("de junho");
  });

  it("sem base no ano, o aviso é mais forte", () => {
    const a = achadoDaBaseVelha("saude", null, { valor: 10, mesReferencia: 4 });
    expect(a).toMatchObject({ prioridade: "medio" });
    expect(a!.titulo).toBe("Mínimo de 15% sem acompanhamento neste ano");
  });
});
