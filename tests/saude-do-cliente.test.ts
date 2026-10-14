import { describe, expect, it } from "vitest";
import { parouDeImportar, riscoDe, sinaisDoCliente, type FatosDoCliente } from "@/lib/saude-do-cliente";

const HOJE = new Date("2026-12-01T12:00:00Z");
const saudavel: FatosDoCliente = {
  municipio: "Picos",
  uf: "PI",
  ultimoAcesso: "2026-11-30 10:00:00-03",
  ultimoAcessoGestor: "2026-11-28 10:00:00-03",
  usuarios: 5,
  usuariosComEmail: 4,
  urgentesParados: 0,
  manifestacoesVencidas: 0,
  fontesParadas: [],
  diasDeAtraso: 0,
  fimDoContrato: "2027-06-01",
};

describe("os sinais", () => {
  it("cliente que usa não tem sinal", () => {
    expect(sinaisDoCliente(saudavel, HOJE)).toEqual([]);
    expect(riscoDe([])).toBe("baixo");
  });

  it("15 dias sem ninguém abrir é risco alto", () => {
    const s = sinaisDoCliente({ ...saudavel, ultimoAcesso: "2026-11-10 10:00:00-03", ultimoAcessoGestor: null }, HOJE);
    expect(s[0].texto).toBe("Ninguém abre o painel há 21 dias");
    expect(riscoDe(s)).toBe("alto");
  });

  it("nas duas primeiras semanas do registro, a falta de acesso não acusa", () => {
    expect(sinaisDoCliente({ ...saudavel, ultimoAcesso: null, ultimoAcessoGestor: null }, new Date("2026-10-20T12:00:00Z"))).toEqual([]);
  });

  it("dado parado e urgente esquecido somam para atenção", () => {
    const s = sinaisDoCliente({ ...saudavel, urgentesParados: 2, fontesParadas: ["Contratos (PNCP)"] }, HOJE);
    expect(s.map((x) => x.peso)).toEqual([2, 2]);
    expect(riscoDe(s)).toBe("medio");
  });

  it("contrato perto do fim entra como lembrete de renovação", () => {
    const s = sinaisDoCliente({ ...saudavel, fimDoContrato: "2027-01-15" }, HOJE);
    expect(s[0].texto).toBe("Contrato termina em 45 dias: hora de falar da renovação");
    expect(riscoDe(s)).toBe("baixo");
  });

  it("atraso na mensalidade pesa mais depois de 15 dias", () => {
    expect(sinaisDoCliente({ ...saudavel, diasDeAtraso: 5 }, HOJE)[0].peso).toBe(2);
    expect(sinaisDoCliente({ ...saudavel, diasDeAtraso: 20 }, HOJE)[0].peso).toBe(3);
  });
});

describe("importação parada", () => {
  it("três falhas seguidas, as mais recentes", () => {
    expect(parouDeImportar(["falhou", "falhou", "falhou", "ok"])).toBe(true);
    expect(parouDeImportar(["falhou", "ok", "falhou", "falhou"])).toBe(false);
    expect(parouDeImportar(["falhou", "falhou"])).toBe(false);
  });
});
