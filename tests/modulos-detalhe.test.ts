import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

/**
 * Todos os .ts de uma pasta, recursivamente.
 *
 * Era `globSync`, que existe no Node 24 mas não na versão de @types/node deste
 * projeto: os testes passavam e o `next build` reprovava na checagem de tipos.
 */
function arquivosTs(raiz: string): string[] {
  return readdirSync(raiz, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".ts"))
    .map((f) => `${raiz}/${f}`);
}
import {
  MODULOS_DETALHE,
  ORDEM_HOME,
  detalheDoModulo,
  modulosNaOrdemDaHome,
} from "@/lib/modulos-detalhe";
import { PLANOS_ADDON } from "@/lib/planos";

describe("detalhe dos módulos", () => {
  it("cobre exatamente os módulos que existem para contratar", () => {
    // Um módulo vendável sem detalhe cai da home em silêncio; um detalhe sem
    // módulo descreve algo que ninguém pode comprar.
    const vendaveis = PLANOS_ADDON.map((p) => p.chave).sort();
    const detalhados = MODULOS_DETALHE.map((m) => m.chave).sort();
    expect(detalhados).toEqual(vendaveis);
  });

  it("a ordem da home lista cada módulo uma única vez", () => {
    expect([...ORDEM_HOME].sort()).toEqual(PLANOS_ADDON.map((p) => p.chave).sort());
    expect(new Set(ORDEM_HOME).size).toBe(ORDEM_HOME.length);
    expect(modulosNaOrdemDaHome()).toHaveLength(PLANOS_ADDON.length);
  });

  it("descreve capacidades concretas em todos", () => {
    for (const m of MODULOS_DETALHE) {
      expect(m.capacidades.length, m.chave).toBeGreaterThanOrEqual(3);
      expect(m.resumo.length, m.chave).toBeGreaterThan(20);
      for (const c of m.capacidades) {
        expect(c.length, `${m.chave}: "${c}"`).toBeGreaterThan(20);
      }
    }
  });

  it("mantém automação e IA em campos separados", () => {
    // Esta separação é a razão de o módulo existir. `automacao` é regra
    // determinística e roda sempre; `ia` depende de ANTHROPIC_API_KEY estar
    // configurada. Fundir os dois num campo só venderia um `if` como
    // inteligência artificial, e prometeria como pronto o que depende de uma
    // variável de ambiente que pode não estar no servidor.
    const comAutomacao = MODULOS_DETALHE.filter((m) => m.automacao);
    const comIa = MODULOS_DETALHE.filter((m) => m.ia);
    expect(comAutomacao.length).toBeGreaterThan(0);
    expect(comIa.length).toBeGreaterThan(0);

    for (const m of MODULOS_DETALHE) {
      if (m.automacao) expect(m.automacao.length, m.chave).toBeGreaterThan(20);
      if (m.ia) expect(m.ia.length, m.chave).toBeGreaterThan(20);
    }
  });

  it("só marca noPortal onde o cidadão realmente confere", () => {
    // O portal público publica transparência, obras e licitações. Marcar
    // saúde, educação ou gestão como verificável mandaria o visitante
    // procurar no portal algo que não está lá.
    const noPortal = MODULOS_DETALHE.filter((m) => m.noPortal).map((m) => m.chave).sort();
    expect(noPortal).toEqual(["essencial", "licitacoes", "obras"]);
  });

  it("encontra o detalhe por chave e ignora chave inexistente", () => {
    expect(detalheDoModulo("obras")?.capacidades.length).toBeGreaterThan(0);
    // @ts-expect-error — chave que não é um módulo
    expect(detalheDoModulo("inexistente")).toBeUndefined();
  });
});

describe("o catálogo não descreve um produto que não existe mais", () => {
  // ── POR QUE ESTE BLOCO EXISTE ──
  //
  // O arquivo diz de si mesmo: "nada aqui é aspiração — se a capacidade não
  // está implementada, ela não está escrita". A regra valia na direção de não
  // prometer demais, mas nada impedia a descrição de envelhecer: Obras vendeu
  // por semanas "progresso real contra o previsto" depois que o progresso
  // previsto foi removido do produto, justamente por ser um número que alguém
  // digitava sem fonte.
  //
  // Prometer a mais é pior que prometer a menos numa venda para o poder
  // público, porque o jurídico da prefeitura lê o material inteiro.

  const tudo = MODULOS_DETALHE.map((m) =>
    [m.resumo, ...m.capacidades, m.automacao ?? "", m.ia ?? ""].join(" ")
  ).join("\n");

  it("não promete o progresso esperado, que o produto deixou de ter", () => {
    // ── A NEGAÇÃO NÃO É PROMESSA ──
    //
    // A primeira versão deste teste reprovava a própria frase que explica a
    // correção — "prazo gasto NÃO É progresso esperado" —, porque procurava o
    // termo sem olhar o que vinha antes. Explicar o que o produto deixou de
    // fazer é exatamente o que a tela deve fazer; o que não pode é oferecer.
    const semNegacoes = tudo.replace(/n[ãa]o é progresso esperado/gi, "");
    expect(semNegacoes).not.toMatch(/progresso esperado|progresso previsto|contra o previsto/i);
  });

  it("todo artigo de lei citado no catálogo existe no código", () => {
    // Uma citação legal no material de venda é uma afirmação verificável. Se
    // o catálogo cita o art. 125 e nenhuma regra o implementa, a promessa é
    // de papel — e é o tipo de coisa que o jurídico confere primeiro.
    const artigos = [...tudo.matchAll(/art\.\s*(\d+)/gi)].map((m) => m[1]!);
    if (artigos.length === 0) return;

    const codigo = arquivosTs("src/lib")
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");

    for (const n of new Set(artigos)) {
      expect(codigo, `o catálogo cita o art. ${n} e nenhuma lib o menciona`).toMatch(
        new RegExp(`art\\.\\s*${n}\\b`, "i")
      );
    }
  });

  it("cada módulo cita pelo menos uma fonte ou regra verificável", () => {
    // Capacidade genérica ("gestão inteligente de processos") não ajuda o
    // comprador a defender a contratação dentro da prefeitura. Fonte de dado
    // ou artigo de lei, sim.
    for (const m of MODULOS_DETALHE) {
      const texto = [...m.capacidades, m.automacao ?? ""].join(" ");
      expect(
        /PNCP|CNES|Censo Escolar|Tesouro|art\.|Lei \d|IBGE|portal|contrato/i.test(texto),
        `módulo ${m.chave} não cita nenhuma fonte ou regra`
      ).toBe(true);
    }
  });
});
