import { describe, it, expect } from "vitest";
import { consultarTipos, TIPOS_RGF, TIPOS_RREO } from "@/lib/siconfi-tipos";

describe("consulta nos dois tipos de demonstrativo", () => {
  it("pergunta pelo comum e pelo simplificado", () => {
    expect(TIPOS_RREO).toEqual(["RREO", "RREO Simplificado"]);
    expect(TIPOS_RGF).toEqual(["RGF", "RGF Simplificado"]);
  });

  it("devolve as linhas do tipo que tiver", async () => {
    const r = await consultarTipos(TIPOS_RREO, async (t) => (t === "RREO Simplificado" ? [1, 2] : []));
    expect(r).toEqual([1, 2]);
  });

  it("vazio só quando os dois responderam vazio", async () => {
    expect(await consultarTipos(TIPOS_RREO, async () => [])).toEqual([]);
  });

  it("uma pergunta sem resposta torna a ausência inconclusiva", async () => {
    expect(await consultarTipos(TIPOS_RREO, async (t) => (t === "RREO" ? [] : null))).toBeNull();
  });

  it("achar num tipo vale mesmo se o outro falhou", async () => {
    expect(await consultarTipos(TIPOS_RREO, async (t) => (t === "RREO" ? null : [7]))).toEqual([7]);
  });
});
