import { describe, it, expect } from "vitest";
import {
  INDICADORES_APS,
  indicadorAps,
  quadrimestreDe,
  quadrimestresRecentes,
  rotuloQuadrimestre,
  prazoEnvioSiaps,
  situacaoIndicador,
  distanciaDaMeta,
  tendencia,
  montarDesempenho,
  resumoDesempenho,
} from "@/lib/aps";

describe("componente de qualidade da APS", () => {
  it("catálogo oficial: 15 indicadores em três blocos, 7 na eSF/eAP", () => {
    expect(INDICADORES_APS).toHaveLength(15);
    expect(INDICADORES_APS.filter((i) => i.bloco === "esf_eap")).toHaveLength(7);
    expect(INDICADORES_APS.filter((i) => i.bloco === "esb")).toHaveLength(6);
    expect(INDICADORES_APS.filter((i) => i.bloco === "emulti")).toHaveLength(2);
    expect(new Set(INDICADORES_APS.map((i) => i.chave)).size).toBe(15);
    expect(indicadorAps("hipertensao")?.nome).toBe("Cuidado da pessoa com Hipertensão Arterial");
    // exodontia é o único em que menos é melhor
    expect(INDICADORES_APS.filter((i) => i.sentido === "menor_melhor").map((i) => i.chave)).toEqual(["exodontia"]);
  });

  it("nenhuma meta fixada no código — elas vêm da ficha técnica", () => {
    for (const i of INDICADORES_APS) expect(i).not.toHaveProperty("meta");
  });

  it("quadrimestre pelo mês, e as cinco opções recentes voltam no tempo", () => {
    expect(quadrimestreDe(new Date("2026-04-30T12:00:00Z"))).toEqual({ ano: 2026, numero: 1 });
    expect(quadrimestreDe(new Date("2026-05-01T12:00:00Z"))).toEqual({ ano: 2026, numero: 2 });
    expect(quadrimestreDe(new Date("2026-09-22T12:00:00Z"))).toEqual({ ano: 2026, numero: 3 });
    const lista = quadrimestresRecentes(new Date("2026-09-22T12:00:00Z"));
    expect(lista).toHaveLength(5);
    expect(rotuloQuadrimestre(lista[0]!)).toBe("3º quadrimestre de 2026");
    expect(rotuloQuadrimestre(lista[3]!)).toBe("3º quadrimestre de 2025");
    expect(rotuloQuadrimestre(lista[4]!)).toBe("2º quadrimestre de 2025");
  });

  it("prazo do SIAPS é o 10º dia útil do mês seguinte", () => {
    // setembro/2026 → outubro/2026: 1/10 é quinta; 10º dia útil = 14/10
    expect(prazoEnvioSiaps(new Date("2026-09-15T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-10-14");
    // dezembro vira janeiro do ano seguinte
    expect(prazoEnvioSiaps(new Date("2026-12-10T00:00:00Z")).toISOString().slice(0, 4)).toBe("2027");
  });

  it("situação e distância respeitam o sentido do indicador", () => {
    expect(situacaoIndicador(80, 75, "maior_melhor")).toBe("atingido");
    expect(situacaoIndicador(72, 75, "maior_melhor")).toBe("perto");
    expect(situacaoIndicador(40, 75, "maior_melhor")).toBe("abaixo");
    expect(situacaoIndicador(40, null, "maior_melhor")).toBe("sem_meta");
    // exodontia: menor é melhor
    expect(situacaoIndicador(5, 8, "menor_melhor")).toBe("atingido");
    expect(situacaoIndicador(20, 8, "menor_melhor")).toBe("abaixo");
    expect(distanciaDaMeta(40, 75, "maior_melhor")).toBe(35);
    expect(distanciaDaMeta(20, 8, "menor_melhor")).toBe(12);
  });

  it("tendência compara com o quadrimestre anterior", () => {
    expect(tendencia(50, 40, "maior_melhor")).toBe("subiu");
    expect(tendencia(40, 50, "maior_melhor")).toBe("caiu");
    expect(tendencia(50, 50.5, "maior_melhor")).toBe("estavel");
    expect(tendencia(10, 20, "menor_melhor")).toBe("subiu");
    expect(tendencia(50, null, "maior_melhor")).toBe("sem_serie");
  });

  it("o desempenho ordena o que está pior primeiro e resume sem inventar", () => {
    const q = { ano: 2026, numero: 3 as const };
    const linhas = montarDesempenho(
      [
        { indicador: "acesso", equipe: null, resultado: 90, meta: 80, ano: 2026, quadrimestre: 3 },
        { indicador: "hipertensao", equipe: null, resultado: 31, meta: 50, ano: 2026, quadrimestre: 3 },
        { indicador: "gestante", equipe: null, resultado: 60, meta: null, ano: 2026, quadrimestre: 3 },
      ],
      [{ indicador: "hipertensao", equipe: null, resultado: 45, meta: 50, ano: 2026, quadrimestre: 2 }]
    );
    expect(linhas[0]!.indicador.chave).toBe("hipertensao");
    expect(linhas[0]!.tendencia).toBe("caiu");
    expect(linhas[0]!.distancia).toBe(19);
    const r = resumoDesempenho(linhas, q);
    expect(r).toContain("1 abaixo da meta");
    expect(r).toContain("Cuidado da pessoa com Hipertensão Arterial");
    expect(resumoDesempenho([], q)).toContain("Nenhum resultado lançado");
  });

  it("indicador desconhecido é ignorado em vez de quebrar a tela", () => {
    const linhas = montarDesempenho([{ indicador: "inventado", equipe: null, resultado: 10, meta: 20, ano: 2026, quadrimestre: 3 }], []);
    expect(linhas).toEqual([]);
  });
});
