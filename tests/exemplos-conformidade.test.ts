import { describe, it, expect } from "vitest";
import {
  EXEMPLO_MINIMOS,
  EXEMPLO_PESSOAL,
  MUNICIPIO_EXEMPLO,
  AVISO_EXEMPLO,
} from "@/lib/exemplos-conformidade";
import { AREAS_MINIMO, avaliarMinimo } from "@/lib/minimos-constitucionais";
import { avaliarDespesaPessoal } from "@/lib/despesa-pessoal";
import { TOLERANCIA_MINIMOS, TOLERANCIA_PESSOAL } from "@/lib/defasagem";

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

describe("o exemplo não envelhece", () => {
  // Bug real, encontrado depois de as duas peças estarem prontas: a guarda de
  // defasagem existe para impedir veredito sobre MEDIÇÃO velha de município
  // real, e estava sendo aplicada também ao exemplo — que tem mês fixo.
  //
  // A partir de dezembro (agosto + 4 > tolerância 3) o cartão dos mínimos
  // passava a aparecer cinza, dizendo "medição antiga" sobre uma cidade que
  // não existe. A demonstração quebrava justamente no fim do exercício,
  // quando o assunto mais interessa ao prefeito.
  //
  // Ilustração não tem data de medição para envelhecer. As telas passam a
  // pular a guarda em modo exemplo; estes testes registram por que, e o
  // segundo mostra que na tela de pessoal a folga de hoje é coincidência de
  // dois números, não garantia.

  it("os mínimos ficariam desatualizados no fim do ano, se a guarda valesse", () => {
    const mesesAteEstourar = TOLERANCIA_MINIMOS + EXEMPLO_MINIMOS.educacao.mesReferencia;
    expect(mesesAteEstourar).toBeLessThan(12);
  });

  it("o teto de pessoal escapa hoje só pela tolerância mais larga", () => {
    // Se um dia a tolerância do RGF for apertada para perto da dos mínimos, o
    // mesmo defeito reaparece aqui — em silêncio, porque nada quebra.
    const folgaAteDezembro = 12 - EXEMPLO_PESSOAL.mesReferencia;
    expect(folgaAteDezembro).toBeLessThanOrEqual(TOLERANCIA_PESSOAL);
  });

  it("o exemplo é sempre a tela inteira, nunca um cartão solto", () => {
    // A exceção à guarda só é segura porque o exemplo é tudo-ou-nada. Se um
    // dia um cartão de exemplo puder conviver com um real, aquele cartão
    // ficaria isento de uma guarda que o vizinho respeita — e o gestor não
    // teria como saber qual dos dois está sendo julgado.
    expect(Object.keys(EXEMPLO_MINIMOS).sort()).toEqual([...AREAS_MINIMO].sort());
  });
});
