import { describe, it, expect } from "vitest";
import {
  apurar,
  frase,
  latenciaPiorou,
  MINIMO_DE_DIAS_PARA_PERCENTUAL,
  type Medicao,
} from "@/lib/disponibilidade";

const m = (dia: string, ok = true, ms = 400, hora = "09:00:00"): Medicao => ({
  verificadoEm: `${dia}T${hora}.000Z`,
  ok,
  ms,
  detalhe: ok ? null : "Error",
});

/** N dias seguidos a partir de 2026-01-01. */
function dias(n: number, falhasEm: number[] = []): Medicao[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    return m(d, !falhasEm.includes(i));
  });
}

describe("a contagem é por dia, não por medição", () => {
  it("duas verificações no mesmo dia contam um dia só", () => {
    // Contar medições deixaria o número à mercê de quantas vezes o cron
    // rodou, que não é sinal de nada.
    const a = apurar([m("2026-01-01", true, 400, "09:00:00"), m("2026-01-01", true, 420, "21:00:00")]);
    expect(a.diasVerificados).toBe(1);
    expect(a.diasSemFalha).toBe(1);
  });

  it("uma falha no dia marca o dia inteiro, mesmo com outra verificação boa", () => {
    const a = apurar([m("2026-01-01", true, 400, "09:00:00"), m("2026-01-01", false, 20000, "21:00:00")]);
    expect(a.diasComFalha).toBe(1);
    expect(a.diasSemFalha).toBe(0);
  });

  it("dias com falha vêm do mais recente para trás", () => {
    const a = apurar(dias(10, [1, 7]));
    expect(a.datasComFalha).toEqual(["2026-01-08", "2026-01-02"]);
  });
});

describe("poucas amostras não viram percentual", () => {
  // Com cinco amostras, uma falha vira "80%" — número que parece precisão e é
  // ruído. A contagem crua é sempre verdadeira; o percentual precisa de base.

  it("abaixo do mínimo, não publica percentual", () => {
    const a = apurar(dias(5, [2]));
    expect(a.percentualDeDias).toBeNull();
    expect(a.diasVerificados).toBe(5);
    expect(a.diasSemFalha).toBe(4);
  });

  it("a frase diz por que o percentual não está lá", () => {
    expect(frase(apurar(dias(5, [2])))).toMatch(/poucas amostras/);
    expect(frase(apurar(dias(5, [2])))).toContain(String(MINIMO_DE_DIAS_PARA_PERCENTUAL));
  });

  it("no mínimo exato, já publica", () => {
    const a = apurar(dias(MINIMO_DE_DIAS_PARA_PERCENTUAL, [0]));
    expect(a.percentualDeDias).not.toBeNull();
    expect(a.percentualDeDias).toBeCloseTo((29 / 30) * 100, 5);
  });

  it("sem medição nenhuma, não inventa nada", () => {
    const a = apurar([]);
    expect(a.diasVerificados).toBe(0);
    expect(a.percentualDeDias).toBeNull();
    expect(a.latenciaMediana).toBeNull();
    expect(frase(a)).toMatch(/Nenhuma verificação/);
  });
});

describe("a frase não promete o que não mediu", () => {
  it("nunca usa a palavra uptime", () => {
    // Uma verificação por dia não é uptime por minuto. Chamar assim seria
    // vender precisão que a amostra não tem.
    for (const n of [1, 5, 30, 90]) {
      expect(frase(apurar(dias(n, [1])))).not.toMatch(/uptime/i);
    }
  });

  it("a contagem crua vem antes do percentual", () => {
    // É ela que o leitor confere linha a linha.
    const t = frase(apurar(dias(60, [3])));
    expect(t.indexOf("59 dos 60")).toBeGreaterThanOrEqual(0);
    expect(t.indexOf("59 dos 60")).toBeLessThan(t.indexOf("%"));
  });

  it("nunca promete disponibilidade futura", () => {
    const t = frase(apurar(dias(60)));
    expect(t).not.toMatch(/garant|assegur|comprometemo|99,9/i);
  });

  it("singular e plural saem certos", () => {
    expect(frase(apurar(dias(1)))).toContain("1 dia verificado");
    expect(frase(apurar(dias(2)))).toContain("2 dias verificados");
  });
});

describe("latência", () => {
  it("mediana ignora as que falharam", () => {
    // Uma falha costuma registrar o tempo do timeout, que distorceria tudo.
    const a = apurar([m("2026-01-01", true, 100), m("2026-01-02", true, 300), m("2026-01-03", false, 20000)]);
    expect(a.latenciaMediana).toBe(200);
    expect(a.latenciaPior).toBe(300);
  });

  it("mediana com número ímpar de amostras", () => {
    const a = apurar([m("2026-01-01", true, 100), m("2026-01-02", true, 500), m("2026-01-03", true, 300)]);
    expect(a.latenciaMediana).toBe(300);
  });

  it("dobrar é sinal; variar um pouco é ruído de rede", () => {
    const antigas = Array.from({ length: 7 }, (_, i) => m(`2026-01-0${i + 1}`, true, 400));
    const dobrou = Array.from({ length: 7 }, (_, i) => m(`2026-01-1${i}`, true, 1200));
    const parecidas = Array.from({ length: 7 }, (_, i) => m(`2026-01-1${i}`, true, 460));
    expect(latenciaPiorou([...antigas, ...dobrou])).toBe(true);
    expect(latenciaPiorou([...antigas, ...parecidas])).toBe(false);
  });

  it("sem histórico suficiente, não afirma tendência", () => {
    expect(latenciaPiorou(dias(5))).toBe(false);
  });
});

describe("o período apurado é declarado", () => {
  it("primeira e última verificação saem na apuração", () => {
    // Sem o período, "respondeu em 29 de 30" não diz de quando.
    const a = apurar(dias(30));
    expect(a.primeira).toContain("2026-01-01");
    expect(a.ultima).toContain("2026-01-30");
  });

  it("a ordem de entrada não altera o período", () => {
    const baralhado = [...dias(10)].reverse();
    const a = apurar(baralhado);
    expect(a.primeira).toContain("2026-01-01");
    expect(a.ultima).toContain("2026-01-10");
  });
});
