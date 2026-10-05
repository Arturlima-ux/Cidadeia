import { describe, it, expect } from "vitest";
import {
  situacaoFinanceira,
  painelTravado,
  vencimentoDaCompetencia,
  competenciaDe,
  vencimentoDaPrimeira,
  competenciaQueFalta,
  diasEntre,
  rotuloCompetencia,
  situacaoDaConta,
  rotaLivreNaTrava,
  CARENCIA_DIAS,
  type FaturaResumo,
} from "@/lib/cobranca";

// ── O QUE ESTES TESTES TRAVAM ──
//
// A regra comercial de outubro de 2026: o módulo só liga depois do primeiro
// pagamento, a cobrança é mensal e antecipada, e a conta trava se a fatura
// passar da carência sem pagamento. Pagou, destrava sozinha.
//
// Duas coisas não podem acontecer nunca, e é por elas que este arquivo existe:
// travar quem está em dia (o prefeito perde o painel numa terça-feira por erro
// de data) e não travar quem deve (a regra vira enfeite).

const f = (competencia: string, vencimento: string, status: FaturaResumo["status"] = "aberta"): FaturaResumo => ({
  id: `fat_${competencia}`,
  competencia,
  vencimento,
  status,
  valor: 1000,
});

describe("datas", () => {
  it("dias entre duas datas, sem fuso", () => {
    expect(diasEntre("2026-10-05", "2026-10-10")).toBe(5);
    expect(diasEntre("2026-10-10", "2026-10-05")).toBe(-5);
    expect(diasEntre("2026-02-27", "2026-03-01")).toBe(2);
  });

  it("vencimento no dia escolhido, preso ao último dia do mês", () => {
    expect(vencimentoDaCompetencia("2026-10", 10)).toBe("2026-10-10");
    expect(vencimentoDaCompetencia("2026-02", 31)).toBe("2026-02-28");
    expect(vencimentoDaCompetencia("2028-02", 30)).toBe("2028-02-29");
  });

  it("competência é o mês da data", () => {
    expect(competenciaDe("2026-10-05")).toBe("2026-10");
  });

  it("a primeira fatura vence em poucos dias, não no mês seguinte", () => {
    expect(vencimentoDaPrimeira("2026-10-05")).toBe("2026-10-10");
    expect(vencimentoDaPrimeira("2026-12-29")).toBe("2027-01-03");
  });

  it("competência por extenso", () => {
    expect(rotuloCompetencia("2026-10")).toBe("outubro de 2026");
  });
});

describe("situação financeira", () => {
  it("sem fatura nenhuma: conta antiga ou demonstração, nunca trava", () => {
    const s = situacaoFinanceira([], "2026-10-05");
    expect(s.tipo).toBe("sem_cobranca");
    expect(painelTravado(s)).toBe(false);
  });

  it("primeira fatura em aberto: aguarda o primeiro pagamento, sem travar o que já existe", () => {
    const s = situacaoFinanceira([f("2026-10", "2026-10-10")], "2026-10-05");
    expect(s.tipo).toBe("aguardando_primeiro_pagamento");
    expect(painelTravado(s)).toBe(false);
  });

  it("tudo pago e a próxima longe: em dia", () => {
    const s = situacaoFinanceira([f("2026-10", "2026-10-10", "paga")], "2026-10-12");
    expect(s.tipo).toBe("em_dia");
  });

  it("vence em até sete dias: avisa", () => {
    const s = situacaoFinanceira(
      [f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10")],
      "2026-11-05"
    );
    expect(s.tipo).toBe("a_vencer");
    if (s.tipo === "a_vencer") expect(s.dias).toBe(5);
  });

  it("vence hoje: ainda é aviso, não atraso", () => {
    const s = situacaoFinanceira([f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10")], "2026-11-10");
    expect(s.tipo).toBe("a_vencer");
  });

  it("passou do vencimento, dentro da carência: vencida, ainda sem travar", () => {
    const s = situacaoFinanceira([f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10")], "2026-11-13");
    expect(s.tipo).toBe("vencida");
    expect(painelTravado(s)).toBe(false);
    if (s.tipo === "vencida") {
      expect(s.diasAtraso).toBe(3);
      expect(s.travaEm).toBe("2026-11-16");
    }
  });

  it("último dia da carência ainda não trava; o seguinte trava", () => {
    const faturas = [f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10")];
    expect(painelTravado(situacaoFinanceira(faturas, `2026-11-${10 + CARENCIA_DIAS}`))).toBe(false);
    expect(painelTravado(situacaoFinanceira(faturas, `2026-11-${10 + CARENCIA_DIAS + 1}`))).toBe(true);
  });

  it("pagou a fatura atrasada: destrava na hora", () => {
    const s = situacaoFinanceira([f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10", "paga")], "2026-11-30");
    expect(painelTravado(s)).toBe(false);
  });

  it("a fatura mais antiga em atraso é a que conta", () => {
    const s = situacaoFinanceira(
      [f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10"), f("2026-12", "2026-12-10")],
      "2026-12-11"
    );
    expect(s.tipo).toBe("travada");
    if (s.tipo === "travada") expect(s.fatura.competencia).toBe("2026-11");
  });

  it("fatura cancelada não conta para nada", () => {
    const s = situacaoFinanceira(
      [f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10", "cancelada")],
      "2026-12-30"
    );
    expect(s.tipo).toBe("em_dia");
  });

  it("primeira fatura nunca paga e muito atrasada: continua aguardando, não 'trava' o que nunca ligou", () => {
    const s = situacaoFinanceira([f("2026-10", "2026-10-10")], "2026-12-01");
    expect(s.tipo).toBe("aguardando_primeiro_pagamento");
  });
});

describe("qual fatura gerar no mês", () => {
  it("contrato ativo sem a fatura do mês: gera", () => {
    expect(competenciaQueFalta([f("2026-10", "2026-10-10", "paga")], "2026-11-01")).toBe("2026-11");
  });

  it("já existe a do mês: não gera de novo", () => {
    expect(competenciaQueFalta([f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10")], "2026-11-20")).toBeNull();
  });

  it("a do mês foi cancelada: não recria sozinha", () => {
    // Cancelar é decisão da equipe (desconto, cortesia, erro). Recriar no dia
    // seguinte desfaria a decisão sem ninguém perceber.
    expect(competenciaQueFalta([f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10", "cancelada")], "2026-11-20")).toBeNull();
  });

  it("sem nenhuma fatura paga ainda: não gera mensalidade", () => {
    // Antes do primeiro pagamento o módulo nem ligou; cobrar o segundo mês
    // seria cobrar por algo que não começou.
    expect(competenciaQueFalta([f("2026-10", "2026-10-10")], "2026-11-05")).toBeNull();
  });
});

describe("conta com mais de um contrato", () => {
  it("módulo novo aguardando o primeiro pagamento não trava quem paga em dia", () => {
    const principal = [f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10", "paga")];
    const moduloNovo = [{ ...f("2026-11", "2026-11-03"), id: "fat_novo" }];
    const s = situacaoDaConta([principal, moduloNovo], "2026-11-30");
    expect(painelTravado(s)).toBe(false);
    expect(s.tipo).toBe("aguardando_primeiro_pagamento");
  });

  it("qualquer contrato travado trava a conta", () => {
    const principal = [f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10")];
    const outro = [f("2026-10", "2026-10-15", "paga")];
    expect(painelTravado(situacaoDaConta([outro, principal], "2026-11-30"))).toBe(true);
  });
});

describe("o que continua aberto com a conta travada", () => {
  it("financeiro, exportação de dados e a própria conta", () => {
    expect(rotaLivreNaTrava("/dashboard/financeiro")).toBe(true);
    expect(rotaLivreNaTrava("/dashboard/dados")).toBe(true);
    expect(rotaLivreNaTrava("/dashboard/conta")).toBe(true);
  });

  it("o resto do painel não", () => {
    expect(rotaLivreNaTrava("/dashboard")).toBe(false);
    expect(rotaLivreNaTrava("/dashboard/secretarias/saude")).toBe(false);
    // Prefixo parecido não passa: /dashboard/dadosx não é /dashboard/dados.
    expect(rotaLivreNaTrava("/dashboard/dadosx")).toBe(false);
  });
});
