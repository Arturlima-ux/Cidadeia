import { describe, expect, it } from "vitest";
import {
  TIPO,
  contagem,
  diaDeBrasilia,
  ehDia,
  ehIdDeProspecto,
  montarProspecto,
  montarTodos,
  paraHoje,
  proximaAoEntrar,
  proximaDepoisDoFollowup,
  somarDiasUteis,
  taxas,
  type RegistroDaLinha,
} from "@/lib/prospeccao";

const dados = {
  municipio: "Teresina",
  uf: "PI",
  codigoIbge: "2211001",
  pessoa: "Fulana de Tal",
  cargo: "Secretário(a)",
  canal: "instagram",
  contato: "@fulana",
  gancho: "Despesa com pessoal em 50,1%",
};
const r = (tipo: string, descricao: unknown, criadoEm: string): RegistroDaLinha => ({
  tipo,
  descricao: typeof descricao === "string" ? descricao : JSON.stringify(descricao),
  autor: "equipe@cidadeia",
  criadoEm,
});

describe("datas de Brasília e dias úteis", () => {
  it("o dia é o de Brasília, não o de Greenwich", () => {
    // 02h de 4/11 em Greenwich ainda é 23h de 3/11 em Brasília.
    expect(diaDeBrasilia(Date.parse("2026-11-04T02:00:00Z"))).toBe("2026-11-03");
  });
  it("dias úteis pulam o fim de semana", () => {
    expect(somarDiasUteis("2026-11-06", 1)).toBe("2026-11-09"); // sexta + 1 = segunda
    expect(somarDiasUteis("2026-11-03", 2)).toBe("2026-11-05");
  });
  it("só aceita dia de calendário de verdade", () => {
    expect(ehDia("2026-11-03")).toBe(true);
    expect(ehDia("2026-02-30")).toBe(false);
    expect(ehDia("03/11/2026")).toBe(false);
  });
  it("id de prospecto tem o prefixo próprio", () => {
    expect(ehIdDeProspecto("pros_3f2a9c1e-5b7d")).toBe(true);
    expect(ehIdDeProspecto("lead_3f2a9c1e")).toBe(false);
    expect(ehIdDeProspecto("pros_x'; drop")).toBe(false);
  });
});

describe("a cadência do guia", () => {
  it("abordada pede o follow-up 1 em 2 dias úteis", () => {
    expect(proximaAoEntrar("abordada", "2026-11-03")).toEqual({ acao: "Follow-up 1: outro número, mesmo canal", data: "2026-11-05" });
  });
  it("os follow-ups seguem +3 e +5 dias úteis, e depois do terceiro é decidir hoje", () => {
    expect(proximaDepoisDoFollowup(1, "2026-11-05").data).toBe("2026-11-10");
    expect(proximaDepoisDoFollowup(2, "2026-11-10").data).toBe("2026-11-17");
    expect(proximaDepoisDoFollowup(3, "2026-11-17")).toEqual({ acao: "Sem resposta depois de 3 follow-ups: pausar ou descartar", data: "2026-11-17" });
  });
  it("pausada volta em 30 dias; pedido e descartada não pedem ação aqui", () => {
    expect(proximaAoEntrar("pausada", "2026-11-03")?.data).toBe("2026-12-03");
    expect(proximaAoEntrar("pedido", "2026-11-03")).toBeNull();
    expect(proximaAoEntrar("descartada", "2026-11-03")).toBeNull();
  });
});

describe("da linha do tempo ao prospecto", () => {
  it("sem o registro de criação, não há prospecto", () => {
    expect(montarProspecto("pros_a1b2", [r(TIPO.nota, "oi", "2026-11-03T10:00:00Z")])).toBeNull();
  });

  it("soma situação, próxima ação e follow-ups na ordem, mesmo vindo fora de ordem", () => {
    const p = montarProspecto("pros_a1b2", [
      r(TIPO.proxima, { acao: "Follow-up 1", data: "2026-11-05" }, "2026-11-03T10:02:00Z"),
      r(TIPO.criado, { ...dados, situacao: "abordada" }, "2026-11-03T10:00:00Z"),
      r(TIPO.followup, "sem resposta", "2026-11-05T10:00:00Z"),
      r(TIPO.proxima, { acao: "Follow-up 2", data: "2026-11-10" }, "2026-11-05T10:01:00Z"),
    ])!;
    expect(p.situacao).toBe("abordada");
    expect(p.followups).toBe(1);
    expect(p.proxima).toEqual({ acao: "Follow-up 2", data: "2026-11-10" });
    expect(p.dados.pessoa).toBe("Fulana de Tal");
    expect(p.historico).toHaveLength(4);
  });

  it("entrar numa etapa conta como ter passado pelas anteriores", () => {
    const p = montarProspecto("pros_a1b2", [
      r(TIPO.criado, { ...dados, situacao: "conversando" }, "2026-11-03T10:00:00Z"),
    ])!;
    expect([...p.passouPor]).toEqual(["mapeada", "aquecendo", "abordada", "conversando"]);
  });

  it("mudar de situação zera os follow-ups e guarda desde quando", () => {
    const p = montarProspecto("pros_a1b2", [
      r(TIPO.criado, { ...dados, situacao: "abordada" }, "2026-11-03T10:00:00Z"),
      r(TIPO.followup, "", "2026-11-05T10:00:00Z"),
      r(TIPO.situacao, { situacao: "conversando" }, "2026-11-06T09:00:00Z"),
    ])!;
    expect(p.situacao).toBe("conversando");
    expect(p.followups).toBe(0);
    expect(p.desde).toBe("2026-11-06T09:00:00Z");
  });

  it("próxima ação vazia ou com data quebrada fica sem próxima ação", () => {
    const p = montarProspecto("pros_a1b2", [
      r(TIPO.criado, dados, "2026-11-03T10:00:00Z"),
      r(TIPO.proxima, { acao: "x", data: "2026-02-30" }, "2026-11-03T10:01:00Z"),
    ])!;
    expect(p.proxima).toBeNull();
  });

  it("registro com JSON quebrado é ignorado, não derruba a mesa", () => {
    const p = montarProspecto("pros_a1b2", [
      r(TIPO.criado, dados, "2026-11-03T10:00:00Z"),
      r(TIPO.situacao, "{quebrado", "2026-11-03T10:01:00Z"),
    ])!;
    expect(p.situacao).toBe("mapeada");
  });
});

describe("a mesa", () => {
  const lista = montarTodos([
    { pedidoId: "pros_aaaa", ...r(TIPO.criado, { ...dados, municipio: "Atrasada", situacao: "abordada" }, "2026-11-01T10:00:00Z") },
    { pedidoId: "pros_aaaa", ...r(TIPO.proxima, { acao: "FU", data: "2026-11-02" }, "2026-11-01T10:01:00Z") },
    { pedidoId: "pros_bbbb", ...r(TIPO.criado, { ...dados, municipio: "Hoje", situacao: "qualificada" }, "2026-11-01T10:00:00Z") },
    { pedidoId: "pros_bbbb", ...r(TIPO.proxima, { acao: "Marcar", data: "2026-11-03" }, "2026-11-01T10:01:00Z") },
    { pedidoId: "pros_cccc", ...r(TIPO.criado, { ...dados, municipio: "Amanhã", situacao: "aquecendo" }, "2026-11-01T10:00:00Z") },
    { pedidoId: "pros_cccc", ...r(TIPO.proxima, { acao: "Abordar", data: "2026-11-04" }, "2026-11-01T10:01:00Z") },
    { pedidoId: "pros_dddd", ...r(TIPO.criado, { ...dados, municipio: "Pedido", situacao: "pedido" }, "2026-11-01T10:00:00Z") },
    { pedidoId: "pros_dddd", ...r(TIPO.proxima, { acao: "nada", data: "2026-11-01" }, "2026-11-01T10:01:00Z") },
    // um pedido de verdade na mesma tabela não entra
    { pedidoId: "ped_zzzz", ...r("status", "recebido", "2026-11-01T10:00:00Z") },
  ]);

  it("só prospectos entram, e pedidos de verdade ficam de fora", () => {
    expect(lista).toHaveLength(4);
  });

  it("para hoje: vencidas primeiro, depois as de hoje; o futuro e o que virou pedido ficam fora", () => {
    const hoje = paraHoje(lista, "2026-11-03");
    expect(hoje.map((p) => [p.dados.municipio, p.atrasada])).toEqual([
      ["Atrasada", true],
      ["Hoje", false],
    ]);
  });

  it("conta cada situação e calcula as taxas sobre quem chegou à etapa", () => {
    const c = contagem(lista);
    expect(c.abordada).toBe(1);
    expect(c.pedido).toBe(1);
    const t = taxas(lista);
    const resposta = t.find((x) => x.rotulo === "Resposta")!;
    // chegaram a abordada: Atrasada, Hoje (qualificada) e Pedido = 3; a conversando: Hoje e Pedido = 2
    expect([resposta.base, resposta.chegaram]).toEqual([3, 2]);
    expect(resposta.valor).toBeCloseTo(2 / 3);
  });

  it("sem ninguém na etapa de base, a taxa fica vazia, e não zero", () => {
    expect(taxas([]).every((t) => t.valor === null)).toBe(true);
  });
});

import { linkDoContato } from "@/lib/prospeccao";

describe("o link de cada canal", () => {
  it("Instagram pelo @, WhatsApp e ligação pelos dígitos, e-mail pelo mailto", () => {
    expect(linkDoContato("instagram", "@prefeitura.teresina")).toBe("https://instagram.com/prefeitura.teresina");
    expect(linkDoContato("whatsapp", "(86) 99999-1234")).toBe("https://wa.me/5586999991234");
    expect(linkDoContato("ligacao", "(86) 3215-0000")).toBe("tel:+558632150000");
    expect(linkDoContato("email", "financas@teresina.pi.gov.br")).toBe("mailto:financas@teresina.pi.gov.br");
  });
  it("endereço completo vale em qualquer canal; texto solto não vira link", () => {
    expect(linkDoContato("linkedin", "https://www.linkedin.com/in/fulana")).toBe("https://www.linkedin.com/in/fulana");
    expect(linkDoContato("linkedin", "Fulana de Tal")).toBeNull();
    expect(linkDoContato("email", "ver no site")).toBeNull();
    expect(linkDoContato("instagram", "javascript:alert(1)")).toBeNull();
  });
});
