import { describe, it, expect } from "vitest";
import { PANORAMA, umaEmCada, passaramDoAlerta, fracao, dataDoPanorama, faixasDoPanorama } from "@/lib/panorama";
import { CARGOS, cargoPorSlug } from "@/lib/cargos";
import { PLANOS_ADDON } from "@/lib/planos";
import { CARGOS_LIGACAO } from "@/lib/contato-comercial";
import { contar } from "../scripts/vigia/panorama";

describe("panorama das prefeituras", () => {
  it("o arquivo só tem agregados: Brasil e estados, nenhum município", () => {
    expect(Object.keys(PANORAMA).sort()).toEqual(["brasil", "fonte", "geradoEm", "porUf"]);
    expect(Object.keys(PANORAMA.porUf).every((uf) => /^[A-Z]{2}$/.test(uf))).toBe(true);
    expect(PANORAMA.porUf.DF).toBeUndefined();
  });

  it("os estados somam o Brasil", () => {
    const soma = (k: keyof typeof PANORAMA.brasil) =>
      Object.values(PANORAMA.porUf).reduce((t, c) => t + c[k], 0);
    for (const k of Object.keys(PANORAMA.brasil) as (keyof typeof PANORAMA.brasil)[]) {
      expect(soma(k)).toBe(PANORAMA.brasil[k]);
    }
  });

  it("as faixas cabem nas prefeituras com número", () => {
    const b = PANORAMA.brasil;
    expect(passaramDoAlerta(b)).toBeLessThanOrEqual(b.comNumero);
    expect(b.comNumero).toBeLessThanOrEqual(b.municipios);
    expect(b.municipios).toBeGreaterThanOrEqual(5500);
  });

  it("“uma em cada N” nunca exagera", () => {
    const c = { ...PANORAMA.brasil, comNumero: 5524 };
    expect(umaEmCada(1835, c)).toBe("quase uma em cada três"); // 33,2% < 33,3%
    expect(umaEmCada(1842, c)).toBe("uma em cada três"); // 33,35%
    expect(umaEmCada(1500, c)).toBe("uma em cada quatro"); // 27,2%: “três” seria exagero
    expect(umaEmCada(529, c)).toBe("quase uma em cada dez"); // 9,58%
    expect(umaEmCada(0, c)).toBeNull();
  });

  it("formata data e fração em português", () => {
    expect(dataDoPanorama({ ...PANORAMA, geradoEm: "2026-10-07" })).toBe("7 de outubro de 2026");
    expect(fracao(529, { ...PANORAMA.brasil, comNumero: 5524 })).toBe("9,6%");
  });

  it("cada faixa cita o artigo da LRF", () => {
    for (const f of faixasDoPanorama(PANORAMA.brasil)) expect(f.base).toMatch(/^LRF, art\. \d+/);
  });

  it("contar segue a régua municipal da LRF", () => {
    const c = contar([
      { cod: "1", uf: "PI", ok: true, pct: 48.5 },
      { cod: "2", uf: "PI", ok: true, pct: 48.6 },
      { cod: "3", uf: "PI", ok: true, pct: 51.3 },
      { cod: "4", uf: "PI", ok: true, pct: 54 },
      { cod: "5", uf: "PI", ok: true, pct: 54.01, atrasado: true },
      { cod: "6", uf: "PI", ok: false, causa: "nao_publicado" },
      { cod: "7", uf: "PI", ok: false, causa: "inconsistente" },
    ]);
    expect(c).toMatchObject({ municipios: 7, comNumero: 5, alerta: 1, prudencial: 2, acimaDoLimite: 1, rgfAtrasado: 1, semRgf: 1, numerosQueNaoFecham: 1 });
  });
});

describe("páginas por cargo", () => {
  it("são as três pessoas que assinam o RGF", () => {
    expect(CARGOS.map((c) => c.slug)).toEqual(["prefeito", "financas", "controle"]);
    expect(cargoPorSlug("controle")?.rotulo).toBe("Controle interno");
    expect(cargoPorSlug("vereador")).toBeNull();
  });

  it("todo risco tem base legal e todo módulo existe", () => {
    const chaves = PLANOS_ADDON.map((p) => p.chave);
    for (const c of CARGOS) {
      expect(c.riscos.length).toBeGreaterThanOrEqual(3);
      for (const r of c.riscos) expect(r.base).toMatch(/LRF|Lei \d|LC \d|CF/);
      for (const m of c.modulos) expect(chaves).toContain(m);
      expect(CARGOS_LIGACAO as readonly string[]).toContain(c.cargoLigacao);
      expect(c.objecoes.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("não promete WhatsApp nem canal que o produto não tem", () => {
    const tudo = JSON.stringify(CARGOS);
    expect(tudo).not.toMatch(/whatsapp|24 ?h|tempo real/i);
  });
});
