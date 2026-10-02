import { describe, it, expect } from "vitest";
import { limparCaminhoColado, deveCorrigirCaminho } from "@/lib/url-colada";

describe("o caso que aconteceu de verdade", () => {
  // O link da demonstração foi colado de uma frase que terminava com uma seta,
  // e o que chegou ao servidor foi `/demo%20→`. 404 para quem fez tudo certo.
  it("tira o espaço e a seta codificados", () => {
    expect(limparCaminhoColado("/demo%20%E2%86%92")).toBe("/demo");
  });

  it("tira também na forma literal", () => {
    expect(limparCaminhoColado("/demo →")).toBe("/demo");
  });

  it("hexadecimal em caixa baixa também conta", () => {
    // O navegador manda %E2; outras ferramentas mandam %e2.
    expect(limparCaminhoColado("/demo%20%e2%86%92")).toBe("/demo");
  });
});

describe("a pontuação que mensageiro gruda", () => {
  it("ponto final de frase", () => {
    expect(limparCaminhoColado("/demo.")).toBe("/demo");
  });

  it("parêntese que fechava", () => {
    expect(limparCaminhoColado("/raio-x/pi/teresina)")).toBe("/raio-x/pi/teresina");
  });

  it("vírgula no meio de uma lista", () => {
    expect(limparCaminhoColado("/solucoes,")).toBe("/solucoes");
  });

  it("aspas de um texto copiado", () => {
    expect(limparCaminhoColado('/kit"')).toBe("/kit");
    expect(limparCaminhoColado("/kit'")).toBe("/kit");
  });

  it("vários de uma vez, na ordem que vierem", () => {
    expect(limparCaminhoColado("/demo).")).toBe("/demo");
    expect(limparCaminhoColado("/demo%20%E2%86%92.")).toBe("/demo");
  });

  it("espaço que não quebra, do Word", () => {
    expect(limparCaminhoColado("/demo%C2%A0")).toBe("/demo");
  });
});

describe("o que NUNCA pode ser mutilado", () => {
  // Aparar o fim de um endereço é perigoso. A lista é fechada, e nenhuma rota
  // do produto pode cair nela.
  it("rota normal fica intacta", () => {
    for (const p of [
      "/",
      "/demo",
      "/solucoes",
      "/raio-x/pi/teresina",
      "/dashboard/prestacao",
      "/dashboard/secretarias/saude",
      "/admin/pedidos",
    ]) {
      expect(limparCaminhoColado(p)).toBeNull();
    }
  });

  it("arquivo com extensão não perde a extensão", () => {
    // O ponto só é lixo no FIM. Em "sitemap.xml" ele não está no fim.
    expect(limparCaminhoColado("/sitemap.xml")).toBeNull();
    expect(limparCaminhoColado("/robots.txt")).toBeNull();
  });

  it("barra final é assunto do Next, não nosso", () => {
    // Duas regras disputando o mesmo caractere produzem laço de
    // redirecionamento.
    expect(limparCaminhoColado("/demo/")).toBeNull();
  });

  it("hífen, sublinhado e dígito não são pontuação", () => {
    expect(limparCaminhoColado("/raio-x/pi/sao-raimundo-nonato")).toBeNull();
    expect(limparCaminhoColado("/proposta/acompanhar_2026")).toBeNull();
    expect(limparCaminhoColado("/modulos/essencial2")).toBeNull();
  });

  it("não decodifica a estrutura do caminho", () => {
    // Decodificar o caminho inteiro viraria %2F em barra e mudaria a rota
    // pedida — trocando um 404 por algo pior que um 404.
    expect(limparCaminhoColado("/raio-x%2Fpi")).toBeNull();
  });
});

describe("não devolve o mesmo caminho, devolve null", () => {
  // Quem chama precisa saber se deve redirecionar. Comparar strings do lado de
  // fora convidaria a um laço no dia em que a comparação ficasse errada.
  it("nada a tirar é null, não a string", () => {
    expect(limparCaminhoColado("/demo")).toBeNull();
  });

  it("o resultado da limpeza nunca precisa de nova limpeza", () => {
    // Se precisasse, o redirecionamento cairia em laço.
    for (const sujo of ["/demo%20%E2%86%92", "/demo).", "/kit\"", "/demo%C2%A0."]) {
      const limpo = limparCaminhoColado(sujo)!;
      expect(limpo).not.toBeNull();
      expect(limparCaminhoColado(limpo)).toBeNull();
    }
  });

  it("endereço só de pontuação cai na raiz, não em vazio", () => {
    expect(limparCaminhoColado("/.")).toBe("/");
    expect(limparCaminhoColado("/%20")).toBe("/");
  });
});

describe("só GET e HEAD são corrigidos", () => {
  // Um POST redirecionado com 308 mantém método e corpo. Reenviar um
  // formulário para um endereço que o servidor adivinhou estraga mais que o
  // problema que conserta.
  it("GET e HEAD corrigem", () => {
    expect(deveCorrigirCaminho("GET", "/demo.")).toBe("/demo");
    expect(deveCorrigirCaminho("HEAD", "/demo.")).toBe("/demo");
  });

  it("POST, PUT e DELETE não", () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(deveCorrigirCaminho(m, "/demo.")).toBeNull();
    }
  });

  it("GET em rota limpa continua sem correção", () => {
    expect(deveCorrigirCaminho("GET", "/demo")).toBeNull();
  });
});
