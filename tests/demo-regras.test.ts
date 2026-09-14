import { describe, it, expect } from "vitest";
import { decidirNaDemo } from "@/lib/demo/regras";

// A demonstração é o painel real. Se esta regra afrouxar, um visitante grava
// na prefeitura fictícia — ou baixa um PDF com dados inventados e a marca do
// CidadeIA. É a única proteção, então é a que mais precisa de teste.
describe("decidirNaDemo", () => {
  it("navegar é permitido: GET e HEAD em qualquer tela", () => {
    expect(decidirNaDemo("GET", "/dashboard").permitido).toBe(true);
    expect(decidirNaDemo("GET", "/dashboard/secretarias/educacao").permitido).toBe(true);
    expect(decidirNaDemo("HEAD", "/dashboard").permitido).toBe(true);
  });

  it("qualquer POST é recusado — é assim que toda ação de servidor chega", () => {
    for (const m of ["POST", "post", "PUT", "PATCH", "DELETE"]) {
      const d = decidirNaDemo(m, "/dashboard/secretarias/educacao");
      expect(d.permitido, m).toBe(false);
      if (!d.permitido) expect(d.motivo).toContain("nada é gravado");
    }
  });

  it("download de relatório e exportação são recusados mesmo em GET", () => {
    expect(decidirNaDemo("GET", "/api/relatorios/executivo").permitido).toBe(false);
    expect(decidirNaDemo("GET", "/api/relatorios/secretaria/saude").permitido).toBe(false);
    expect(decidirNaDemo("GET", "/api/exportacao?formato=json").permitido).toBe(false);
  });

  it("outras rotas de API em GET continuam livres (o banco precisa acordar)", () => {
    expect(decidirNaDemo("GET", "/api/manter-vivo").permitido).toBe(true);
  });
});
