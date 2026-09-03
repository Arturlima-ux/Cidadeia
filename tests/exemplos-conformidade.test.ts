import { describe, it, expect } from "vitest";
import {
  EXEMPLO_MINIMOS,
  EXEMPLO_PESSOAL,
  MUNICIPIO_EXEMPLO,
  AVISO_EXEMPLO,
} from "@/lib/exemplos-conformidade";
import { AREAS_MINIMO, avaliarMinimo } from "@/lib/minimos-constitucionais";
import { avaliarDespesaPessoal } from "@/lib/despesa-pessoal";

// O exemplo existe para MOSTRAR o produto trabalhando. Se um ajuste futuro na
// régua de severidade o deixar todo verde, a tela de venda continua bonita e
// para de demonstrar qualquer coisa — e ninguém perceberia, porque nada
// quebra. Estes testes são o alarme para isso.

const avaliarExemplo = (area: keyof typeof EXEMPLO_MINIMOS) =>
  avaliarMinimo({
    area,
    base: EXEMPLO_MINIMOS[area].baseCalculo,
    aplicado: EXEMPLO_MINIMOS[area].aplicado,
    mesesDecorridos: EXEMPLO_MINIMOS[area].mesReferencia,
  });

describe("identificação do exemplo", () => {
  it("usa município fictício e diz que é exemplo", () => {
    // Um exemplo com o nome real do município produziria exatamente a captura
    // de tela que não pode existir: o prefeito mandando no grupo um número
    // inventado como se fosse da prefeitura dele.
    expect(MUNICIPIO_EXEMPLO.length).toBeGreaterThan(0);
    expect(AVISO_EXEMPLO).toContain("fictício");
    expect(AVISO_EXEMPLO).toContain("desaparece");
  });

  it("cobre todas as áreas de mínimo", () => {
    // Faltar uma abriria um buraco no meio da moldura de exemplo — e um cartão
    // vazio ao lado de dois preenchidos parece defeito, não ausência de dado.
    for (const area of AREAS_MINIMO) {
      expect(EXEMPLO_MINIMOS[area]).toBeDefined();
    }
  });
});

describe("o exemplo demonstra o produto trabalhando", () => {
  it("mostra um piso cumprido", () => {
    // Sem nenhum verde, a prefeitura fictícia soaria em colapso e o prefeito
    // descartaria o exemplo inteiro como exagero de vendedor.
    expect(avaliarExemplo("educacao").situacao).toBe("cumprido");
  });

  it("mostra pisos abaixo do ritmo, com esforço mensurável", () => {
    // O serviço que ele contrata é a tela achando problema. Um exemplo todo
    // verde vende uma tela que nunca fala.
    for (const area of ["saude", "fundeb"] as const) {
      const a = avaliarExemplo(area);
      expect(a.situacao).not.toBe("cumprido");
      expect(a.percentualAtual).toBeLessThan(a.exigido);
      expect(a.fatorAceleracao).not.toBeNull();
      expect(a.fatorAceleracao!).toBeGreaterThan(1);
    }
  });

  it("põe a despesa com pessoal no patamar prudencial", () => {
    // É o estado mais instrutivo: dentro da lei e já sob as vedações do art.
    // 22. Confortável não ensinaria nada, e excedido faria a tela de exemplo
    // abrir com acusação.
    const a = avaliarDespesaPessoal(EXEMPLO_PESSOAL)!;
    expect(a.situacao).toBe("prudencial");
    expect(a.margem).toBeGreaterThan(0);
    expect(a.excedente).toBe(0);
  });
});
