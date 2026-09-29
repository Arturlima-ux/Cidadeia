import { describe, it, expect } from "vitest";
import {
  lerAditivo,
  ehReforma,
  limiteDoObjeto,
  LIMITE_ALTERACAO,
  LIMITE_ALTERACAO_REFORMA,
} from "@/lib/aditivos";

const c = (valorInicial: number | null, valorGlobal: number | null, objeto = "Aquisição de gêneros", numeroRetificacao: number | null = 0) => ({
  objeto,
  valorInicial,
  valorGlobal,
  numeroRetificacao,
});

describe("limite aplicável ao objeto", () => {
  it("reforma de prédio tem limite de 50%, o resto 25%", () => {
    expect(LIMITE_ALTERACAO).toBe(25);
    expect(LIMITE_ALTERACAO_REFORMA).toBe(50);
    expect(ehReforma("Reforma da Escola Municipal João XXIII")).toBe(true);
    expect(ehReforma("Aquisição de merenda escolar")).toBe(false);
    expect(limiteDoObjeto("Reforma do posto de saúde")).toBe(50);
    expect(limiteDoObjeto("Locação de veículo")).toBe(25);
  });

  it("reforma a 40% NÃO é apontada — o limite dela é outro", () => {
    // Reconhecer a reforma importa para não acusar: tratá-la pela régua de 25%
    // seria alarme falso justamente onde a lei é mais permissiva.
    const r = lerAditivo(c(100_000, 140_000, "Reforma da creche municipal"));
    expect(r.situacao).toBe("dentro_do_limite");
    expect(r.limite).toBe(50);
  });
});

describe("variação do valor global", () => {
  it("valor inicial zero não vira divisão por zero", () => {
    // Existe nos dados reais: um dos 134 contratos do município medido.
    const r = lerAditivo(c(0, 50_000));
    expect(r.situacao).toBe("sem_base");
    expect(r.variacao).toBeNull();
    expect(r.texto).not.toMatch(/Infinity|NaN|∞/);
  });

  it("sem valor global não há comparação", () => {
    expect(lerAditivo(c(10_000, null)).situacao).toBe("sem_base");
  });

  it("global igual ao inicial é silêncio", () => {
    const r = lerAditivo(c(36_432, 36_432));
    expect(r.situacao).toBe("sem_variacao");
    expect(r.acao).toBe("");
  });

  it("dentro do limite, diz que está dentro mesmo no pior caso", () => {
    // Números reais: +8,7% numa locação de imóvel.
    const r = lerAditivo(c(30_000, 32_595.31, "Locação de imóvel residencial", 5));
    expect(r.situacao).toBe("dentro_do_limite");
    expect(r.variacao).toBeCloseTo(8.65, 1);
    expect(r.acao).toMatch(/mesmo se toda a diferença fosse acréscimo/);
  });

  it("exatamente 25% ainda está dentro — o limite é 'até'", () => {
    const r = lerAditivo(c(10_000, 12_500, "Serviços de publicação de atos"));
    expect(r.situacao).toBe("dentro_do_limite");
    expect(r.variacao).toBeCloseTo(25, 5);
  });

  it("acima do limite é condicional, nunca afirmativo", () => {
    // O nome da situação carrega a condição de propósito.
    const r = lerAditivo(c(8_000, 16_240, "Concessão de licença de uso", 3));
    expect(r.situacao).toBe("acima_se_for_acrescimo");
    expect(r.variacao).toBeCloseTo(103, 0);
    expect(r.acao).toMatch(/^Se a diferença for acréscimo/);
  });

  it("supressão é reconhecida e não confundida com acréscimo", () => {
    const r = lerAditivo(c(100_000, 80_000));
    expect(r.situacao).toBe("supressao");
    expect(r.variacao).toBeCloseTo(-20, 5);
  });

  it("supressão acima do limite lembra que precisa de aceite", () => {
    const r = lerAditivo(c(100_000, 60_000));
    expect(r.situacao).toBe("supressao");
    expect(r.acao).toMatch(/concordância do contratado/);
  });
});

describe("a tela não conclui ilegalidade", () => {
  // ── O DEFEITO QUE ESTE BLOCO IMPEDE ──
  //
  // Comparar valorGlobal com valorInicial e chamar a diferença de aditivo
  // acusaria errado nos dados reais: três locações do município medido subiram
  // exatamente +8,7% na mesma data, o que é REAJUSTE por índice — recompõe a
  // moeda, não aumenta o objeto, e não entra no limite do art. 125.
  //
  // A consulta do PNCP não tem campo que separe os dois.

  it("toda leitura de aumento manda conferir o termo aditivo", () => {
    for (const [ini, glob] of [
      [10_000, 11_000],
      [10_000, 20_000],
      [460_127.52, 487_735.17],
    ] as const) {
      const r = lerAditivo(c(ini, glob));
      expect(`${r.texto} ${r.acao}`).toMatch(/reajuste/);
    }
  });

  it("nenhuma leitura usa palavra de acusação", () => {
    const casos = [c(10_000, 12_500), c(8_000, 16_240), c(100_000, 60_000), c(0, 10), c(5_000, 5_000)];
    for (const caso of casos) {
      const r = lerAditivo(caso);
      expect(`${r.texto} ${r.acao}`).not.toMatch(/ilegal|irregularidade|fraude|descumpri|infração/i);
    }
  });

  it("acima do limite explica a consequência jurídica sem imputá-la", () => {
    const r = lerAditivo(c(10_000, 20_000));
    expect(r.acao).toMatch(/vira contratação nova/);
    expect(r.acao).toMatch(/Art\. 125/);
  });

  it("o contador de retificações entra como informação, não como prova", () => {
    const comRetif = lerAditivo(c(10_000, 11_000, "Locação", 4));
    expect(comRetif.texto).toMatch(/4 retificações/);
    const semRetif = lerAditivo(c(10_000, 11_000, "Locação", 0));
    expect(semRetif.texto).not.toMatch(/retifica/);
  });

  it("o peso ordena por dinheiro, que é a ordem em que o gestor quer olhar", () => {
    const ordenado = [c(10_000, 12_000), c(500_000, 560_000), c(1_000, 2_000)]
      .map(lerAditivo)
      .sort((a, b) => b.peso - a.peso)
      .map((r) => Math.round(r.diferenca!));
    expect(ordenado).toEqual([60_000, 2_000, 1_000]);
  });
});
