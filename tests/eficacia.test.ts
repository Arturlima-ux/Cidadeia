import { describe, it, expect } from "vitest";
import {
  eficaciaObras,
  eficaciaLicitacoes,
  eficaciaSaude,
  eficaciaEducacao,
  ordenarPorGravidade,
  totalEmRisco,
} from "@/lib/eficacia";

describe("eficaciaObras", () => {
  it("sem obras cadastradas → sem_dados, não 'ok'", () => {
    const r = eficaciaObras([], 0);
    expect(r.situacao).toBe("sem_dados");
    expect(r.sinais).toHaveLength(0);
  });

  it("soma contratos + lançamento manual no investimento", () => {
    const r = eficaciaObras(
      [{ nome: "A", status: "em_andamento", progressoAtual: 50, progressoEsperado: 50, valorContrato: 100000 }],
      25000
    );
    expect(r.investimento).toBe(125000);
    expect(r.origemInvestimento).toHaveLength(2);
  });

  it("obra dentro da tolerância de 10pp não conta como atrasada", () => {
    const r = eficaciaObras(
      [{ nome: "A", status: "em_andamento", progressoAtual: 45, progressoEsperado: 50, valorContrato: 1000 }],
      0
    );
    expect(r.situacao).toBe("ok");
  });

  it("atribui o valor do contrato da obra atrasada como valor em risco", () => {
    const r = eficaciaObras(
      [
        { nome: "Atrasada", status: "em_andamento", progressoAtual: 20, progressoEsperado: 80, valorContrato: 500000 },
        { nome: "Ok", status: "em_andamento", progressoAtual: 80, progressoEsperado: 80, valorContrato: 100000 },
      ],
      0
    );
    expect(r.sinais[0].valorEmRisco).toBe(500000);
    expect(r.sinais[0].texto).toContain("Atrasada");
  });

  it("obra paralisada torna a situação crítica", () => {
    const r = eficaciaObras(
      [{ nome: "P", status: "paralisada", progressoAtual: 30, progressoEsperado: 30, valorContrato: 1000 }],
      0
    );
    expect(r.situacao).toBe("critico");
  });

  it("obra concluída não entra na conta de atrasadas", () => {
    const r = eficaciaObras(
      [{ nome: "C", status: "concluida", progressoAtual: 100, progressoEsperado: 100, valorContrato: 1000 }],
      0
    );
    expect(r.situacao).toBe("ok");
    expect(r.resultado).toContain("1 de 1");
  });
});

describe("eficaciaLicitacoes", () => {
  it("só conta homologadas como investimento efetivado", () => {
    const r = eficaciaLicitacoes(
      [
        { numero: "1", status: "homologada", valorEstimado: 200000, observacaoRisco: null },
        { numero: "2", status: "planejamento", valorEstimado: 999999, observacaoRisco: null },
      ],
      0
    );
    expect(r.investimento).toBe(200000);
  });

  it("processo com risco vira sinal crítico com valor atribuído", () => {
    const r = eficaciaLicitacoes(
      [{ numero: "PE 01", status: "em_disputa", valorEstimado: 80000, observacaoRisco: "impugnação" }],
      0
    );
    expect(r.situacao).toBe("critico");
    expect(r.sinais[0].valorEmRisco).toBe(80000);
  });

  it("cancelada sem risco é atenção, não crítico", () => {
    const r = eficaciaLicitacoes(
      [{ numero: "1", status: "cancelada", valorEstimado: 5000, observacaoRisco: null }],
      0
    );
    expect(r.situacao).toBe("atencao");
  });
});

describe("eficaciaSaude", () => {
  it("com menos de 2 registros não arrisca julgar tendência", () => {
    const um = eficaciaSaude(
      [{ tempoMedioAtendimentoMin: 30, faltasPercentual: 5, estoqueMedicamentosPercentual: 90 }],
      50000
    );
    expect(um.situacao).toBe("sem_dados");
    expect(um.resultado).toContain("pelo menos 2");
    // mas ainda reporta o investimento
    expect(um.investimento).toBe(50000);
  });

  it("detecta piora em faltas, tempo e estoque", () => {
    const r = eficaciaSaude(
      [
        { tempoMedioAtendimentoMin: 30, faltasPercentual: 5, estoqueMedicamentosPercentual: 90 },
        { tempoMedioAtendimentoMin: 45, faltasPercentual: 12, estoqueMedicamentosPercentual: 60 },
      ],
      0
    );
    expect(r.situacao).toBe("critico");
    expect(r.sinais).toHaveLength(3);
  });

  it("melhora em tudo → ok, sem sinais", () => {
    const r = eficaciaSaude(
      [
        { tempoMedioAtendimentoMin: 45, faltasPercentual: 12, estoqueMedicamentosPercentual: 60 },
        { tempoMedioAtendimentoMin: 30, faltasPercentual: 5, estoqueMedicamentosPercentual: 95 },
      ],
      0
    );
    expect(r.situacao).toBe("ok");
    expect(r.sinais).toHaveLength(0);
  });

  it("ignora indicador nulo em vez de tratar como zero", () => {
    const r = eficaciaSaude(
      [
        { tempoMedioAtendimentoMin: null, faltasPercentual: 5, estoqueMedicamentosPercentual: null },
        { tempoMedioAtendimentoMin: null, faltasPercentual: 5, estoqueMedicamentosPercentual: null },
      ],
      0
    );
    expect(r.sinais).toHaveLength(0);
  });
});

describe("eficaciaEducacao", () => {
  it("sinaliza escolas com evasão acima de 10% mesmo sem histórico", () => {
    const r = eficaciaEducacao([], [{ nome: "Escola X", evasaoPercentual: 18 }], 0);
    expect(r.sinais[0].texto).toContain("Escola X");
    expect(r.situacao).toBe("atencao");
  });

  it("detecta queda de frequência e nota", () => {
    const r = eficaciaEducacao(
      [
        { frequenciaPercentual: 95, notaMedia: 7.5 },
        { frequenciaPercentual: 88, notaMedia: 6.9 },
      ],
      [],
      0
    );
    expect(r.situacao).toBe("critico");
    expect(r.sinais).toHaveLength(2);
  });
});

describe("ordenarPorGravidade / totalEmRisco", () => {
  it("crítico vem antes de atenção, ok e sem_dados", () => {
    const lista = [
      eficaciaObras([], 0), // sem_dados
      eficaciaLicitacoes([{ numero: "1", status: "em_disputa", valorEstimado: 10, observacaoRisco: "x" }], 0), // critico
      eficaciaEducacao([], [{ nome: "E", evasaoPercentual: 20 }], 0), // atencao
    ];
    const ordenada = ordenarPorGravidade(lista);
    expect(ordenada.map((s) => s.situacao)).toEqual(["critico", "atencao", "sem_dados"]);
  });

  it("no empate, quem tem mais investimento aparece primeiro", () => {
    const a = eficaciaObras(
      [{ nome: "A", status: "paralisada", progressoAtual: 0, progressoEsperado: 0, valorContrato: 100 }],
      0
    );
    const b = eficaciaLicitacoes(
      [{ numero: "1", status: "homologada", valorEstimado: 900000, observacaoRisco: "risco" }],
      0
    );
    const ordenada = ordenarPorGravidade([a, b]);
    expect(ordenada[0].secretaria).toBe("licitacoes");
  });

  it("soma o dinheiro em risco de todas as áreas", () => {
    const lista = [
      eficaciaObras(
        [{ nome: "A", status: "em_andamento", progressoAtual: 10, progressoEsperado: 90, valorContrato: 300 }],
        0
      ),
      eficaciaLicitacoes([{ numero: "1", status: "em_disputa", valorEstimado: 200, observacaoRisco: "x" }], 0),
    ];
    expect(totalEmRisco(lista)).toBe(500);
  });
});
