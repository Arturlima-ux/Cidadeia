import { describe, expect, it } from "vitest";
import { separarGente, visitantesRobos, type EventoBruto } from "@/lib/visitas-de-gente";

const ev = (visitante: string, tipo: string, codigoIbge: string | null, hora: string): EventoBruto => ({
  visitante,
  tipo,
  codigoIbge,
  criadoEm: `2026-10-18T${hora}.000Z`,
});

describe("robô pelo comportamento", () => {
  it("gente: abre o Raio-X da cidade, lê, e só depois abre a proposta", () => {
    const evs = [ev("a", "visita", null, "13:00:00"), ev("a", "raio_x", "3205002", "13:00:01"), ev("a", "proposta_aberta", "3205002", "13:03:40")];
    expect(visitantesRobos(evs).size).toBe(0);
  });

  it("gente que olha a própria cidade e duas vizinhas continua contando", () => {
    const evs = ["2205300", "2204501", "2203909"].map((c, i) => ev("a", "raio_x", c, `13:0${i}:00`));
    expect(visitantesRobos(evs).size).toBe(0);
  });

  it("Raio-X de cinco cidades no mesmo dia é varredura", () => {
    const evs = ["1", "2", "3", "4", "5"].map((c, i) => ev("r", "raio_x", c, `13:0${i}:00`));
    expect([...visitantesRobos(evs)]).toEqual(["r"]);
  });

  it("trinta páginas no mesmo dia é varredura", () => {
    const evs = Array.from({ length: 30 }, (_, i) => ev("r", "visita", null, `13:${String(i).padStart(2, "0")}:00`));
    expect([...visitantesRobos(evs)]).toEqual(["r"]);
  });

  it("abrir a proposta segundos depois do Raio-X da mesma cidade é robô ou pré-carregamento", () => {
    const evs = [ev("r", "raio_x", "5108600", "13:00:00"), ev("r", "proposta_aberta", "5108600", "13:00:02")];
    expect([...visitantesRobos(evs)]).toEqual(["r"]);
    // Outra cidade, ou proposta antes do Raio-X, não é esse padrão.
    expect(visitantesRobos([ev("x", "raio_x", "1", "13:00:00"), ev("x", "proposta_aberta", "2", "13:00:02")]).size).toBe(0);
    expect(visitantesRobos([ev("x", "proposta_aberta", "1", "13:00:00"), ev("x", "raio_x", "1", "13:00:02")]).size).toBe(0);
  });

  it("quem cai numa regra sai inteiro; os outros ficam", () => {
    const evs = [
      ev("r", "visita", null, "12:59:59"),
      ev("r", "raio_x", "1", "13:00:00"),
      ev("r", "proposta_aberta", "1", "13:00:01"),
      ev("g", "raio_x", "1", "14:00:00"),
    ];
    const { gente, robos } = separarGente(evs);
    expect([...robos]).toEqual(["r"]);
    expect(gente.map((e) => e.visitante)).toEqual(["g"]);
  });
});
