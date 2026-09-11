import { describe, it, expect } from "vitest";
import {
  procurarMunicipioLocal,
  municipioPorCodigo,
  TOTAL_MUNICIPIOS,
  ANO_ESTIMATIVA_POPULACAO,
} from "@/lib/municipios";
import bruto from "@/dados/municipios.json";

// O JSON entra tipado como o TypeScript infere (string | number por célula);
// aqui o formato é conhecido: [código, nome, UF, população].
const tabela = bruto as unknown as { municipios: [string, string, string, number | null][] };

// ── A TABELA É O BRASIL INTEIRO ──
// Se faltar um município, o prefeito dele lê "não existe" na primeira tela.
// Estes testes travam a completude e a atualidade do arquivo gerado.

describe("tabela de municípios", () => {
  it("tem os 5.570 municípios do Brasil (mais Brasília, que o IBGE lista)", () => {
    expect(TOTAL_MUNICIPIOS).toBeGreaterThanOrEqual(5570);
    expect(tabela.municipios).toHaveLength(TOTAL_MUNICIPIOS);
  });

  it("todas as 27 unidades da federação estão lá", () => {
    const ufs = new Set(tabela.municipios.map((m) => m[2]));
    expect(ufs.size).toBe(27);
  });

  it("nenhum código repetido e todos com sete dígitos", () => {
    const codigos = tabela.municipios.map((m) => m[0]);
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(codigos.every((c) => /^\d{7}$/.test(c))).toBe(true);
  });

  it("todo município tem população maior que zero", () => {
    const sem = tabela.municipios.filter((m) => !m[3] || m[3] <= 0);
    expect(sem.map((m) => `${m[1]}/${m[2]}`)).toEqual([]);
  });

  it("a estimativa não ficou velha — rode scripts/atualizar-municipios.mjs", () => {
    // O IBGE publica a estimativa anual por volta de agosto. Uma tabela de
    // dois anos atrás ainda serve para porte, mas é hora de atualizar.
    expect(ANO_ESTIMATIVA_POPULACAO).toBeGreaterThanOrEqual(new Date().getFullYear() - 1);
  });
});

describe("procurarMunicipioLocal", () => {
  it("Barro Duro/PI existe, e a busca ignora caixa", () => {
    const r = procurarMunicipioLocal("barro duro", "pi");
    expect(r.ok && r.municipio.codigo).toBe("2201408");
    expect(r.ok && r.municipio.populacao).toBeGreaterThan(5000);
  });

  it("acento não importa: 'sao joao do piaui'", () => {
    const r = procurarMunicipioLocal("SAO JOAO DO PIAUI", "PI");
    expect(r.ok && r.municipio.nome).toBe("São João do Piauí");
  });

  it("apóstrofo e hífen não atrapalham: Santa Bárbara d'Oeste, Mogi-Guaçu", () => {
    expect(procurarMunicipioLocal("santa barbara d oeste", "SP").ok).toBe(true);
    expect(procurarMunicipioLocal("mogi guacu", "SP").ok).toBe(true);
  });

  it("nome parecido único é aceito; vários viram sugestão", () => {
    const um = procurarMunicipioLocal("barro d", "PI");
    expect(um.ok && um.municipio.nome).toBe("Barro Duro");

    const varios = procurarMunicipioLocal("santa", "PI");
    expect(varios.ok).toBe(false);
    if (!varios.ok && varios.motivo === "nao_encontrado") {
      expect(varios.sugestoes.length).toBeGreaterThan(1);
      expect(varios.sugestoes.length).toBeLessThanOrEqual(5);
    }
  });

  it("UF inexistente é erro próprio, não 'município não encontrado'", () => {
    expect(procurarMunicipioLocal("Teresina", "XX")).toEqual({ ok: false, motivo: "uf_invalida" });
  });

  it("município de outro estado não é achado na UF errada", () => {
    const r = procurarMunicipioLocal("Teresina", "CE");
    expect(r.ok).toBe(false);
  });

  it("por código: Teresina", () => {
    expect(municipioPorCodigo("2211001")?.nome).toBe("Teresina");
    expect(municipioPorCodigo("0000000")).toBeNull();
  });
});
