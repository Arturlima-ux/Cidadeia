import { describe, it, expect } from "vitest";
import {
  detectarSeparador,
  lerCsv,
  lerDependencia,
  lerLocalizacao,
  lerSituacao,
  lerArquivoDeEscolas,
  doMunicipio,
  entraNaRede,
  censoVelho,
  censoMaisRecenteDisponivel,
  decodificarArquivo,
} from "@/lib/censo-escolar";

describe("leitura do arquivo do INEP", () => {
  it("descobre o separador que o INEP usa", () => {
    expect(detectarSeparador("Escola;Código INEP;UF")).toBe(";");
    expect(detectarSeparador("Escola,Codigo,UF")).toBe(",");
    expect(detectarSeparador("Escola\tCodigo\tUF")).toBe("\t");
  });

  it("respeita aspas, aspas dobradas e quebra de linha dentro do campo", () => {
    const linhas = lerCsv('a;b\n"escola ""x"", anexo";2\n', ";");
    expect(linhas[1]).toEqual(['escola "x", anexo', "2"]);
  });

  it("aceita o formato legível do Catálogo de Escolas", () => {
    const csv = [
      "Escola;Código INEP;UF;Município;Dependência Administrativa;Localização;Etapas e Modalidade de Ensino Oferecidas;Endereço;Telefone",
      "ESCOLA MUNICIPAL JOSE ALVES;22012345;PI;Bertolínia;Municipal;Rural;Ensino Fundamental;RUA A, S/N;(89) 3000-0000",
    ].join("\n");
    const r = lerArquivoDeEscolas(csv);
    expect(r.erro).toBeNull();
    expect(r.escolas).toHaveLength(1);
    expect(r.escolas[0]).toMatchObject({
      codigoInep: "22012345",
      nome: "ESCOLA MUNICIPAL JOSE ALVES",
      dependencia: "municipal",
      localizacao: "rural",
      uf: "PI",
      telefone: "(89) 3000-0000",
    });
  });

  it("aceita as siglas dos microdados do Censo", () => {
    const csv = ["CO_ENTIDADE;NO_ENTIDADE;CO_MUNICIPIO;TP_DEPENDENCIA;TP_LOCALIZACAO;TP_SITUACAO_FUNCIONAMENTO;QT_MAT_BAS", "22012345;EM JOSE ALVES;2201150;3;2;1;187"].join("\n");
    const r = lerArquivoDeEscolas(csv);
    expect(r.escolas[0]).toMatchObject({
      dependencia: "municipal",
      localizacao: "rural",
      situacao: "ativa",
      matriculas: 187,
      codigoMunicipio: "2201150",
    });
  });

  it("recusa arquivo sem a coluna do nome, em vez de importar lixo", () => {
    const r = lerArquivoDeEscolas("colunaA;colunaB\n1;2");
    expect(r.erro).toMatch(/nome da escola/i);
    expect(r.escolas).toHaveLength(0);
  });

  it("pula linhas vazias e linhas sem nome", () => {
    const csv = "Escola;Código INEP\nEM A;1\n;2\n\nEM B;3\n";
    expect(lerArquivoDeEscolas(csv).escolas.map((e) => e.nome)).toEqual(["EM A", "EM B"]);
  });
});

describe("normalização dos códigos do INEP", () => {
  it("entende dependência por número e por texto", () => {
    expect(lerDependencia("1")).toBe("federal");
    expect(lerDependencia("2")).toBe("estadual");
    expect(lerDependencia("3")).toBe("municipal");
    expect(lerDependencia("4")).toBe("privada");
    expect(lerDependencia("Municipal")).toBe("municipal");
    expect(lerDependencia("Particular")).toBe("privada");
    expect(lerDependencia("")).toBeNull();
  });

  it("entende localização e situação", () => {
    expect(lerLocalizacao("2")).toBe("rural");
    expect(lerLocalizacao("Urbana")).toBe("urbana");
    expect(lerSituacao("1")).toBe("ativa");
    expect(lerSituacao("Em Atividade")).toBe("ativa");
    expect(lerSituacao("4")).toBe("extinta");
  });
});

describe("o que é do município", () => {
  const base = { codigoInep: null, nome: "EM A", municipio: "Bertolínia", uf: "PI", dependencia: null, localizacao: null, situacao: null, endereco: null, telefone: null, etapas: null, porte: null, matriculas: null, latitude: null, longitude: null };

  it("compara pelos 6 primeiros dígitos — o arquivo às vezes vem sem o verificador", () => {
    expect(doMunicipio({ ...base, codigoMunicipio: "2201150" }, "2201150")).toBe(true);
    expect(doMunicipio({ ...base, codigoMunicipio: "220115" }, "2201150")).toBe(true);
    expect(doMunicipio({ ...base, codigoMunicipio: "3550308" }, "2201150")).toBe(false);
  });

  it("cai no nome quando não há código, ignorando acento e caixa", () => {
    expect(doMunicipio({ ...base, codigoMunicipio: null, municipio: "BERTOLINIA" }, null, "Bertolínia")).toBe(true);
    expect(doMunicipio({ ...base, codigoMunicipio: null, municipio: "Teresina" }, null, "Bertolínia")).toBe(false);
  });

  it("escola extinta não entra na rede; paralisada entra", () => {
    expect(entraNaRede({ ...base, codigoMunicipio: null, situacao: "extinta" })).toBe(false);
    expect(entraNaRede({ ...base, codigoMunicipio: null, situacao: "paralisada" })).toBe(true);
  });
});

describe("idade do cadastro do Censo", () => {
  it("um ano de atraso ainda passa; dois não", () => {
    const hoje = new Date("2026-09-22T12:00:00Z");
    expect(censoVelho(2025, hoje)).toBe(false);
    expect(censoVelho(2024, hoje)).toBe(true);
    expect(censoVelho(null, hoje)).toBe(false);
  });

  it("até novembro o Censo mais novo disponível é o do ano anterior", () => {
    expect(censoMaisRecenteDisponivel(new Date("2026-09-22T12:00:00Z"))).toBe(2025);
    expect(censoMaisRecenteDisponivel(new Date("2026-11-30T12:00:00Z"))).toBe(2026);
  });
});

describe("encoding", () => {
  it("lê UTF-8 sem estragar acento", () => {
    const bytes = new TextEncoder().encode("Escola São João").buffer as ArrayBuffer;
    expect(decodificarArquivo(bytes)).toBe("Escola São João");
  });

  it("cai para windows-1252 quando o UTF-8 não serve", () => {
    // "São" em Windows-1252: 0xE3 no lugar de "ã".
    const bytes = new Uint8Array([0x53, 0xe3, 0x6f]).buffer;
    expect(decodificarArquivo(bytes)).toBe("São");
  });
});
