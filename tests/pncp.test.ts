import { describe, it, expect } from "vitest";
import {
  MODALIDADES_MUNICIPAIS,
  normalizarNumero,
  anoDoNumero,
  conferirPublicacao,
  resumirConferencia,
  linkPncp,
  type ContratacaoPncp,
  type LicitacaoLocal,
} from "@/lib/pncp";

function noPncp(numeroCompra: string, anoCompra: number): ContratacaoPncp {
  return {
    numeroCompra,
    anoCompra,
    modalidade: "Dispensa",
    objeto: "Objeto de teste",
    valorEstimado: 1000,
    numeroControlePncp: `87990800000185-1-000${numeroCompra}/${anoCompra}`,
    publicadaEm: `${anoCompra}-03-01T10:00:00`,
  };
}

function local(id: string, numero: string): LicitacaoLocal {
  return { id, numero, objeto: "Objeto", status: "aberta" };
}

describe("modalidades consultadas", () => {
  it("cobre as que um município realmente usa", () => {
    // O parâmetro é obrigatório na API, então não existe "buscar tudo" — cada
    // modalidade é uma requisição, contra um limite apertado.
    const nomes = MODALIDADES_MUNICIPAIS.map((m) => m.nome.toLowerCase());
    expect(nomes.some((n) => n.includes("pregão"))).toBe(true);
    expect(nomes.some((n) => n.includes("dispensa"))).toBe(true);
    expect(nomes.some((n) => n.includes("inexigibilidade"))).toBe(true);
    expect(new Set(MODALIDADES_MUNICIPAIS.map((m) => m.codigo)).size).toBe(
      MODALIDADES_MUNICIPAIS.length
    );
  });
});

describe("normalização de número de processo", () => {
  it("casa formatos que a prefeitura e o PNCP escrevem diferente", () => {
    // A prefeitura digita "PE 014/2026"; o PNCP guarda "0014".
    expect(normalizarNumero("PE 014/2026")).toBe("14");
    expect(normalizarNumero("0014")).toBe("14");
    expect(normalizarNumero("Pregão 14/2026")).toBe("14");
    expect(normalizarNumero("14")).toBe("14");
  });

  it("não confunde o número com o ano depois da barra", () => {
    expect(normalizarNumero("1/2026")).toBe("1");
    expect(normalizarNumero("2026/2026")).toBe("2026");
  });

  it("devolve vazio quando não há dígito nenhum", () => {
    expect(normalizarNumero("processo sem número")).toBe("");
    expect(normalizarNumero("")).toBe("");
  });

  it("lê o ano quando o número o traz", () => {
    expect(anoDoNumero("PE 014/2026")).toBe(2026);
    expect(anoDoNumero("14")).toBeNull();
    expect(anoDoNumero("PE 14/26")).toBeNull();
  });
});

describe("conferência", () => {
  it("reconhece publicado apesar da diferença de formato", () => {
    const r = conferirPublicacao([local("a", "PE 014/2025")], [noPncp("0014", 2025)]);
    expect(r[0].publicada).toBe(true);
    expect(r[0].correspondente?.numeroCompra).toBe("0014");
  });

  it("aponta o que não está no PNCP", () => {
    // É o achado que justifica a tela: sem divulgação o contrato não produz
    // efeito, e ninguém avisa o gestor disso hoje.
    const r = conferirPublicacao([local("a", "PE 099/2025")], [noPncp("0014", 2025)]);
    expect(r[0].publicada).toBe(false);
    expect(r[0].correspondente).toBeNull();
  });

  it("não casa o mesmo número de anos diferentes", () => {
    // Sem a checagem de ano, o processo 14/2025 seria dado como publicado por
    // causa do 14/2026 — a tela mentiria exatamente onde precisa acertar.
    const r = conferirPublicacao([local("a", "PE 014/2025")], [noPncp("0014", 2026)]);
    expect(r[0].publicada).toBe(false);
  });

  it("casa por número quando o local não informa ano", () => {
    const r = conferirPublicacao([local("a", "14")], [noPncp("0014", 2025)]);
    expect(r[0].publicada).toBe(true);
  });

  it("nunca dá por publicado um processo sem número", () => {
    // Número vazio casaria com qualquer coisa se a comparação fosse ingênua.
    const r = conferirPublicacao([local("a", "sem número")], [noPncp("0014", 2025)]);
    expect(r[0].publicada).toBe(false);
  });

  it("resume separando o que falta", () => {
    const r = conferirPublicacao(
      [local("a", "PE 014/2025"), local("b", "PE 099/2025"), local("c", "PE 100/2025")],
      [noPncp("0014", 2025)]
    );
    const resumo = resumirConferencia(r);
    expect(resumo.total).toBe(3);
    expect(resumo.publicadas).toBe(1);
    expect(resumo.ausentes.map((a) => a.licitacao.id)).toEqual(["b", "c"]);
  });

  it("com lista local vazia não inventa pendência", () => {
    const resumo = resumirConferencia(conferirPublicacao([], [noPncp("0014", 2025)]));
    expect(resumo.total).toBe(0);
    expect(resumo.ausentes).toHaveLength(0);
  });
});

describe("link para o PNCP", () => {
  it("monta o endereço público a partir do número de controle", () => {
    const link = linkPncp(noPncp("0014", 2025));
    expect(link).toContain("pncp.gov.br/app/editais/87990800000185/2025/");
  });

  it("devolve null quando o número de controle não tem o formato esperado", () => {
    // Melhor não oferecer link do que oferecer um que abre em erro.
    expect(linkPncp({ ...noPncp("0014", 2025), numeroControlePncp: "formato-estranho" })).toBeNull();
  });
});
