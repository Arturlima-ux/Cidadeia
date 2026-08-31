import { describe, it, expect } from "vitest";
import {
  fusoDoEstado,
  horaLocal,
  saudacao,
  dataPorExtenso,
  FUSO_PADRAO,
  dataCurta,
  dataNumerica,
} from "@/lib/horario";

// Instante de referência: 31/08/2026 às 01:51 UTC.
// No Ceará (UTC−3) ainda é domingo, 30 de agosto, 22:51 — que é exatamente
// o caso que apareceu em produção: o painel dizia "Bom dia, segunda-feira,
// 31 de agosto" para quem estava numa noite de domingo.
const NOITE_NO_CEARA = new Date("2026-08-31T01:51:00.000Z");

describe("fuso por estado", () => {
  it("usa Brasília para a maior parte do país", () => {
    for (const uf of ["CE", "SP", "RJ", "BA", "PI", "RS", "PA"]) {
      expect(fusoDoEstado(uf)).toBe(FUSO_PADRAO);
    }
  });

  it("respeita os estados com fuso próprio", () => {
    // Sem isso, uma prefeitura do Acre veria o relógio de Brasília, duas
    // horas adiantado — o mesmo defeito, só que menor.
    expect(fusoDoEstado("AC")).toBe("America/Rio_Branco");
    expect(fusoDoEstado("AM")).toBe("America/Manaus");
    expect(fusoDoEstado("RR")).toBe("America/Boa_Vista");
    expect(fusoDoEstado("RO")).toBe("America/Porto_Velho");
    expect(fusoDoEstado("MT")).toBe("America/Cuiaba");
    expect(fusoDoEstado("MS")).toBe("America/Campo_Grande");
  });

  it("aceita a UF em minúscula ou com espaço", () => {
    expect(fusoDoEstado(" ac ")).toBe("America/Rio_Branco");
    expect(fusoDoEstado("Am")).toBe("America/Manaus");
  });

  it("cai no padrão quando a prefeitura não tem estado cadastrado", () => {
    expect(fusoDoEstado(null)).toBe(FUSO_PADRAO);
    expect(fusoDoEstado(undefined)).toBe(FUSO_PADRAO);
    expect(fusoDoEstado("")).toBe(FUSO_PADRAO);
    expect(fusoDoEstado("XX")).toBe(FUSO_PADRAO);
  });
});

describe("hora local", () => {
  it("não usa a hora do servidor", () => {
    // O servidor está em UTC (01h). O Ceará está em 22h do dia anterior.
    expect(NOITE_NO_CEARA.getUTCHours()).toBe(1);
    expect(horaLocal("America/Sao_Paulo", NOITE_NO_CEARA)).toBe(22);
  });

  it("dá horas diferentes para fusos diferentes no mesmo instante", () => {
    expect(horaLocal("America/Sao_Paulo", NOITE_NO_CEARA)).toBe(22);
    expect(horaLocal("America/Manaus", NOITE_NO_CEARA)).toBe(21);
    expect(horaLocal("America/Rio_Branco", NOITE_NO_CEARA)).toBe(20);
  });

  it("trata meia-noite como 0, não como 24", () => {
    const meiaNoiteEmBrasilia = new Date("2026-08-31T03:00:00.000Z");
    expect(horaLocal("America/Sao_Paulo", meiaNoiteEmBrasilia)).toBe(0);
  });
});

describe("saudação", () => {
  it("resolve o caso que apareceu em produção", () => {
    // Era isto que estava errado: 22h no Ceará mostrando "Bom dia".
    expect(saudacao("America/Sao_Paulo", NOITE_NO_CEARA)).toBe("Boa noite");
  });

  it.each([
    ["2026-08-30T09:00:00.000Z", 6, "Bom dia"],
    ["2026-08-30T13:00:00.000Z", 10, "Bom dia"],
    ["2026-08-30T14:59:00.000Z", 11, "Bom dia"],
    ["2026-08-30T15:00:00.000Z", 12, "Boa tarde"],
    ["2026-08-30T20:59:00.000Z", 17, "Boa tarde"],
    ["2026-08-30T21:00:00.000Z", 18, "Boa noite"],
    ["2026-08-31T02:00:00.000Z", 23, "Boa noite"],
  ])("em %s (%i h em Brasília) diz %s", (iso, horaEsperada, esperado) => {
    const instante = new Date(iso);
    expect(horaLocal("America/Sao_Paulo", instante)).toBe(horaEsperada);
    expect(saudacao("America/Sao_Paulo", instante)).toBe(esperado);
  });

  it("na madrugada diz Bom dia — servidor de plantão existe", () => {
    const tresDaManha = new Date("2026-08-31T06:00:00.000Z");
    expect(horaLocal("America/Sao_Paulo", tresDaManha)).toBe(3);
    expect(saudacao("America/Sao_Paulo", tresDaManha)).toBe("Bom dia");
  });

  it("a mesma hora UTC dá saudações diferentes conforme o estado", () => {
    // 15:30 UTC = 12:30 em Brasília (tarde) e 11:30 no Acre (manhã).
    const instante = new Date("2026-08-30T15:30:00.000Z");
    expect(saudacao(fusoDoEstado("CE"), instante)).toBe("Boa tarde");
    expect(saudacao(fusoDoEstado("AC"), instante)).toBe("Bom dia");
  });
});

describe("data por extenso", () => {
  it("mostra o dia do município, não o do servidor", () => {
    // O servidor já virou para 31 (segunda). No Ceará ainda é 30 (domingo).
    const texto = dataPorExtenso("America/Sao_Paulo", NOITE_NO_CEARA);
    expect(texto).toContain("30");
    expect(texto).toContain("agosto");
    expect(texto.toLowerCase()).toContain("domingo");
    expect(texto).not.toContain("31");
  });

  it("vira o dia junto com o município", () => {
    const depoisDaMeiaNoite = new Date("2026-08-31T03:30:00.000Z");
    const texto = dataPorExtenso("America/Sao_Paulo", depoisDaMeiaNoite);
    expect(texto).toContain("31");
    expect(texto.toLowerCase()).toContain("segunda");
  });
});

describe("datas guardadas no banco", () => {
  // Protocolo aberto no domingo, 30/08, às 21h no Brasil. Em UTC já é 31.
  const ABERTO_DOMINGO_A_NOITE = "2026-08-31T00:30:00.000Z";

  it("mostra o dia em que o cidadão de fato abriu o pedido", () => {
    // Sem fuso, sairia "31 ago" — e quem anotou "domingo, 30" não reconhece.
    expect(dataCurta(ABERTO_DOMINGO_A_NOITE, "America/Sao_Paulo")).toContain("30");
    expect(dataNumerica(ABERTO_DOMINGO_A_NOITE, "America/Sao_Paulo")).toBe("30/08/2026");
  });

  it("acompanha o fuso do estado", () => {
    const instante = "2026-08-31T02:30:00.000Z"; // 23:30 em Brasília, 21:30 no Acre
    expect(dataNumerica(instante, "America/Sao_Paulo")).toBe("30/08/2026");
    expect(dataNumerica(instante, "America/Rio_Branco")).toBe("30/08/2026");
  });

  it("devolve travessão em vez de quebrar com data ausente ou inválida", () => {
    // O banco tem colunas de data opcionais; uma delas vazia não pode
    // derrubar a página inteira.
    expect(dataCurta(null, "America/Sao_Paulo")).toBe("—");
    expect(dataCurta(undefined, "America/Sao_Paulo")).toBe("—");
    expect(dataCurta("", "America/Sao_Paulo")).toBe("—");
    expect(dataNumerica("data invalida", "America/Sao_Paulo")).toBe("—");
  });
});
