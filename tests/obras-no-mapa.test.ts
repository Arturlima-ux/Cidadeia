import { describe, it, expect } from "vitest";
import { descricaoProgresso, montarObrasNoMapa, situacaoNoMapa } from "@/lib/obras-no-mapa";

const base = {
  id: "o1",
  nome: "Pavimentação da Rua A",
  bairro: "Centro",
  status: "em_andamento",
  progressoAtual: 40,
  latitude: -3.73,
  longitude: -38.52,
};

describe("situação da obra no mapa do painel executivo", () => {
  it("cada status cadastrado cai numa das três situações, ou fica fora", () => {
    expect(situacaoNoMapa("em_andamento")).toBe("andamento");
    // Atrasada está andando, só que devagar.
    expect(situacaoNoMapa("atrasada")).toBe("andamento");
    expect(situacaoNoMapa("paralisada")).toBe("parada");
    expect(situacaoNoMapa("concluida")).toBe("concluida");
    // Planejada não tem canteiro: um marcador diria que há máquina na rua.
    expect(situacaoNoMapa("planejada")).toBeNull();
    expect(situacaoNoMapa("cancelada")).toBeNull();
  });

  it("obra com coordenada entra com a posição exata", () => {
    const { obras } = montarObrasNoMapa([base]);
    expect(obras).toHaveLength(1);
    expect(obras[0]).toMatchObject({ situacao: "andamento", latitude: -3.73, longitude: -38.52, emAtraso: false });
  });

  it("obra só com bairro entra sem coordenada, para o Geocoding procurar", () => {
    const { obras } = montarObrasNoMapa([{ ...base, latitude: null, longitude: null }]);
    expect(obras[0]).toMatchObject({ bairro: "Centro", latitude: null, longitude: null });
  });

  it("coordenada zerada vale como vazia", () => {
    const { obras, semLocal } = montarObrasNoMapa([{ ...base, latitude: 0, longitude: 0, bairro: "  " }]);
    expect(obras).toHaveLength(0);
    expect(semLocal).toBe(1);
  });

  it("conta as planejadas em vez de sumir com elas calado", () => {
    const r = montarObrasNoMapa([base, { ...base, id: "o2", status: "planejada" }]);
    expect(r.obras).toHaveLength(1);
    expect(r.planejadas).toBe(1);
  });

  it("atrasada leva a marca de atraso", () => {
    const { obras } = montarObrasNoMapa([{ ...base, status: "atrasada" }]);
    expect(obras[0].emAtraso).toBe(true);
    expect(descricaoProgresso(obras[0])).toBe("40% executado · em atraso");
  });

  it("sem medição não vira 0%", () => {
    expect(descricaoProgresso({ situacao: "parada", progressoAtual: null, emAtraso: false })).toBe(
      "Sem medição registrada"
    );
    expect(descricaoProgresso({ situacao: "concluida", progressoAtual: 100, emAtraso: false })).toBe("Obra entregue");
  });
});
