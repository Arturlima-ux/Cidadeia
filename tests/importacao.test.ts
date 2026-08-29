import { describe, it, expect } from "vitest";
import {
  analisarCsv,
  detectarSeparador,
  normalizarCabecalho,
  sugerirMapeamento,
  converterNumero,
  converterCompetencia,
  converterEnum,
  prepararImportacao,
  tabelaImportavel,
  TABELAS_IMPORTAVEIS,
} from "@/lib/importacao";

const OBRAS = tabelaImportavel("obras")!;
const INVESTIMENTOS = tabelaImportavel("investimentos")!;

describe("separador do CSV", () => {
  it("reconhece o ponto e vírgula que o Excel em português usa", () => {
    // Adivinhar errado transforma a planilha inteira numa coluna só.
    expect(detectarSeparador("nome;bairro;valor")).toBe(";");
    expect(detectarSeparador("nome,bairro,valor")).toBe(",");
  });

  it("ignora separadores que estão dentro de aspas", () => {
    expect(detectarSeparador('"Rua A, 100";bairro;valor')).toBe(";");
  });

  it("assume vírgula quando não há separador nenhum", () => {
    expect(detectarSeparador("nome")).toBe(",");
  });
});

describe("leitura do CSV", () => {
  it("separa cabeçalho e linhas", () => {
    const lido = analisarCsv("nome,bairro\nEscola A,Centro\nEscola B,Norte");
    expect(lido.cabecalhos).toEqual(["nome", "bairro"]);
    expect(lido.linhas).toHaveLength(2);
    expect(lido.linhas[1]).toEqual(["Escola B", "Norte"]);
  });

  it("come o BOM que o Excel escreve no começo do arquivo", () => {
    // Sem isso o primeiro cabeçalho vira "﻿nome" e nunca casa com nada.
    const lido = analisarCsv("﻿nome,bairro\nEscola A,Centro");
    expect(lido.cabecalhos[0]).toBe("nome");
  });

  it("aceita campo com o separador dentro das aspas", () => {
    const lido = analisarCsv('nome,endereco\n"Escola A","Rua X, 100"');
    expect(lido.linhas[0]).toEqual(["Escola A", "Rua X, 100"]);
  });

  it("aceita quebra de linha dentro das aspas", () => {
    const lido = analisarCsv('nome,obs\n"Escola A","linha 1\nlinha 2"');
    expect(lido.linhas).toHaveLength(1);
    expect(lido.linhas[0][1]).toBe("linha 1\nlinha 2");
  });

  it("entende aspas duplicadas como aspas literal", () => {
    const lido = analisarCsv('nome\n"obra ""emergencial"""');
    expect(lido.linhas[0][0]).toBe('obra "emergencial"');
  });

  it("aceita CRLF do Windows", () => {
    const lido = analisarCsv("nome,bairro\r\nEscola A,Centro\r\n");
    expect(lido.linhas).toHaveLength(1);
    expect(lido.linhas[0]).toEqual(["Escola A", "Centro"]);
  });

  it("descarta linha totalmente vazia, inclusive a última", () => {
    // A linha em branco no fim é o defeito mais comum em planilha exportada.
    const lido = analisarCsv("nome\nEscola A\n\n\n");
    expect(lido.linhas).toHaveLength(1);
  });

  it("devolve vazio para arquivo em branco", () => {
    expect(analisarCsv("   ").cabecalhos).toEqual([]);
    expect(analisarCsv("").linhas).toEqual([]);
  });
});

describe("mapeamento de colunas", () => {
  it("normaliza acento, caixa e pontuação do cabeçalho", () => {
    expect(normalizarCabecalho("  Situação Atual ")).toBe("situacao atual");
    expect(normalizarCabecalho("VALOR (R$)")).toBe("valor r");
  });

  it("casa cabeçalho igual ao nosso campo", () => {
    const mapa = sugerirMapeamento(["nome", "bairro", "status"], OBRAS);
    expect(mapa.nome).toBe(0);
    expect(mapa.bairro).toBe(1);
    expect(mapa.status).toBe(2);
  });

  it("casa pelos sinônimos que aparecem em planilha de prefeitura", () => {
    const mapa = sugerirMapeamento(["Objeto", "Local", "Situação", "Valor contratado"], OBRAS);
    expect(mapa.nome).toBe(0);
    expect(mapa.bairro).toBe(1);
    expect(mapa.status).toBe(2);
    expect(mapa.valorContrato).toBe(3);
  });

  it("nunca aponta duas colunas nossas para a mesma coluna da planilha", () => {
    const mapa = sugerirMapeamento(["valor", "valor"], OBRAS);
    const usadas = Object.values(mapa).filter((i) => i !== null);
    expect(new Set(usadas).size).toBe(usadas.length);
  });

  it("deixa null o campo que não existe na planilha", () => {
    const mapa = sugerirMapeamento(["nome"], OBRAS);
    expect(mapa.nome).toBe(0);
    expect(mapa.valorContrato).toBeNull();
  });
});

describe("número em formato de planilha", () => {
  it("lê o formato brasileiro", () => {
    expect(converterNumero("1.234,56")).toBe(1234.56);
    expect(converterNumero("1.234.567,89")).toBe(1234567.89);
    expect(converterNumero("0,45")).toBe(0.45);
  });

  it("lê o formato americano", () => {
    expect(converterNumero("1,234.56")).toBe(1234.56);
  });

  it("limpa símbolo de moeda, porcentagem e espaço", () => {
    expect(converterNumero("R$ 1.500,00")).toBe(1500);
    expect(converterNumero("45%")).toBe(45);
    expect(converterNumero(" 12 ")).toBe(12);
  });

  it("trata ponto com três casas como separador de milhar", () => {
    // "1.234" numa exportação brasileira é mil duzentos e trinta e quatro.
    expect(converterNumero("1.234")).toBe(1234);
    expect(converterNumero("12.500")).toBe(12500);
  });

  it("trata ponto com poucas casas como decimal", () => {
    expect(converterNumero("1.5")).toBe(1.5);
    expect(converterNumero("0.750")).toBe(0.75);
  });

  it("entende negativo com sinal e entre parênteses", () => {
    expect(converterNumero("-45,5")).toBe(-45.5);
    expect(converterNumero("(1.200,00)")).toBe(-1200);
  });

  it("recusa o que não é número em vez de virar NaN", () => {
    // NaN gravado no banco é pior que uma linha recusada com aviso.
    expect(converterNumero("não informado")).toBeNull();
    expect(converterNumero("")).toBeNull();
    expect(converterNumero("12abc")).toBeNull();
    expect(converterNumero("-")).toBeNull();
  });
});

describe("competência", () => {
  it("aceita os formatos que aparecem na prática", () => {
    expect(converterCompetencia("2026-08")).toBe("2026-08");
    expect(converterCompetencia("2026/8")).toBe("2026-08");
    expect(converterCompetencia("08/2026")).toBe("2026-08");
    expect(converterCompetencia("2026-08-15")).toBe("2026-08");
    expect(converterCompetencia("ago/2026")).toBe("2026-08");
    expect(converterCompetencia("agosto 2026")).toBe("2026-08");
  });

  it("recusa mês impossível e texto solto", () => {
    expect(converterCompetencia("13/2026")).toBeNull();
    expect(converterCompetencia("mês passado")).toBeNull();
    expect(converterCompetencia("")).toBeNull();
  });
});

describe("enum", () => {
  const OPCOES = ["planejada", "em_andamento", "atrasada", "concluida", "paralisada"];

  it("casa ignorando acento, caixa e underscore", () => {
    expect(converterEnum("Em andamento", OPCOES)).toBe("em_andamento");
    expect(converterEnum("CONCLUÍDA", OPCOES)).toBe("concluida");
    expect(converterEnum("em_andamento", OPCOES)).toBe("em_andamento");
  });

  it("recusa valor fora da lista em vez de inventar", () => {
    expect(converterEnum("em licitação", OPCOES)).toBeNull();
    expect(converterEnum("", OPCOES)).toBeNull();
  });
});

describe("preparação da importação", () => {
  it("converte uma planilha brasileira inteira", () => {
    const csv = [
      "Obra;Local;Execução;Previsto;Valor contratado;Situação",
      "Reforma da UBS Norte;Centro;35%;50%;R$ 1.250.000,00;Em andamento",
      "Praça do Bairro Sul;Sul;100%;100%;R$ 89.400,50;Concluída",
    ].join("\n");

    const r = prepararImportacao({ tabela: OBRAS, texto: csv });

    expect(r.separador).toBe(";");
    expect(r.camposFaltando).toEqual([]);
    expect(r.erros).toEqual([]);
    expect(r.linhas).toHaveLength(2);
    expect(r.linhas[0]).toEqual({
      nome: "Reforma da UBS Norte",
      bairro: "Centro",
      progressoAtual: 35,
      progressoEsperado: 50,
      valorContrato: 1250000,
      status: "em_andamento",
    });
    expect(r.linhas[1].valorContrato).toBe(89400.5);
  });

  it("aponta a linha ruim pelo número que a pessoa vê no Excel", () => {
    // Cabeçalho é a linha 1, então o primeiro registro é a linha 2.
    const csv = "Obra;Valor contratado\nObra A;abc";
    const r = prepararImportacao({ tabela: OBRAS, texto: csv });
    expect(r.erros[0].linha).toBe(2);
    expect(r.erros[0].campo).toBe("Valor do contrato");
  });

  it("uma linha ruim não derruba as outras", () => {
    // A prefeitura corrige três linhas, não refaz a planilha inteira.
    const csv = ["Obra;Valor contratado", "Obra A;1.000,00", "Obra B;xxx", "Obra C;2.000,00"].join("\n");
    const r = prepararImportacao({ tabela: OBRAS, texto: csv });
    expect(r.totalLidas).toBe(3);
    expect(r.linhas).toHaveLength(3); // valor é opcional: as três entram
    expect(r.erros).toHaveLength(1);
    expect(r.linhas[1]).not.toHaveProperty("valorContrato");
  });

  it("descarta a linha quando o campo obrigatório está vazio", () => {
    const csv = "Obra;Local\n;Centro\nObra B;Sul";
    const r = prepararImportacao({ tabela: OBRAS, texto: csv });
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].nome).toBe("Obra B");
    expect(r.erros[0].motivo).toContain("obrigatório");
  });

  it("avisa qual campo obrigatório não tem coluna, em vez de importar torto", () => {
    const csv = "Local;Situação\nCentro;Concluída";
    const r = prepararImportacao({ tabela: OBRAS, texto: csv });
    expect(r.camposFaltando).toContain("Nome");
    expect(r.linhas).toHaveLength(0);
  });

  it("lista as colunas da planilha que ninguém vai usar", () => {
    // Sem isso a prefeitura acha que importou um dado que ficou pra trás.
    const csv = "Obra;CPF do fiscal;Observação interna\nObra A;123;bla";
    const r = prepararImportacao({ tabela: OBRAS, texto: csv });
    expect(r.colunasIgnoradas).toContain("CPF do fiscal");
    expect(r.colunasIgnoradas).toContain("Observação interna");
  });

  it("aceita mapeamento corrigido à mão, ignorando a sugestão", () => {
    const csv = "coluna A;coluna B\nObra X;Centro";
    const r = prepararImportacao({
      tabela: OBRAS,
      texto: csv,
      mapeamento: { nome: 0, bairro: 1, progressoAtual: null, progressoEsperado: null, valorContrato: null, status: null },
    });
    expect(r.linhas[0]).toEqual({ nome: "Obra X", bairro: "Centro" });
  });

  it("converte percentual escrito como fração decimal", () => {
    const csv = "Obra;Execução\nObra A;0,35";
    const r = prepararImportacao({ tabela: OBRAS, texto: csv });
    expect(r.linhas[0].progressoAtual).toBe(35);
  });

  it("importa investimentos com competência em vários formatos", () => {
    const csv = [
      "Área,Valor,Mês de referência,Histórico",
      "Saúde,\"R$ 12.500,00\",08/2026,Custeio UBS",
      "Educação,3000,2026-07,Transporte escolar",
    ].join("\n");

    const r = prepararImportacao({ tabela: INVESTIMENTOS, texto: csv });
    expect(r.erros).toEqual([]);
    expect(r.linhas[0]).toEqual({
      secretaria: "saude",
      valor: 12500,
      competencia: "2026-08",
      descricao: "Custeio UBS",
    });
    expect(r.linhas[1].competencia).toBe("2026-07");
  });

  it("arquivo vazio não gera erro nem linha", () => {
    const r = prepararImportacao({ tabela: OBRAS, texto: "" });
    expect(r.linhas).toEqual([]);
    expect(r.totalLidas).toBe(0);
  });

  it("nenhuma tabela importável aceita prefeituraId vindo do arquivo", () => {
    // O município do dado é sempre o da sessão. Se um campo desses existisse
    // aqui, uma planilha poderia gravar dado na prefeitura de outro cliente.
    for (const tabela of TABELAS_IMPORTAVEIS) {
      const chaves = tabela.campos.map((c) => c.chave);
      expect(chaves).not.toContain("prefeituraId");
      expect(chaves).not.toContain("id");
    }
  });
});
