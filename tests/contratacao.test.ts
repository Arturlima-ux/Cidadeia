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
  precoDefinido,
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
  it("soma os módulos escolhidos quando todos têm preço", () => {
    // Este teste dizia o contrário até os preços serem definidos: afirmava que
    // a proposta vinha incompleta porque a tabela nascia toda em null. O
    // mecanismo do "sob consulta" continua vivo e coberto logo abaixo — o que
    // mudou é o estado da tabela, não a regra.
    const proposta = montarProposta({ porte: "ate10k", modulos: ["essencial", "gestao"] });
    expect(proposta.incompleta).toBe(false);
    expect(proposta.itens).toHaveLength(2);
    expect(proposta.mensal).toBe(
      PRECO_MENSAL.essencial.ate10k! + PRECO_MENSAL.gestao.ate10k!
    );
    expect(proposta.anual).toBe(proposta.mensal * 12);
  });

  it("o 'sob consulta' volta sozinho se um preço for apagado", () => {
    // A regra que protege a página: enquanto um módulo escolhido estiver sem
    // preço, o total não pode ser exibido como se fosse fechado. Testado pelos
    // helpers porque a tabela hoje está completa — se um dia voltar a ter null,
    // é este caminho que impede a home de mostrar um total menor que o real.
    for (const plano of PLANOS_ADDON) {
      for (const porte of PORTES) {
        expect(precoDefinido(plano.chave, porte.chave)).toBe(
          PRECO_MENSAL[plano.chave][porte.chave] !== null
        );
      }
    }
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

describe("a tabela de preços não pode quebrar a promessa da home", () => {
  it("nenhuma combinação de módulos estoura o limite anual de dispensa", () => {
    // Este é o teste mais importante do arquivo. A home inteira se apoia em
    // "cabe na dispensa": se um preço subir a ponto de a soma dos seis módulos
    // passar do limite do art. 75, II, a página passa a mentir para o prefeito
    // e o processo montado pelo kit vira nulo. Melhor a suíte quebrar antes.
    for (const porte of PORTES) {
      const proposta = montarProposta({
        porte: porte.chave,
        modulos: PLANOS_ADDON.map((p) => p.chave),
      });
      expect(proposta.incompleta, porte.chave).toBe(false);
      expect(proposta.anual, porte.chave).toBeLessThanOrEqual(LIMITE_DISPENSA.valor);
      expect(cabeNaDispensa(proposta.anual), porte.chave).toBe(true);
    }
  });

  it("guarda folga para reajuste, sem colar no teto", () => {
    // Encostar no limite deixaria a promessa refém do primeiro aumento de
    // preço ou da mudança de faixa do município.
    const maisCara = montarProposta({
      porte: "acima50k",
      modulos: PLANOS_ADDON.map((p) => p.chave),
    });
    expect(maisCara.anual / LIMITE_DISPENSA.valor).toBeLessThan(0.85);
  });

  it("todo porte tem a tabela completa, sem 'sob consulta'", () => {
    // Um preço faltando faz o montador da home dizer que o total está
    // incompleto — logo abaixo do título que critica quem esconde preço.
    for (const porte of PORTES) {
      expect(tabelaCompleta(porte.chave), porte.chave).toBe(true);
    }
  });

  it("cobra mais de município maior, em todos os módulos", () => {
    // Preço plano faria a prefeitura de 8 mil habitantes bancar o custo de uma
    // de 200 mil — e é justamente a faixa pequena que precisa caber no bolso.
    for (const plano of PLANOS_ADDON) {
      const p = PRECO_MENSAL[plano.chave];
      expect(p.ate10k, plano.chave).toBeLessThan(p.de10a50k!);
      expect(p.de10a50k, plano.chave).toBeLessThan(p.acima50k!);
    }
  });
});
