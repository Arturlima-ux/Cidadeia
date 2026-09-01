import { describe, it, expect } from "vitest";
import {
  EXIGENCIAS,
  BLOCOS,
  NOME_BLOCO,
  avaliar,
  exigenciasDoBloco,
  totalQueResolvemos,
  type Resposta,
} from "@/lib/diagnostico";

function responderTudo(r: Resposta): Record<string, Resposta> {
  return Object.fromEntries(EXIGENCIAS.map((e) => [e.id, r]));
}

describe("catálogo de exigências", () => {
  it("não tem id repetido", () => {
    // Um id duplicado faria uma pergunta sobrescrever a resposta da outra.
    const ids = EXIGENCIAS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cita lei e artigo em todas", () => {
    // O diagnóstico só vale se o gestor puder levar o artigo ao jurídico.
    for (const e of EXIGENCIAS) {
      expect(e.lei, e.id).toMatch(/Lei|Complementar/);
      expect(e.artigo, e.id).toMatch(/art\./);
      expect(e.risco.length, e.id).toBeGreaterThan(20);
      expect(e.comoResolve.length, e.id).toBeGreaterThan(20);
    }
  });

  it("cobre os quatro blocos e nenhum fica vazio", () => {
    for (const b of BLOCOS) {
      expect(exigenciasDoBloco(b).length, b).toBeGreaterThan(0);
      expect(NOME_BLOCO[b]).toBeTruthy();
    }
    expect(EXIGENCIAS.every((e) => BLOCOS.includes(e.bloco))).toBe(true);
  });

  it("admite exigências que o CidadeIA NÃO resolve", () => {
    // Esta é a regra de honestidade do módulo, e o motivo de ela estar num
    // teste: uma lista em que tudo é resolvido pelo produto que a publicou é
    // material de venda disfarçado, e o gestor percebe. Se alguém marcar
    // todas como resolvidas para "melhorar a conversão", a suíte quebra.
    const naoResolvidas = EXIGENCIAS.filter((e) => !e.resolvemos);
    expect(naoResolvidas.length).toBeGreaterThanOrEqual(3);
    expect(totalQueResolvemos()).toBeLessThan(EXIGENCIAS.length);
  });
});

describe("avaliação", () => {
  it("tudo sim é adequado e não sobra pendência", () => {
    const r = avaliar(responderTudo("sim"));
    expect(r.conformes).toBe(EXIGENCIAS.length);
    expect(r.nivel).toBe("adequado");
    expect(r.pendentes).toHaveLength(0);
    expect(r.incertas).toHaveLength(0);
  });

  it("tudo não é crítico", () => {
    const r = avaliar(responderTudo("nao"));
    expect(r.conformes).toBe(0);
    expect(r.nivel).toBe("critico");
    expect(r.pendentes).toHaveLength(EXIGENCIAS.length);
  });

  it("não sei não conta como atendida", () => {
    // O diagnóstico serve para levar ao Tribunal de Contas, e lá "eu achava
    // que sim" pesa igual a "não".
    const r = avaliar(responderTudo("nao_sei"));
    expect(r.conformes).toBe(0);
    expect(r.nivel).toBe("critico");
    expect(r.incertas).toHaveLength(EXIGENCIAS.length);
    expect(r.pendentes).toHaveLength(0);
  });

  it("separa incerteza de pendência assumida", () => {
    const [a, b] = EXIGENCIAS;
    const r = avaliar({ [a.id]: "nao", [b.id]: "nao_sei" });
    expect(r.pendentes.map((e) => e.id)).toEqual([a.id]);
    expect(r.incertas.map((e) => e.id)).toEqual([b.id]);
  });

  it("questão não respondida não vira conformidade", () => {
    // Um formulário abandonado no meio não pode render nota alta.
    const r = avaliar({});
    expect(r.conformes).toBe(0);
    expect(r.pendentes).toHaveLength(0);
    expect(r.incertas).toHaveLength(0);
    expect(r.nivel).toBe("critico");
  });

  it("divide o que resolvemos do que continua com a prefeitura", () => {
    const r = avaliar(responderTudo("nao"));
    // Toda exigência aberta cai em exatamente um dos dois lados.
    expect(r.cobertas.length + r.descobertas.length).toBe(EXIGENCIAS.length);
    expect(r.cobertas.every((e) => e.resolvemos)).toBe(true);
    expect(r.descobertas.every((e) => !e.resolvemos)).toBe(true);
    expect(r.descobertas.length).toBeGreaterThan(0);
  });

  it("ignora resposta de id que não existe", () => {
    const r = avaliar({ inexistente: "sim" });
    expect(r.conformes).toBe(0);
  });

  it("atravessa a faixa de atenção antes de chegar em adequado", () => {
    // Garante que os três níveis são alcançáveis — um limiar mal escrito
    // deixaria "atencao" inatingível e o resultado seria sempre extremo.
    const ids = EXIGENCIAS.map((e) => e.id);
    const parcial = (quantos: number) =>
      avaliar(Object.fromEntries(ids.slice(0, quantos).map((id) => [id, "sim" as Resposta])));

    const niveis = ids.map((_, i) => parcial(i + 1).nivel);
    expect(niveis).toContain("critico");
    expect(niveis).toContain("atencao");
    expect(niveis).toContain("adequado");
  });
});
