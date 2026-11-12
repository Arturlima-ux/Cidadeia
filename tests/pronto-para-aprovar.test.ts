import { describe, expect, it } from "vitest";
import {
  itemDaNotificacao,
  itemDaRenovacao,
  itemDoPedido,
  nosUltimos30Dias,
  ordenarFila,
  placarDa,
  primeiraFrase,
} from "@/lib/pronto-para-aprovar";
import { redirecionarSecretario } from "@/lib/acesso-rotas";

const renovacao = (extra: Partial<Parameters<typeof itemDaRenovacao>[0]> = {}) =>
  itemDaRenovacao({
    contratoId: "c1",
    objeto: "Coleta de lixo",
    numeroContrato: "12/2025",
    vigenciaTexto: "Vence em 40 dias úteis",
    situacao: "atencao",
    peso: 5,
    estado: "rascunho",
    ...extra,
  });

describe("a fila do que já está pronto (lib/pronto-para-aprovar.ts)", () => {
  it("o que já foi aprovado não volta para a fila", () => {
    expect(itemDaNotificacao({ obraId: "o1", obraNome: "Creche", motivo: "atraso", estado: "aprovado" })).toBeNull();
    expect(renovacao({ estado: "aprovado" })).toBeNull();
    // Contrato com sucessor para o mesmo objeto: não há o que renovar.
    expect(renovacao({ estado: "substituido" })).toBeNull();
  });

  it("aprovado e mudado depois volta, marcado, com o motivo dito", () => {
    const i = itemDaNotificacao({ obraId: "o1", obraNome: "Creche", motivo: "atraso", estado: "desatualizado" })!;
    expect(i.mudou).toBe(true);
    expect(i.motivo).toMatch(/mudou depois da aprovação/);
  });

  it("cada item leva à tela onde o trabalho é conferido", () => {
    expect(itemDaNotificacao({ obraId: "o1", obraNome: "Creche", motivo: "atraso", estado: "rascunho" })!.href).toBe(
      "/dashboard/secretarias/obras/o1/notificacao"
    );
    expect(renovacao()!.href).toBe("/dashboard/secretarias/licitacoes/contratos/c1");
    expect(itemDoPedido("saude", [{ situacao: "falta", local: "u1" }])!.href).toBe("/dashboard/secretarias/saude/reposicao");
    expect(itemDoPedido("educacao", [{ situacao: "falta", local: "e1" }])!.href).toBe("/dashboard/secretarias/educacao/reposicao");
  });

  it("o pedido é um item só, com itens e locais contados", () => {
    const i = itemDoPedido("saude", [
      { situacao: "falta", local: "u1" },
      { situacao: "critico", local: "u1" },
      { situacao: "atencao", local: "u2" },
    ])!;
    expect(i.assunto).toBe("3 itens em 2 unidades");
    expect(i.motivo).toMatch(/^1 item em falta e 1 acabando em até 7 dias/);
    expect(i.urgente).toBe(true);
    expect(itemDoPedido("saude", [])).toBeNull();
  });

  it("urgente primeiro, depois o que mudou, depois o prazo", () => {
    const fila = ordenarFila([
      renovacao({ contratoId: "a", peso: 9 })!,
      renovacao({ contratoId: "b", situacao: "vencido", peso: 1 })!,
      renovacao({ contratoId: "c", estado: "desatualizado", peso: 9 })!,
      renovacao({ contratoId: "d", peso: 2 })!,
    ]);
    expect(fila.map((i) => i.id)).toEqual(["contrato:b", "contrato:c", "contrato:d", "contrato:a"]);
  });

  it("na fila vai só a primeira frase do prazo, sem data crua", () => {
    expect(primeiraFrase("Vence em 20 dias (14 dias úteis). O edital sozinho consome 10 desses dias úteis (art. 55, II, a).")).toBe(
      "Vence em 20 dias (14 dias úteis)"
    );
    expect(primeiraFrase("Vence em 75 dias (2027-01-26).")).toBe("Vence em 75 dias");
  });

  it("o placar conta só o que existe", () => {
    const fila = [renovacao({ situacao: "vencido" })!, renovacao({ contratoId: "c2" })!];
    expect(placarDa(fila, 4)).toEqual({ naFila: 2, urgentes: 1, aprovados30: 4 });
  });

  it("30 dias contam de hoje para trás", () => {
    const hoje = new Date("2026-11-11T12:00:00Z");
    expect(nosUltimos30Dias(new Date("2026-10-20T12:00:00Z"), hoje)).toBe(true);
    expect(nosUltimos30Dias(new Date("2026-10-01T12:00:00Z"), hoje)).toBe(false);
    expect(nosUltimos30Dias(new Date("invalido"), hoje)).toBe(false);
  });

  it("o secretário abre a fila (ela filtra pela área dele)", () => {
    expect(redirecionarSecretario("/dashboard/pronto", "obras")).toBeNull();
  });
});
