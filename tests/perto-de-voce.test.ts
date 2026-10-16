import { describe, expect, it } from "vitest";
import { bairrosDosLugares, descreverDistancia, distanciaMetros, maisPerto, noBairro, type LugarPerto } from "@/lib/perto-de-voce";

const lugar = (id: string, grupo: LugarPerto["grupo"], lat: number | null, lng: number | null, bairro: string | null = null, peso = 5): LugarPerto => ({
  id,
  grupo,
  nome: id,
  rotulo: "",
  bairro,
  endereco: null,
  telefone: null,
  horario: null,
  lat,
  lng,
  peso,
});

describe("distância", () => {
  it("um grau de latitude dá cerca de 111 km", () => {
    expect(Math.round(distanciaMetros({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) / 1000)).toBe(111);
  });

  it("descreve a pé quando é perto e de carro quando é longe", () => {
    expect(descreverDistancia(450)).toBe("450 m · cerca de 7 min a pé");
    expect(descreverDistancia(1110)).toBe("1,1 km · cerca de 18 min a pé");
    expect(descreverDistancia(3200)).toBe("3,2 km · cerca de 8 min de carro");
  });
});

describe("o mais perto", () => {
  const centro = { lat: -6.5, lng: -41 };
  const lugares = [
    lugar("ubs-longe", "saude", -6.53, -41),
    lugar("ubs-perto", "saude", -6.501, -41),
    lugar("sem-coordenada", "saude", null, null, "Centro"),
    lugar("escola", "escola", -6.505, -41),
  ];

  it("ordena por distância e ignora o que não tem coordenada", () => {
    const r = maisPerto(lugares, centro);
    expect(r.saude.map((l) => l.id)).toEqual(["ubs-perto", "ubs-longe"]);
    expect(r.escola[0].metros).toBeGreaterThan(500);
    expect(r.obra).toEqual([]);
  });

  it("por bairro, sem diferenciar acento e maiúscula, e o mais importante primeiro", () => {
    const l = [lugar("farmacia", "saude", null, null, "São José", 2), lugar("upa", "saude", null, null, "sao jose", 10)];
    expect(bairrosDosLugares(l)).toEqual(["São José"]);
    expect(noBairro(l, "SÃO JOSÉ").saude.map((x) => x.id)).toEqual(["upa", "farmacia"]);
  });
});
