// A auditoria de SEO de 23/10/2026 (claude-seo) achou 27 problemas. Estes
// testes seguram os que já foram corrigidos para não voltarem.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReguaLrf from "@/components/site/inicio/ReguaLrf";
import { ldDadosDoMunicipio } from "@/lib/seo";

const ler = (rel: string) => readFileSync(path.join(__dirname, "..", rel), "utf8");

describe("régua da LRF no HTML do servidor", () => {
  it("escreve o percentual do RGF, não o ponto de partida da animação", () => {
    const html = renderToStaticMarkup(
      createElement(ReguaLrf, {
        dado: {
          modo: "real",
          municipio: "Teresina",
          percentual: 42.3,
          situacao: "confortavel",
          periodo: "RGF do 2º quadrimestre de 2026",
          margemAtePrudencial: 1000,
          baseDeReserva: false,
        },
      })
    );
    expect(html).toContain("42,3%");
    expect(html).not.toContain("30,0%");
    // A leitura do número vem visível, sem esperar a animação terminar.
    expect(html).toContain("Abaixo do alerta.");
    expect(html).not.toMatch(/<p[^>]*style="[^"]*opacity:\s*0/);
  });

  it("no exemplo, também sai o valor final", () => {
    const html = renderToStaticMarkup(createElement(ReguaLrf, { dado: { modo: "exemplo" } }));
    expect(html).toContain("52,4%");
  });
});

describe("canônicas", () => {
  it("a home aponta para / (as 5.570 variantes /?m= consolidam nela)", () => {
    expect(ler("src/app/page.tsx")).toMatch(/caminho: "\/"/);
  });

  it.each([
    ["src/app/raio-x/page.tsx", "/raio-x"],
    ["src/app/conformidade/page.tsx", "/conformidade"],
    ["src/app/transparencia/page.tsx", "/transparencia"],
    ["src/app/disponibilidade/page.tsx", "/disponibilidade"],
    ["src/app/suporte/page.tsx", "/suporte"],
  ])("%s declara canônica", (arquivo, caminho) => {
    const fonte = ler(arquivo);
    expect(fonte).toContain("compartilhamento(");
    expect(fonte).toContain(`caminho: "${caminho}"`);
  });
});

describe("schema da página de município", () => {
  const ld = ldDadosDoMunicipio({
    nome: "Teresina",
    uf: "PI",
    nomeDoEstado: "Piauí",
    codigoIbge: "2211001",
    populacao: 908012,
    caminho: "/raio-x/pi/teresina",
    ano: 2026,
  });

  it("é um conjunto de dados do Tesouro, não a prefeitura", () => {
    expect(ld["@type"]).toBe("Dataset");
    expect(JSON.stringify(ld)).not.toContain("Prefeitura Municipal");
    expect((ld.creator as { name: string }).name).toBe("Tesouro Nacional");
  });

  it("tem descrição no tamanho que o Google aceita para Dataset", () => {
    const d = ld.description as string;
    expect(d.length).toBeGreaterThanOrEqual(50);
    expect(d.length).toBeLessThanOrEqual(5000);
  });

  it("a página não usa mais o schema de prefeitura", () => {
    expect(ler("src/app/raio-x/[uf]/[slug]/page.tsx")).not.toContain("ldPrefeitura");
  });
});
