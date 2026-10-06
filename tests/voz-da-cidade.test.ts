import { describe, it, expect } from "vitest";
import { resumirVoz, MINIMO_PUBLICO, type LinhaVoz } from "@/lib/voz-da-cidade";

const AGORA = Date.parse("2026-10-06T12:00:00Z");
const diasAtras = (d: number) => new Date(AGORA - d * 86_400_000).toISOString();

function linha(p: Partial<LinhaVoz> = {}): LinhaVoz {
  return { tipo: "reclamacao", status: "aberto", secretaria: "saude", createdAt: diasAtras(3), respondidoEm: null, ...p };
}

describe("voz da cidade", () => {
  it("abaixo do mínimo não publica nada do que foi dito", () => {
    const r = resumirVoz(Array.from({ length: MINIMO_PUBLICO - 1 }, () => linha()), AGORA);
    expect(r).toEqual({ publica: false, total: MINIMO_PUBLICO - 1 });
  });

  it("conta respondidas, prazo médio e elogios", () => {
    const linhas = [
      linha({ status: "respondido", createdAt: diasAtras(10), respondidoEm: diasAtras(8) }),
      linha({ status: "encerrado", createdAt: diasAtras(10), respondidoEm: diasAtras(6) }),
      linha({ tipo: "elogio" }),
      linha({ tipo: "elogio" }),
      linha({ status: "em_analise" }),
    ];
    const r = resumirVoz(linhas, AGORA);
    if (!r.publica) throw new Error("devia publicar");
    expect(r.total).toBe(5);
    expect(r.respondidas).toBe(2);
    expect(r.percentualRespondido).toBe(40);
    expect(r.diasMedioResposta).toBe(3);
    expect(r.elogios).toBe(2);
    expect(r.porTipo[0]).toEqual({ tipo: "reclamacao", quantidade: 3 });
  });

  it("a faixa só leva tipo, área, situação e dias — nunca texto do cidadão", () => {
    const linhas = Array.from({ length: 6 }, (_, i) => ({ ...linha({ createdAt: diasAtras(i) }), assunto: "Rua da Maria, 12", nome: "Maria" }));
    const r = resumirVoz(linhas as LinhaVoz[], AGORA);
    if (!r.publica) throw new Error("devia publicar");
    for (const item of r.faixa) expect(Object.keys(item).sort()).toEqual(["area", "dias", "situacao", "tipo"]);
    expect(JSON.stringify(r)).not.toContain("Maria");
  });

  it("ignora o que passou de um ano", () => {
    const linhas = [...Array.from({ length: 5 }, () => linha()), linha({ createdAt: diasAtras(400) })];
    const r = resumirVoz(linhas, AGORA);
    expect(r.total).toBe(5);
  });
});
