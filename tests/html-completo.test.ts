import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

// ── O HTML SERVIDO PRECISA ESTAR INTEIRO ──
//
// Dois defeitos reais, encontrados por quem leu a página sem executar
// JavaScript. Nenhum dos dois quebrava nada, e os dois produziam artefato
// visível a quem lesse assim:
//
// 1. `loading.tsx` na raiz criava uma fronteira de Suspense em volta da
//    página inteira. Numa página dinâmica o React aproveita para enviar o
//    esqueleto com lacunas e despachar o resto em `<div hidden>` no fim, com
//    scripts que encaixam cada pedaço. A home saía com 2 de 4 blocos em "O
//    que é verificado" e com um item VAZIO no card do Essencial — 41 blocos
//    ocultos no documento.
//
// 2. O componente Reveal aplicava `opacity: 0` no elemento, no HTML servido.
//    Quarenta blocos da home saíam invisíveis; sem script, a página era uma
//    folha em branco. Não lista incompleta: nada.
//
// Um buscador que não executa script, uma pré-visualização de link em
// mensageiro e um leitor de texto veem exatamente isso — e é assim que um
// secretário costuma receber o link.

function varrer(dir: string): string[] {
  const achados: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const caminho = `${dir}/${e.name}`;
    if (e.isDirectory()) achados.push(...varrer(caminho));
    else if (/\.tsx?$/.test(e.name)) achados.push(caminho);
  }
  return achados;
}

describe("nada do site público depende de JavaScript para aparecer", () => {
  it("não há loading.tsx envolvendo uma página inteira", () => {
    // Fronteira estreita, em volta do pedaço que espera dado, seria aceitável.
    // Em volta do segmento inteiro, não: parte a página ao meio no HTML.
    const loadings = varrer("src/app").filter(
      (a) => a.endsWith("/loading.tsx") && !a.includes("/dashboard/")
    );
    expect(loadings).toEqual([]);
  });

  it("Reveal não esconde o conteúdo no HTML servido", () => {
    // O estado escondido tem de morar no CSS, condicionado à classe que só
    // existe quando o script roda. Voltar a pôr `opacity: 0` no elemento
    // reapaga a página para quem não executa script.
    const reveal = readFileSync("src/components/site/Reveal.tsx", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(reveal).not.toMatch(/opacity:\s*(visivel|0)/);
    expect(reveal).toContain("data-visivel");
  });

  it("a regra que esconde depende da marca de JavaScript", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain(".com-js .revelar:not([data-visivel])");
    // Sem o seletor `.com-js` na frente, a regra valeria sempre — inclusive
    // para quem nunca vai receber a classe.
    expect(css).not.toMatch(/^\s*\.revelar:not\(\[data-visivel\]\)/m);
  });

  it("o layout marca o documento antes da primeira pintura", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toContain("com-js");
    // Precisa estar no <head>: no fim do body, o conteúdo apareceria e sumiria.
    expect(layout.indexOf("com-js")).toBeLessThan(layout.indexOf("<body"));
  });
});
