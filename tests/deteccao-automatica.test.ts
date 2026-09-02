import { describe, it, expect } from "vitest";
import {
  detectarLicitacoesVencendo,
  detectarObrasParadas,
  detectarIndicadorDesatualizado,
  detectarSaldoNegativo,
  detectarMinimoConstitucional,
  detectarPrazoAtendimento,
} from "@/lib/deteccao-automatica";

function diasAtras(dias: number): string {
  return new Date(Date.now() - dias * 86400000).toISOString();
}

function diasNoFuturo(dias: number): string {
  return new Date(Date.now() + dias * 86400000).toISOString();
}

describe("detectarLicitacoesVencendo", () => {
  it("não sinaliza licitação sem prazo definido", () => {
    const r = detectarLicitacoesVencendo([
      { numero: "1", objeto: "x", status: "publicada", prazoFinal: null },
    ]);
    expect(r).toHaveLength(0);
  });

  it("não sinaliza licitação já homologada ou cancelada, mesmo com prazo vencido", () => {
    const r = detectarLicitacoesVencendo([
      { numero: "1", objeto: "x", status: "homologada", prazoFinal: diasAtras(10) },
      { numero: "2", objeto: "y", status: "cancelada", prazoFinal: diasAtras(10) },
    ]);
    expect(r).toHaveLength(0);
  });

  it("sinaliza como urgente quando o prazo já passou", () => {
    const r = detectarLicitacoesVencendo([
      { numero: "1", objeto: "x", status: "em_disputa", prazoFinal: diasAtras(2) },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].prioridade).toBe("urgente");
    expect(r[0].titulo).toContain("vencido");
  });

  it("sinaliza como urgente quando faltam poucos dias", () => {
    const r = detectarLicitacoesVencendo([
      { numero: "1", objeto: "x", status: "publicada", prazoFinal: diasNoFuturo(2) },
    ]);
    expect(r[0].prioridade).toBe("urgente");
  });

  it("sinaliza como médio quando falta uma semana", () => {
    const r = detectarLicitacoesVencendo([
      { numero: "1", objeto: "x", status: "publicada", prazoFinal: diasNoFuturo(6) },
    ]);
    expect(r[0].prioridade).toBe("medio");
  });

  it("não sinaliza quando o prazo está longe", () => {
    const r = detectarLicitacoesVencendo([
      { numero: "1", objeto: "x", status: "publicada", prazoFinal: diasNoFuturo(30) },
    ]);
    expect(r).toHaveLength(0);
  });
});

describe("detectarObrasParadas", () => {
  it("não sinaliza obra concluída, não importa há quanto tempo", () => {
    const r = detectarObrasParadas([
      { nome: "Praça X", status: "concluida", atualizadoEm: diasAtras(200), progressoAtual: 100, progressoEsperado: 100 },
    ]);
    expect(r).toHaveLength(0);
  });

  it("não sinaliza obra atualizada recentemente", () => {
    const r = detectarObrasParadas([
      { nome: "Praça X", status: "em_andamento", atualizadoEm: diasAtras(2), progressoAtual: 40, progressoEsperado: 50 },
    ]);
    expect(r).toHaveLength(0);
  });

  it("sinaliza como médio entre 14 e 30 dias sem atualizar", () => {
    const r = detectarObrasParadas([
      { nome: "Praça X", status: "em_andamento", atualizadoEm: diasAtras(20), progressoAtual: 40, progressoEsperado: 60 },
    ]);
    expect(r[0].prioridade).toBe("medio");
  });

  it("sinaliza como urgente após 30 dias sem atualizar", () => {
    const r = detectarObrasParadas([
      { nome: "Praça X", status: "em_andamento", atualizadoEm: diasAtras(45), progressoAtual: 40, progressoEsperado: 90 },
    ]);
    expect(r[0].prioridade).toBe("urgente");
  });
});

describe("detectarIndicadorDesatualizado", () => {
  it("não sinaliza quando não há indicador nenhum ainda", () => {
    expect(detectarIndicadorDesatualizado("saude", null)).toHaveLength(0);
  });

  it("não sinaliza indicador recente", () => {
    expect(detectarIndicadorDesatualizado("educacao", { atualizadoEm: diasAtras(5) })).toHaveLength(0);
  });

  it("sinaliza indicador com mais de 30 dias", () => {
    const r = detectarIndicadorDesatualizado("saude", { atualizadoEm: diasAtras(40) });
    expect(r).toHaveLength(1);
    expect(r[0].prioridade).toBe("info");
    expect(r[0].titulo).toContain("Saúde");
  });
});

describe("detectarSaldoNegativo", () => {
  it("não sinaliza quando não há snapshot", () => {
    expect(detectarSaldoNegativo(null)).toHaveLength(0);
  });

  it("não sinaliza saldo positivo", () => {
    expect(detectarSaldoNegativo({ saldo: 1000 })).toHaveLength(0);
  });

  it("sinaliza saldo negativo como urgente", () => {
    const r = detectarSaldoNegativo({ saldo: -500 });
    expect(r).toHaveLength(1);
    expect(r[0].prioridade).toBe("urgente");
    expect(r[0].descricao).toContain("500");
  });
});

describe("mínimo constitucional na Central", () => {
  const base = {
    area: "saude" as const,
    nomeArea: "Saúde",
    percentualAtual: 12.4,
    exigido: 15,
    faltamReais: 214_000,
  };

  it("não avisa sobre o que já está cumprido ou no ritmo", () => {
    // A Central é uma lista do que exige DECISÃO. Item resolvido ali só afasta
    // a atenção do que não está.
    expect(detectarMinimoConstitucional([{ ...base, situacao: "cumprido" }])).toHaveLength(0);
    expect(detectarMinimoConstitucional([{ ...base, situacao: "no_caminho" }])).toHaveLength(0);
  });

  it("herda a severidade do módulo de mínimos, sem recalcular", () => {
    // A regra de severidade lá leva em conta o esforço de aceleração e os meses
    // restantes. Julgar de novo aqui produziria duas verdades sobre o mesmo
    // número — e a tela mostraria uma enquanto o painel mostra outra.
    const critico = detectarMinimoConstitucional([{ ...base, situacao: "critico" }]);
    const risco = detectarMinimoConstitucional([{ ...base, situacao: "risco" }]);
    expect(critico[0].prioridade).toBe("urgente");
    expect(risco[0].prioridade).toBe("medio");
  });

  it("diz o percentual e quanto falta em reais", () => {
    // Percentual sozinho não é acionável: o gestor precisa do valor a empenhar.
    const [a] = detectarMinimoConstitucional([{ ...base, situacao: "critico" }]);
    expect(a.titulo).toContain("12,4%");
    expect(a.descricao).toContain("15%");
    expect(a.descricao).toMatch(/214/);
    expect(a.secretaria).toBe("saude");
  });

  it("com nenhuma base informada não inventa achado", () => {
    expect(detectarMinimoConstitucional([])).toHaveLength(0);
  });
});

describe("prazo de atendimento na Central", () => {
  it("agrupa em vez de listar um a um", () => {
    // Trinta protocolos atrasados virariam trinta linhas e afogariam o resto da
    // Central — o prefeito pararia de olhar a tela.
    const achados = detectarPrazoAtendimento({ vencidos: 30, vencendo: 4 });
    expect(achados).toHaveLength(2);
    expect(achados[0].titulo).toContain("30");
    expect(achados[1].titulo).toContain("4");
  });

  it("separa o vencido do que ainda dá para salvar", () => {
    const achados = detectarPrazoAtendimento({ vencidos: 2, vencendo: 3 });
    expect(achados[0].prioridade).toBe("urgente");
    expect(achados[1].prioridade).toBe("medio");
    expect(achados[1].descricao).toContain("prorrogação");
  });

  it("concorda em número e gênero", () => {
    // Texto de sistema que erra a concordância parece descuidado justamente na
    // tela que precisa parecer confiável.
    const um = detectarPrazoAtendimento({ vencidos: 1, vencendo: 1 });
    expect(um[0].titulo).toContain("1 manifestação com prazo vencido");
    expect(um[1].titulo).toContain("1 manifestação vence");
  });

  it("nada vencido, nada a dizer", () => {
    expect(detectarPrazoAtendimento({ vencidos: 0, vencendo: 0 })).toHaveLength(0);
  });
});
