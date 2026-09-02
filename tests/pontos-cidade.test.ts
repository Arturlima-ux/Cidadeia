import { describe, it, expect } from "vitest";
import { montarPontosCidade, obraAtrasada } from "@/lib/pontos-cidade";

const SEM_NADA = { saude: [], escolas: [], obras: [] };

function obra(over: Partial<Parameters<typeof obraAtrasada>[0]> = {}) {
  return { status: "em_andamento", progressoAtual: 50, progressoEsperado: 50, ...over };
}

describe("obra atrasada", () => {
  it("tolera a variação normal de cronograma", () => {
    // Chamar de atrasada uma obra 5 pontos abaixo do previsto encheria o mapa
    // de vermelho e ensinaria o prefeito a ignorar a cor.
    expect(obraAtrasada(obra({ progressoAtual: 45, progressoEsperado: 50 }))).toBe(false);
    expect(obraAtrasada(obra({ progressoAtual: 39, progressoEsperado: 50 }))).toBe(true);
  });

  it("nunca marca obra concluída ou cancelada", () => {
    // O progresso esperado às vezes fica registrado acima do real mesmo depois
    // de entregue. Marcar isso de vermelho seria acusar de atraso o que acabou.
    expect(obraAtrasada(obra({ status: "concluida", progressoAtual: 100, progressoEsperado: 120 }))).toBe(false);
    expect(obraAtrasada(obra({ status: "cancelada", progressoAtual: 10, progressoEsperado: 90 }))).toBe(false);
  });

  it("marca obra parada bem abaixo do previsto", () => {
    expect(obraAtrasada(obra({ progressoAtual: 20, progressoEsperado: 65 }))).toBe(true);
  });
});

describe("montagem dos pontos", () => {
  it("junta as três camadas com prefixo próprio de id", () => {
    // Sem prefixo, uma escola e uma obra com o mesmo id do banco colidiriam e
    // o React descartaria um dos marcadores em silêncio.
    const pontos = montarPontosCidade({
      saude: [{ id: "1", nome: "UBS Centro", tipo: "ubs", latitude: -5.1, longitude: -42.8 }],
      escolas: [{ id: "1", nome: "E.M. Brasil", evasaoPercentual: 4, latitude: -5.2, longitude: -42.9 }],
      obras: [{ id: "1", nome: "Praça", status: "em_andamento", progressoAtual: 80, progressoEsperado: 80, latitude: -5.3, longitude: -42.7 }],
    });

    expect(pontos.map((p) => p.id)).toEqual(["saude-1", "educacao-1", "obras-1"]);
    expect(pontos.map((p) => p.camada)).toEqual(["saude", "educacao", "obras"]);
  });

  it("descarta item sem coordenada", () => {
    const pontos = montarPontosCidade({
      ...SEM_NADA,
      saude: [
        { id: "a", nome: "Com coordenada", tipo: "ubs", latitude: -5.1, longitude: -42.8 },
        { id: "b", nome: "Sem coordenada", tipo: "ubs", latitude: null, longitude: null },
      ],
    });
    expect(pontos).toHaveLength(1);
    expect(pontos[0].nome).toBe("Com coordenada");
  });

  it("descarta coordenada zerada", () => {
    // Zero é ponto válido no globo — no Golfo da Guiné —, mas é o que um campo
    // numérico vazio vira. Plotar lá espalharia a cidade pelo Atlântico.
    const pontos = montarPontosCidade({
      ...SEM_NADA,
      escolas: [{ id: "a", nome: "Escola", evasaoPercentual: null, latitude: 0, longitude: 0 }],
    });
    expect(pontos).toHaveLength(0);
  });

  it("destaca a obra atrasada e explica o porquê no balão", () => {
    const pontos = montarPontosCidade({
      ...SEM_NADA,
      obras: [
        { id: "a", nome: "UBS", status: "em_andamento", progressoAtual: 20, progressoEsperado: 65, latitude: -5.1, longitude: -42.8 },
      ],
    });
    expect(pontos[0].emAtraso).toBe(true);
    expect(pontos[0].descricao).toContain("esperado 65%");
  });

  it("não destaca obra em dia", () => {
    const pontos = montarPontosCidade({
      ...SEM_NADA,
      obras: [
        { id: "a", nome: "Praça", status: "em_andamento", progressoAtual: 80, progressoEsperado: 80, latitude: -5.1, longitude: -42.8 },
      ],
    });
    expect(pontos[0].emAtraso).toBe(false);
    expect(pontos[0].descricao).not.toContain("esperado");
  });

  it("com nada cadastrado devolve lista vazia", () => {
    expect(montarPontosCidade(SEM_NADA)).toHaveLength(0);
  });
});
