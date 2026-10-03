import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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
      rclVeioDeReserva: false,
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

describe("a tela não promete envio que não acontece", () => {
  // ── A ÚNICA PROMESSA QUE O SPEC CHAMA DE DEPENDÊNCIA BLOQUEANTE ──
  //
  // Enquanto o remetente do Resend for o gratuito, ele entrega só para o dono
  // da conta. A tela diz "recebido", não "enviado". Era a regra sem trava — e
  // regra de texto sem teste vira folclore em dois meses.
  //
  // O teste olha o código-fonte porque o que precisa ser travado é a AUSÊNCIA
  // de uma promessa incondicional dentro do JSX. Mesma técnica de
  // tests/promessas-da-home.test.ts.

  const tela = readFileSync("src/components/site/PedirProjecao.tsx", "utf8");
  const acao = readFileSync("src/app/_heroi/projecao-actions.ts", "utf8");

  it("o 'Enviado.' é condicional ao retorno do provedor", () => {
    expect(tela).toMatch(/enviadoParaVoce\s*\?\s*"Enviado\."/);
  });

  it("o caminho de não-envio não diz enviado", () => {
    const naoEnviado = tela.slice(tela.indexOf("Pedido recebido."));
    // Só a AFIRMAÇÃO é proibida. "Ainda não enviamos por robô" é uma negação,
    // e é exatamente o que a tela deve dizer — uma regex cega pela palavra
    // reprovaria a frase honesta. Já caí nisso antes, nos guardas da medição.
    expect(naoEnviado).not.toMatch(/\bEnviado\b/);
    expect(naoEnviado).not.toMatch(/(?<!não )enviamos/);
    expect(naoEnviado).toMatch(/até um dia útil/);
  });

  it("a ação devolve enviadoParaVoce do provedor, nunca true fixo", () => {
    expect(acao).toMatch(/enviadoParaVoce:\s*paraVoce\.enviado/);
    expect(acao).not.toMatch(/enviadoParaVoce:\s*true/);
  });

  it("pedido que não foi gravado nem avisado não vira promessa", () => {
    // Com o banco fora e o Resend recusando, dizer "chega em um dia útil"
    // prometeria entrega de um pedido que não existe em lugar nenhum.
    expect(acao).toMatch(/if \(!gravado && !paraEquipe\.enviado\)/);
  });
});
