import { describe, it, expect } from "vitest";
import { sinaisPorCidade, descreverSinal, type EventoDeInteresse } from "@/lib/sinais-de-interesse";

const ev = (tipo: string, cod: string | null, visitante: string, criadoEm: string): EventoDeInteresse => ({
  tipo,
  codigoIbge: cod,
  municipio: cod === "2211001" ? "Teresina" : "Picos",
  uf: "PI",
  visitante,
  criadoEm,
});

describe("sinais de interesse por cidade", () => {
  it("soma visitantes distintos por dia, com peso maior para a proposta", () => {
    const s = sinaisPorCidade(
      [
        ev("raio_x", "2211001", "a", "2026-10-05T10:00:00Z"),
        ev("raio_x", "2211001", "a", "2026-10-05T10:05:00Z"), // recarregou: não conta
        ev("raio_x", "2211001", "b", "2026-10-06T09:00:00Z"),
        ev("proposta_aberta", "2211001", "b", "2026-10-06T09:10:00Z"),
      ],
      new Set()
    );
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ municipio: "Teresina", visitasRaioX: 2, propostasAbertas: 1, dias: 2 });
    expect(s[0].pontos).toBe(2 + 3 + 1);
    expect(descreverSinal(s[0])).toBe("2 visitas ao Raio-X, abriu a proposta 1 vez em 2 dias diferentes");
  });

  it("uma visita solta é ruído e fica de fora", () => {
    expect(sinaisPorCidade([ev("raio_x", "2208007", "a", "2026-10-05T10:00:00Z")], new Set())).toHaveLength(0);
  });

  it("ignora evento sem município e de outro tipo", () => {
    expect(
      sinaisPorCidade(
        [ev("visita", "2211001", "a", "2026-10-05T10:00:00Z"), ev("raio_x", null, "b", "2026-10-05T10:00:00Z")],
        new Set()
      )
    ).toHaveLength(0);
  });

  it("quem já está em contato vai para o fim, marcado", () => {
    const evs = [
      ...["a", "b", "c", "d"].map((v) => ev("raio_x", "2211001", v, "2026-10-05T10:00:00Z")),
      ...["a", "b", "c"].map((v) => ev("raio_x", "2208007", v, "2026-10-05T10:00:00Z")),
    ];
    const s = sinaisPorCidade(evs, new Set(["2211001"]));
    expect(s.map((x) => [x.codigoIbge, x.jaEmContato])).toEqual([
      ["2208007", false],
      ["2211001", true],
    ]);
  });
});
