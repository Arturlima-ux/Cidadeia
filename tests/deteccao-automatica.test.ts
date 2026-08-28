import { describe, it, expect } from "vitest";
import {
  detectarLicitacoesVencendo,
  detectarObrasParadas,
  detectarIndicadorDesatualizado,
  detectarSaldoNegativo,
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
