import { describe, it, expect } from "vitest";
import {
  analisarModulo,
  listarAchados,
  type DadosAnalise,
  type IndicadorEducacao,
  type IndicadorSaude,
} from "@/lib/analise-local";

// ── A DIMENSÃO DO TEMPO NA ANÁLISE ──
//
// O motor comparava a última leitura com um limiar fixo. Estes testes cobrem
// o que passou a existir: dizer de onde o número veio, e disparar achado
// quando o MOVIMENTO é o problema — número dentro do limite, mas caindo.

function em(mesesAtras: number): string {
  const d = new Date("2026-09-10T15:00:00Z");
  d.setUTCMonth(d.getUTCMonth() - mesesAtras);
  return d.toISOString();
}

function edu(p: Partial<IndicadorEducacao>, mesesAtras: number): IndicadorEducacao {
  return {
    frequenciaPercentual: null,
    notaMedia: null,
    alunosTransporte: null,
    professoresAtivos: null,
    atualizadoEm: em(mesesAtras),
    ...p,
  };
}

function saude(p: Partial<IndicadorSaude>, mesesAtras: number): IndicadorSaude {
  return {
    tempoMedioAtendimentoMin: null,
    medicosAtivos: null,
    faltasPercentual: null,
    estoqueMedicamentosPercentual: null,
    atualizadoEm: em(mesesAtras),
    ...p,
  };
}

function dadosEdu(serie: IndicadorEducacao[]): DadosAnalise {
  return { educacao: { indicador: serie[0] ?? null, escolas: [], serie }, fuso: "America/Sao_Paulo" };
}

/** Só os achados desta feature — as regras de nível e de cadastro têm os próprios testes. */
function movimentos(modulo: "educacao" | "saude", dados: DadosAnalise) {
  return listarAchados(modulo, dados).filter((a) => a.chave.endsWith("-movimento"));
}

function dadosSaude(serie: IndicadorSaude[]): DadosAnalise {
  return { saude: { indicador: serie[0] ?? null, unidades: [], serie }, fuso: "America/Sao_Paulo" };
}

describe("Educação — de onde veio o número", () => {
  it("achado de nível ganha a variação desde a leitura anterior", () => {
    const serie = [edu({ frequenciaPercentual: 71 }, 0), edu({ frequenciaPercentual: 78 }, 3)];
    const { texto } = analisarModulo("educacao", dadosEdu(serie));
    expect(texto).toContain("Frequência média em 71%");
    expect(texto).toContain("caiu 7 pontos desde junho (era 78%)");
  });

  it("sem série, o texto é o de sempre — nada inventado", () => {
    const [ind] = [edu({ frequenciaPercentual: 71 }, 0)];
    const { texto } = analisarModulo("educacao", { educacao: { indicador: ind, escolas: [] } });
    expect(texto).toContain("Frequência média em 71%");
    expect(texto).not.toContain("desde");
  });

  it("queda grande com nível ainda dentro do limite vira achado de movimento", () => {
    // 88 → 81: acima dos 85 de atenção? Não — 81 < 85, dispararia o nível.
    // Use 93 → 86: 86 está acima de 85, a regra de nível fica quieta.
    const serie = [edu({ frequenciaPercentual: 86 }, 0), edu({ frequenciaPercentual: 93 }, 2)];
    const achados = listarAchados("educacao", dadosEdu(serie));
    const mov = achados.find((a) => a.chave === "educacao:frequencia-movimento");
    expect(mov).toBeDefined();
    expect(mov!.texto).toContain("caiu 7 pontos desde julho (era 93%)");
    expect(mov!.texto).toContain("ainda dentro do limite");
    expect(mov!.acao).toContain("frequência aberta por escola");
  });

  it("queda pequena não vira achado: 1 ponto é ruído", () => {
    const serie = [edu({ frequenciaPercentual: 92 }, 0), edu({ frequenciaPercentual: 93 }, 1)];
    expect(movimentos("educacao", dadosEdu(serie))).toHaveLength(0);
  });

  it("subida de frequência nunca é achado — o sentido ruim é a queda", () => {
    const serie = [edu({ frequenciaPercentual: 95 }, 0), edu({ frequenciaPercentual: 86 }, 1)];
    expect(movimentos("educacao", dadosEdu(serie))).toHaveLength(0);
  });

  it("desvio do padrão histórico dispara mesmo com variação pequena entre as duas últimas", () => {
    // Caiu devagar, 2 pontos por leitura: nenhuma variação isolada passa de 5,
    // mas a atual está 6 pontos abaixo da média das quatro anteriores.
    const serie = [
      edu({ frequenciaPercentual: 86 }, 0),
      edu({ frequenciaPercentual: 88 }, 1),
      edu({ frequenciaPercentual: 91 }, 2),
      edu({ frequenciaPercentual: 94 }, 3),
      edu({ frequenciaPercentual: 96 }, 4),
    ];
    const mov = listarAchados("educacao", dadosEdu(serie)).find((a) => a.chave.endsWith("-movimento"));
    expect(mov).toBeDefined();
    expect(mov!.texto).toContain("abaixo da média das 4 leituras anteriores");
  });

  it("nota fora da escala 0–10 não entra na série — mesma cautela da regra de nível", () => {
    const serie = [edu({ notaMedia: 62 }, 0), edu({ notaMedia: 78 }, 1)];
    expect(movimentos("educacao", dadosEdu(serie))).toHaveLength(0);
  });
});

describe("Saúde — o sentido ruim de cada indicador", () => {
  it("faltas subindo é achado; faltas caindo, não", () => {
    const sobe = [saude({ faltasPercentual: 12 }, 0), saude({ faltasPercentual: 5 }, 1)];
    expect(listarAchados("saude", dadosSaude(sobe)).map((a) => a.chave)).toContain("saude:faltas-movimento");

    const cai = [saude({ faltasPercentual: 5 }, 0), saude({ faltasPercentual: 12 }, 1)];
    expect(movimentos("saude", dadosSaude(cai))).toHaveLength(0);
  });

  it("estoque de medicamentos caindo dez pontos numa leitura é achado", () => {
    const serie = [saude({ estoqueMedicamentosPercentual: 62 }, 0), saude({ estoqueMedicamentosPercentual: 74 }, 1)];
    const mov = listarAchados("saude", dadosSaude(serie)).find((a) => a.chave === "saude:estoque-movimento");
    expect(mov?.texto).toContain("caiu 12 pontos");
    expect(mov?.acao).toContain("posição de estoque por item");
  });

  it("tempo de espera em minutos, sem casa decimal", () => {
    const serie = [saude({ tempoMedioAtendimentoMin: 40 }, 0), saude({ tempoMedioAtendimentoMin: 22 }, 1)];
    const mov = listarAchados("saude", dadosSaude(serie)).find((a) => a.chave === "saude:espera-movimento");
    expect(mov?.texto).toContain("subiu 18 min desde agosto (era 22 min)");
  });
});
