import { describe, it, expect } from "vitest";
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
