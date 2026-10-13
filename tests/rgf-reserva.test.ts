import { describe, it, expect } from "vitest";
import { comReserva, compactar, descompactar, type LinhaReserva } from "@/lib/rgf-reserva";
import { fatoDoPessoal } from "@/lib/fatos-do-municipio";
import type { ImportacaoRgf, ResultadoRgf } from "@/lib/siconfi-rgf";

const dados: ImportacaoRgf = {
  periodo: { exercicio: 2026, periodicidade: "Q", periodo: 2, mesReferencia: 8 },
  instituicao: null,
  rclAjustada: 100_000_000,
  rcl: 101_000_000,
  despesaTotal: 52_400_000,
  limiteAlerta: 48_600_000,
  limitePrudencial: 51_300_000,
  limiteMaximo: 54_000_000,
  rclVeioDeReserva: false,
};
const arquivo = { geradoEm: "2026-10-12", m: { "2208007": compactar(dados) as LinhaReserva } };
const falhou: ResultadoRgf = { ok: false, erro: "", causa: "consulta_falhou", periodosProcurados: 0 };

describe("reserva do RGF", () => {
  it("compacta e descompacta sem perder nada", () => {
    expect(descompactar(compactar(dados))).toEqual(dados);
  });

  it("entra só quando a consulta falhou", () => {
    const r = comReserva("2208007", falhou, arquivo);
    expect(r.ok && r.reserva?.conferidoEm).toBe("2026-10-12");
    // Resposta do Tesouro dizendo que não há RGF passa intacta: a reserva
    // nunca esconde um "não publicado".
    const nao: ResultadoRgf = { ok: false, erro: "", causa: "nao_publicado", periodosProcurados: 8 };
    expect(comReserva("2208007", nao, arquivo)).toBe(nao);
    // Cidade fora da reserva, ou reserva vazia: segue a falha.
    expect(comReserva("2211001", falhou, arquivo)).toBe(falhou);
    expect(comReserva("2208007", falhou, { geradoEm: null, m: {} })).toBe(falhou);
  });

  it("a tela diz que o número é da reserva, com a data", () => {
    const f = fatoDoPessoal(comReserva("2208007", falhou, arquivo), "2026-10-13T12:00:00Z");
    expect(f.valor).toBe("52,40%");
    expect(f.ressalva).toContain("O Tesouro Nacional não respondeu agora");
    expect(f.ressalva).toContain("12/10/2026");
    expect(f.carimbo?.consultadoEm).toBe("12/10/2026");
  });
});
