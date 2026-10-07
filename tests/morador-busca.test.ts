import { describe, it, expect } from "vitest";
import { maisProximo, sugerir } from "@/components/morador/AcheSuaCidade";
import { decodificarPontos } from "@/lib/mapa-municipios";
import { codigosNaOrdemDoMapa } from "@/lib/mapa-municipios-codigos";
import { municipioPorCodigo } from "@/lib/municipios";

const lista = codigosNaOrdemDoMapa().map((c) => {
  const m = municipioPorCodigo(c)!;
  return [c, m.nome, m.uf, m.populacao ?? 0] as const;
});

describe("busca do morador, sem escolher estado", () => {
  it("acha pelo nome, sem acento, a maior primeiro", () => {
    const r = sugerir(lista, "boa esperanca");
    expect(r[0][1]).toBe("Boa Esperança");
    expect(r[0][2]).toBe("MG");
    expect(r.map((l) => l[2])).toContain("ES");
  });

  it("a sigla no fim separa as cidades de mesmo nome", () => {
    expect(sugerir(lista, "boa esperanca es")[0][0]).toBe("3201001");
  });

  it("acha pelo meio do nome", () => {
    expect(sugerir(lista, "noronha")[0][1]).toBe("Fernando de Noronha");
  });
});

describe("Estou aqui", () => {
  const pontos = decodificarPontos();
  const cidade = (lat: number, lon: number) => lista[maisProximo(lat, lon, pontos).indice][1];

  it("acha a cidade pela posição da sede", () => {
    expect(cidade(-5.0892, -42.8019)).toBe("Teresina");
    expect(cidade(-18.5395, -40.2958)).toBe("Boa Esperança");
    expect(cidade(-23.5505, -46.6333)).toBe("São Paulo");
  });

  it("longe de qualquer sede, a distância denuncia", () => {
    expect(maisProximo(38.7223, -9.1393, pontos).distanciaKm).toBeGreaterThan(80); // Lisboa
  });
});
