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
  suspendeEm,
  somarMeses,
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
      expect(s.travaEm).toBe("2027-01-11");
    }
  });

  it("só suspende com atraso superior a 2 meses da emissão da nota fiscal (art. 137, § 2º, IV)", () => {
    const emitida = { ...f("2026-11", "2026-11-10"), emitidaEm: "2026-11-01" };
    const faturas = [f("2026-10", "2026-10-10", "paga"), emitida];
    expect(suspendeEm(emitida)).toBe("2027-01-02");
    // Um mês inteiro de atraso ainda não trava, nem o dia em que fecham 2 meses.
    expect(painelTravado(situacaoFinanceira(faturas, "2026-12-15"))).toBe(false);
    expect(painelTravado(situacaoFinanceira(faturas, "2027-01-01"))).toBe(false);
    expect(painelTravado(situacaoFinanceira(faturas, "2027-01-02"))).toBe(true);
  });

  it("meses de calendário presos ao fim do mês", () => {
    expect(somarMeses("2026-12-31", 2)).toBe("2027-02-28");
    expect(somarMeses("2026-11-01", -1)).toBe("2026-10-01");
  });

  it("pagou a fatura atrasada: destrava na hora", () => {
    const s = situacaoFinanceira([f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10", "paga")], "2026-11-30");
    expect(painelTravado(s)).toBe(false);
  });

  it("a fatura mais antiga em atraso é a que conta", () => {
    const s = situacaoFinanceira(
      [f("2026-10", "2026-10-10", "paga"), f("2026-11", "2026-11-10"), f("2026-12", "2026-12-10")],
      "2027-01-11"
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
    expect(painelTravado(situacaoDaConta([outro, principal], "2027-01-15"))).toBe(true);
  });
});

describe("o que continua aberto com a conta travada", () => {
  it("financeiro, exportação de dados e a própria conta", () => {
    expect(rotaLivreNaTrava("/dashboard/financeiro")).toBe(true);
    expect(rotaLivreNaTrava("/dashboard/dados")).toBe(true);
    expect(rotaLivreNaTrava("/dashboard/conta")).toBe(true);
  });

  it("o atendimento ao cidadão: ouvidoria e LAI têm prazo legal", () => {
    expect(rotaLivreNaTrava("/dashboard/atendimento")).toBe(true);
  });

  it("o resto do painel não", () => {
    expect(rotaLivreNaTrava("/dashboard")).toBe(false);
    expect(rotaLivreNaTrava("/dashboard/secretarias/saude")).toBe(false);
    // Prefixo parecido não passa: /dashboard/dadosx não é /dashboard/dados.
    expect(rotaLivreNaTrava("/dashboard/dadosx")).toBe(false);
  });
});

describe("pós-pago, o padrão", () => {
  it("fatura o mês que passou, a partir do mês em que os módulos ligaram", () => {
    expect(competenciaQueFalta([], "2026-11-01", "pos_pago", "2026-10-15T12:00:00Z")).toBe("2026-10");
    expect(competenciaQueFalta([], "2026-10-20", "pos_pago", "2026-10-15T12:00:00Z")).toBeNull();
    expect(competenciaQueFalta([f("2026-10", "2026-12-01")], "2026-11-20", "pos_pago", "2026-10-15")).toBeNull();
    expect(competenciaQueFalta([], "2026-11-01", "pos_pago", null)).toBeNull();
  });

  it("a primeira fatura em aberto não vira 'aguardando pagamento': o módulo já está ligado", () => {
    const s = situacaoFinanceira([{ ...f("2026-10", "2026-12-01"), emitidaEm: "2026-11-01" }], "2026-11-28", "pos_pago");
    expect(s.tipo).toBe("a_vencer");
  });

  it("e trava pela mesma regra dos 2 meses da emissão", () => {
    const fat = { ...f("2026-10", "2026-12-01"), emitidaEm: "2026-11-01" };
    expect(painelTravado(situacaoFinanceira([fat], "2027-01-01", "pos_pago"))).toBe(false);
    expect(painelTravado(situacaoFinanceira([fat], "2027-01-02", "pos_pago"))).toBe(true);
  });

  it("na conta, cada contrato com a sua modalidade", () => {
    const pos = { faturas: [{ ...f("2026-10", "2026-12-01"), emitidaEm: "2026-11-01" }], modalidade: "pos_pago" as const };
    expect(situacaoDaConta([pos], "2026-11-05").tipo).toBe("em_dia");
  });
});
