import { describe, it, expect, vi, afterEach } from "vitest";
import { procurarMunicipio } from "@/lib/siconfi";

// ── BARRO DURO EXISTE ──
// A tela disse "o IBGE não tem um município chamado Barro Duro em PI".
// Tem: código 2201408. O que aconteceu foi o IBGE não responder — e falha de
// rede e nome inexistente voltavam o mesmo null. Estes testes travam a
// diferença entre os dois "não", e a busca por nome parecido.

const PI = [
  { id: 2201408, nome: "Barro Duro" },
  { id: 2201507, nome: "Barras" },
  { id: 2211001, nome: "Teresina" },
  { id: 2209104, nome: "São João do Piauí" },
];

function ibgeResponde(lista: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(lista, { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("procurarMunicipio", () => {
  it("nome exato, sem acento e em minúsculas, é encontrado", async () => {
    ibgeResponde(PI);
    const r = await procurarMunicipio("barro duro", "pi");
    expect(r).toEqual({ ok: true, codigo: "2201408", nome: "Barro Duro" });
  });

  it("acento e caixa não importam: 'sao joao do piaui'", async () => {
    ibgeResponde(PI);
    const r = await procurarMunicipio("SAO JOAO DO PIAUI", "PI");
    expect(r.ok && r.codigo).toBe("2209104");
  });

  it("IBGE fora do ar NÃO é 'município não existe'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNRESET"); }));
    expect(await procurarMunicipio("Barro Duro", "PI")).toEqual({ ok: false, motivo: "indisponivel" });

    ibgeResponde({ erro: "x" }, 503);
    expect(await procurarMunicipio("Barro Duro", "PI")).toEqual({ ok: false, motivo: "indisponivel" });
  });

  it("um único nome parecido é aceito: 'barro d' → Barro Duro", async () => {
    ibgeResponde(PI);
    const r = await procurarMunicipio("barro d", "PI");
    expect(r.ok && r.nome).toBe("Barro Duro");
  });

  it("vários parecidos viram sugestão, sem escolher por conta própria", async () => {
    ibgeResponde(PI);
    const r = await procurarMunicipio("barr", "PI");
    expect(r).toEqual({ ok: false, motivo: "nao_encontrado", sugestoes: ["Barro Duro", "Barras"] });
  });

  it("nome inexistente com IBGE respondendo é 'não encontrado', sem sugestão", async () => {
    ibgeResponde(PI);
    expect(await procurarMunicipio("Cidade Modelo", "PI")).toEqual({
      ok: false,
      motivo: "nao_encontrado",
      sugestoes: [],
    });
  });
});
