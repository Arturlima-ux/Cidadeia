import { describe, it, expect } from "vitest";
import {
  prazoDeUmDiaUtil,
  diasUteisEntre,
  situacaoDoLead,
  telefoneDoLead,
  prioridadeDoLead,
  agendaComercial,
  acompanhamentoDevido,
  TIPOS_EVENTO_LEAD,
} from "@/lib/oportunidades";

// Horário de Brasília = UTC-3.
const br = (s: string) => new Date(`${s}-03:00`).getTime();

describe("prazo de um dia útil", () => {
  it("pedido de terça vence no fim de quarta", () => {
    expect(prazoDeUmDiaUtil(new Date(br("2026-10-06T15:00:00")).toISOString())).toBe(br("2026-10-07T23:59:59"));
  });
  it("pedido de sexta à noite vence no fim de segunda", () => {
    expect(prazoDeUmDiaUtil(new Date(br("2026-10-09T22:30:00")).toISOString())).toBe(br("2026-10-12T23:59:59"));
  });
  it("conta dias úteis, sem fim de semana", () => {
    expect(diasUteisEntre(new Date(br("2026-10-09T10:00:00")).toISOString(), br("2026-10-14T10:00:00"))).toBe(3);
  });
});

describe("situação do interessado", () => {
  const ev = (tipo: string, criadoEm: string, descricao = "") => ({ tipo, criadoEm, descricao });
  it("sem evento é novo; o último evento decide", () => {
    expect(situacaoDoLead([])).toBe("novo");
    expect(situacaoDoLead([ev(TIPOS_EVENTO_LEAD.contatado, "2026-10-01"), ev(TIPOS_EVENTO_LEAD.virouPedido, "2026-10-03")])).toBe("virou_pedido");
    expect(situacaoDoLead([ev(TIPOS_EVENTO_LEAD.telefone, "2026-10-01", "{}")])).toBe("novo");
  });
  it("lê o telefone deixado", () => {
    expect(telefoneDoLead([ev(TIPOS_EVENTO_LEAD.telefone, "x", JSON.stringify({ telefone: "(86) 99999-0000", horario: "manhã" }))])).toEqual({ telefone: "(86) 99999-0000", horario: "manhã" });
  });
  it("prefeito com telefone vem antes de imprensa", () => {
    expect(prioridadeDoLead({ cargo: "Prefeito(a)", origem: "ligacao" }, true)).toBeGreaterThan(prioridadeDoLead({ cargo: "Imprensa", origem: "raio-x" }, false));
  });
});

describe("agenda comercial", () => {
  it("separa proposta atrasada da que vence hoje", () => {
    const p = (id: string, criado: string) => ({ id, municipio: "X", uf: "PI", nome: "N", email: "e", status: "recebido", createdAt: new Date(br(criado)).toISOString() });
    const a = agendaComercial([p("velho", "2026-10-05T10:00:00"), p("ontem", "2026-10-07T10:00:00"), p("hoje", "2026-10-08T09:00:00")], br("2026-10-08T12:00:00"));
    expect(a.propostasAtrasadas.map((x) => x.id)).toEqual(["velho"]);
    expect(a.propostasVencendoHoje.map((x) => x.id)).toEqual(["ontem"]);
  });
});

describe("acompanhamento depois da proposta", () => {
  const enviada = new Date(br("2026-10-01T10:00:00")).toISOString(); // quinta
  it("o primeiro sai no 3º dia útil, o segundo no 8º, e depois silêncio", () => {
    expect(acompanhamentoDevido(enviada, [], br("2026-10-05T10:00:00"))).toBeNull(); // 2 dias úteis
    expect(acompanhamentoDevido(enviada, [], br("2026-10-06T10:00:00"))?.chave).toBe("acompanhamento_1");
    expect(acompanhamentoDevido(enviada, ["acompanhamento_1"], br("2026-10-06T10:00:00"))).toBeNull();
    expect(acompanhamentoDevido(enviada, ["acompanhamento_1"], br("2026-10-13T10:00:00"))?.chave).toBe("acompanhamento_2");
    expect(acompanhamentoDevido(enviada, ["acompanhamento_1", "acompanhamento_2"], br("2026-11-30T10:00:00"))).toBeNull();
  });
});
