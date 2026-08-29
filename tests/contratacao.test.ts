import { describe, it, expect } from "vitest";
import {
  LIMITE_DISPENSA,
  cabeNaDispensa,
  caminhoSugerido,
  limiteEstaVigente,
  CAMINHOS,
} from "@/lib/contratacao";
import {
  montarProposta,
  porteDaPopulacao,
  tabelaCompleta,
  PORTES,
  PRECO_MENSAL,
} from "@/lib/precos";
import { PLANOS_ADDON } from "@/lib/planos";

describe("limite de dispensa", () => {
  it("guarda a fundamentação junto do valor", () => {
    // O número sozinho não serve: a prefeitura precisa citar a base legal no
    // processo, e nós precisamos saber qual decreto reajustou.
    expect(LIMITE_DISPENSA.valor).toBeGreaterThan(0);
    expect(LIMITE_DISPENSA.base).toContain("14.133");
    expect(LIMITE_DISPENSA.atualizadoPor).toMatch(/Decreto/);
  });

  it("sabe dizer quando o valor de referência ficou velho", () => {
    // É reajustado por decreto todo ano; publicar limite vencido é publicar
    // informação errada sobre contratação pública.
    expect(limiteEstaVigente(new Date(`${LIMITE_DISPENSA.ano}-06-01T00:00:00Z`))).toBe(true);
    expect(limiteEstaVigente(new Date(`${LIMITE_DISPENSA.ano + 1}-01-02T00:00:00Z`))).toBe(false);
  });
});

describe("caminho de contratação", () => {
  it("indica dispensa abaixo do limite e no limite exato", () => {
    expect(caminhoSugerido(1000)).toBe("dispensa");
    expect(caminhoSugerido(LIMITE_DISPENSA.valor)).toBe("dispensa");
    expect(cabeNaDispensa(LIMITE_DISPENSA.valor)).toBe(true);
  });

  it("indica pregão um centavo acima do limite", () => {
    expect(caminhoSugerido(LIMITE_DISPENSA.valor + 0.01)).toBe("pregao");
    expect(cabeNaDispensa(LIMITE_DISPENSA.valor + 0.01)).toBe(false);
  });

  it("nunca sugere dispensa por causa do valor mensal", () => {
    // Fracionar despesa para caber no limite é vedado pelo art. 75. Um
    // contrato de 12 x 10.000 dá 120.000 no ano: mesmo com mensal baixo,
    // o caminho tem que ser pregão.
    const mensal = 10_000;
    expect(cabeNaDispensa(mensal)).toBe(true); // valor mensal isolado engana
    expect(cabeNaDispensa(mensal * 12)).toBe(false); // o que vale é o ano
  });

  it("descreve os três caminhos com base legal", () => {
    expect(CAMINHOS).toHaveLength(3);
    for (const caminho of CAMINHOS) {
      expect(caminho.nome.length).toBeGreaterThan(0);
      expect(caminho.base.length).toBeGreaterThan(0);
    }
  });
});

describe("porte do município", () => {
  it("classifica pelas faixas de população", () => {
    expect(porteDaPopulacao(8_000)).toBe("ate10k");
    expect(porteDaPopulacao(10_000)).toBe("ate10k");
    expect(porteDaPopulacao(10_001)).toBe("de10a50k");
    expect(porteDaPopulacao(50_000)).toBe("de10a50k");
    expect(porteDaPopulacao(50_001)).toBe("acima50k");
  });

  it("cai na menor faixa quando a população não foi cadastrada", () => {
    // Errar para menos é oferecer o preço mais barato — errar para mais
    // seria cobrar do município pequeno o valor de uma capital.
    expect(porteDaPopulacao(null)).toBe("ate10k");
    expect(porteDaPopulacao(undefined)).toBe("ate10k");
    expect(porteDaPopulacao(0)).toBe("ate10k");
  });

  it("tem uma faixa de preço para cada porte listado", () => {
    for (const plano of PLANOS_ADDON) {
      for (const porte of PORTES) {
        expect(PRECO_MENSAL[plano.chave]).toHaveProperty(porte.chave);
      }
    }
  });
});

describe("montagem da proposta", () => {
  it("marca a proposta como incompleta enquanto houver módulo sem preço", () => {
    // Estado inicial do repositório: nenhum preço definido. A página tem que
    // dizer "sob consulta" em vez de exibir R$ 0,00 como se fosse de graça.
    const proposta = montarProposta({ porte: "ate10k", modulos: ["essencial", "gestao"] });
    expect(proposta.incompleta).toBe(true);
    expect(proposta.itens).toHaveLength(2);
  });

  it("lista os módulos escolhidos e ignora os demais", () => {
    const proposta = montarProposta({ porte: "de10a50k", modulos: ["obras"] });
    expect(proposta.itens.map((i) => i.modulo)).toEqual(["obras"]);
  });

  it("não repete módulo escolhido duas vezes", () => {
    const proposta = montarProposta({ porte: "ate10k", modulos: ["obras", "obras"] });
    expect(proposta.itens).toHaveLength(1);
  });

  it("mantém a ordem do catálogo, não a ordem do clique", () => {
    const proposta = montarProposta({
      porte: "ate10k",
      modulos: ["licitacoes", "essencial", "saude"],
    });
    expect(proposta.itens.map((i) => i.modulo)).toEqual(["essencial", "saude", "licitacoes"]);
  });

  it("proposta vazia soma zero e não é considerada incompleta", () => {
    const proposta = montarProposta({ porte: "ate10k", modulos: [] });
    expect(proposta.mensal).toBe(0);
    expect(proposta.anual).toBe(0);
    expect(proposta.incompleta).toBe(false);
  });

  it("calcula o anual como doze meses e decide o caminho por ele", () => {
    // Independe da tabela real de preços estar preenchida: verifica a regra.
    const anual = (mensal: number) => mensal * 12;
    expect(cabeNaDispensa(anual(400))).toBe(true);
    expect(cabeNaDispensa(anual(6_000))).toBe(false);
  });

  it("tabelaCompleta acompanha o estado da tabela de preços", () => {
    for (const porte of PORTES) {
      const completa = PLANOS_ADDON.every((p) => PRECO_MENSAL[p.chave][porte.chave] !== null);
      expect(tabelaCompleta(porte.chave)).toBe(completa);
    }
  });
});
