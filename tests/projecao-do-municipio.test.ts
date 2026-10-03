import { describe, it, expect } from "vitest";
import { montarProjecao } from "@/lib/projecao-do-municipio";
import type { ImportacaoRgf } from "@/lib/siconfi-rgf";
import { LIMITE_PESSOAL } from "@/lib/despesa-pessoal";

const RCL = 100_000_000;

/** Série quadrimestral terminando no mês de referência mais recente. */
function serie(percentuais: number[]): ImportacaoRgf[] {
  const hoje = new Date();
  return percentuais.map((p, i) => {
    const passosAtras = percentuais.length - 1 - i;
    const indice = hoje.getUTCFullYear() * 12 + (hoje.getUTCMonth() + 1) - 1 - 4 * passosAtras;
    return {
      periodo: {
        exercicio: Math.floor(indice / 12),
        periodicidade: "Q" as const,
        periodo: 1,
        mesReferencia: (indice % 12) + 1,
      },
      instituicao: "Prefeitura Municipal de Exemplo",
      rclAjustada: RCL,
      rcl: RCL,
      despesaTotal: (RCL * p) / 100,
      limiteMaximo: RCL * 0.54,
      limitePrudencial: RCL * 0.513,
      limiteAlerta: RCL * 0.486,
    };
  });
}

describe("a projeção do exercício", () => {
  it("o número de ações é o que as regras produzem, nunca fixo", () => {
    // Número redondo em material comercial é número de marketing, e o produto
    // inteiro foi construído para não ter nenhum.
    const confortavel = montarProjecao(serie([40, 40.2, 40.1, 40.3]));
    const acimaDoTeto = montarProjecao(serie([52, 53, 54.5, 56]));
    expect(acimaDoTeto.acoes.length).not.toBe(confortavel.acoes.length);
    expect(acimaDoTeto.acoes.length).toBeGreaterThan(0);
  });

  it("série curta demais não vira projeção inventada", () => {
    // lib/antecipacao.ts recusa abaixo de quatro leituras; a projeção respeita
    // a recusa em vez de contorná-la.
    expect(montarProjecao(serie([44, 46, 48])).travessia).toBeNull();
  });

  it("série vazia não quebra nem inventa situação", () => {
    const p = montarProjecao([]);
    expect(p.travessia).toBeNull();
    expect(p.situacaoAtual).toBeNull();
    expect(p.acoes).toEqual([]);
  });

  it("acima do teto traz as sanções do prazo de recondução", () => {
    const p = montarProjecao(serie([52, 53.5, 55, 56.5]));
    expect(p.situacaoAtual).toBe("excedido");
    expect(p.acoes.join(" ")).toMatch(/redu[çc]/i);
  });

  it("no patamar prudencial traz as vedações, não as sanções", () => {
    const p = montarProjecao(serie([49, 50, 51, 52]));
    expect(p.situacaoAtual).toBe("prudencial");
    expect(p.acoes.join(" ")).toMatch(/nomea|provimento|reajuste/i);
  });

  it("subindo em direção ao teto, a travessia é anunciada", () => {
    const p = montarProjecao(serie([44, 46, 48, 50]));
    expect(p.travessia).not.toBeNull();
    expect(p.travessia!.travessia.limiar).toBeLessThanOrEqual(LIMITE_PESSOAL);
    expect(p.travessia!.quando).toMatch(/cerca de|próxima apuração/);
  });

  it("toda ação é uma frase, não um rótulo", () => {
    for (const a of montarProjecao(serie([52, 53.5, 55, 56.5])).acoes) {
      expect(a.length).toBeGreaterThan(30);
    }
  });

  it("a projeção nunca afirma o enquadramento", () => {
    // Quem enquadra é o procurador do município.
    const p = montarProjecao(serie([52, 53.5, 55, 56.5]));
    expect(p.acoes.join(" ")).not.toMatch(/está irregular|é improbidade/i);
  });
});
