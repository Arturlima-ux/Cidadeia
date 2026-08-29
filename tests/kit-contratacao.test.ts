import { describe, it, expect } from "vitest";
import {
  DOCUMENTOS,
  CAMPOS_A_PREENCHER,
  documentoPorChave,
  marcadoresDe,
  textoCorrido,
} from "@/lib/kit-contratacao";

const GERAMOS = DOCUMENTOS.filter((d) => d.geramos);
const NAO_GERAMOS = DOCUMENTOS.filter((d) => !d.geramos);

describe("catálogo do kit", () => {
  it("não tem chave repetida", () => {
    const chaves = DOCUMENTOS.map((d) => d.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("usa chave própria para URL, sem acento nem espaço", () => {
    for (const d of DOCUMENTOS) expect(d.chave).toMatch(/^[a-z0-9-]+$/);
  });

  it("resolve chave conhecida e rejeita desconhecida", () => {
    expect(documentoPorChave("minuta-de-contrato")?.nome).toBe("Minuta de contrato");
    expect(documentoPorChave("../../etc/passwd")).toBeNull();
    expect(documentoPorChave("")).toBeNull();
  });

  it("todo documento tem nome, resumo e ao menos uma cláusula", () => {
    for (const d of DOCUMENTOS) {
      expect(d.nome.length).toBeGreaterThan(0);
      expect(d.resumo.length).toBeGreaterThan(0);
      expect(d.clausulas.length).toBeGreaterThan(0);
    }
  });
});

describe("documentos que a gente NÃO emite", () => {
  it("declaram a origem, para a prefeitura não esperar por eles", () => {
    // Descobrir tarde que a certidão vem da Receita atrasa o processo.
    expect(NAO_GERAMOS.length).toBeGreaterThan(0);
    for (const d of NAO_GERAMOS) {
      expect(d.origem, `${d.nome} precisa dizer de onde vem`).toBeTruthy();
      expect(d.origem!.length).toBeGreaterThan(20);
    }
  });

  it("incluem as certidões e o atestado de capacidade técnica", () => {
    const chaves = NAO_GERAMOS.map((d) => d.chave);
    expect(chaves).toContain("certidoes-de-regularidade");
    expect(chaves).toContain("atestado-de-capacidade-tecnica");
  });
});

describe("modelos que a gente emite", () => {
  it("cobrem as quatro peças que instruem o processo", () => {
    const chaves = GERAMOS.map((d) => d.chave);
    expect(chaves).toContain("termo-de-referencia");
    expect(chaves).toContain("minuta-de-contrato");
    expect(chaves).toContain("acordo-de-tratamento-de-dados");
    expect(chaves).toContain("acordo-de-nivel-de-servico");
  });

  it("todos avisam que são modelo e precisam de revisão jurídica", () => {
    // Um modelo publicado sem essa ressalva vira peça "pronta para assinar"
    // na cabeça de quem baixa.
    for (const d of GERAMOS) {
      const texto = textoCorrido(d).toLowerCase();
      expect(texto, `${d.nome} sem aviso jurídico`).toContain("modelo");
      expect(texto, `${d.nome} sem menção à assessoria jurídica`).toContain("jurídica");
    }
  });

  it("citam a base legal que sustenta a contratação", () => {
    const tudo = GERAMOS.map(textoCorrido).join("\n");
    expect(tudo).toContain("14.133");
    expect(tudo).toContain("13.709");
    expect(tudo).toContain("13.460");
    expect(tudo).toContain("12.527");
  });
});

describe("campos a preencher", () => {
  it("todo marcador usado nos modelos está catalogado ou é do município", () => {
    // Sem isso, um "[CNPJ]" novo entra numa cláusula e vai para a prefeitura
    // em branco, sem aparecer na lista de pendências da tela.
    const catalogados = new Set<string>(CAMPOS_A_PREENCHER.map((c) => c.marcador));
    // Preenchidos pela própria prefeitura ao adaptar o modelo.
    const doMunicipio = new Set([
      "[MUNICÍPIO]",
      "[CNPJ DO MUNICÍPIO]",
      "[AUTORIDADE]",
      "[DIA]",
      "[ÍNDICE]",
      "[PRAZO]",
      "[PRAZO DE AVISO]",
      "[PRAZO DE INCIDENTE]",
      "[DESCONTO]",
      "[COLCHETES]",
    ]);

    const desconhecidos: string[] = [];
    for (const d of GERAMOS) {
      for (const marcador of marcadoresDe(d)) {
        if (!catalogados.has(marcador) && !doMunicipio.has(marcador)) {
          desconhecidos.push(`${d.chave}: ${marcador}`);
        }
      }
    }
    expect(desconhecidos).toEqual([]);
  });

  it("todo campo catalogado tem descrição útil", () => {
    for (const campo of CAMPOS_A_PREENCHER) {
      expect(campo.marcador).toMatch(/^\[.+\]$/);
      expect(campo.descricao.length).toBeGreaterThan(10);
    }
  });

  it("não catalogou campo que nenhum documento usa", () => {
    // Lista de pendências com item fantasma faz a pessoa procurar no arquivo
    // um campo que não existe.
    const usados = new Set(GERAMOS.flatMap(marcadoresDe));
    const orfaos = CAMPOS_A_PREENCHER.filter((c) => !usados.has(c.marcador)).map((c) => c.marcador);
    expect(orfaos).toEqual([]);
  });
});

describe("conteúdo que sustenta as promessas da home", () => {
  it("o contrato garante a saída dos dados sem depender de estar adimplente", () => {
    const contrato = textoCorrido(documentoPorChave("minuta-de-contrato")!);
    expect(contrato).toContain("formato aberto");
    expect(contrato).toContain("sem custo adicional");
    expect(contrato.toLowerCase()).toContain("independe de anuência");
  });

  it("o contrato diz que troca de gestão não extingue o contrato", () => {
    const contrato = textoCorrido(documentoPorChave("minuta-de-contrato")!);
    expect(contrato.toLowerCase()).toContain("alternância de gestão");
  });

  it("o acordo de dados protege o anonimato inclusive nas exportações", () => {
    const dpa = textoCorrido(documentoPorChave("acordo-de-tratamento-de-dados")!);
    expect(dpa.toLowerCase()).toContain("anônima");
    expect(dpa.toLowerCase()).toContain("não sequencial");
    expect(dpa.toLowerCase()).toContain("exportações");
  });

  it("o acordo de dados nega uso dos dados para treinar modelos", () => {
    const dpa = textoCorrido(documentoPorChave("acordo-de-tratamento-de-dados")!);
    expect(dpa.toLowerCase()).toContain("treinar modelos");
  });

  it("o termo de referência repete a regra de que a IA não inventa número", () => {
    const tr = textoCorrido(documentoPorChave("termo-de-referencia")!);
    expect(tr.toLowerCase()).toContain("aprovação humana");
    expect(tr.toLowerCase()).toContain("na ausência do dado");
  });

  it("o nível de serviço deixa disponibilidade e prazos em branco", () => {
    // São compromissos operacionais: prometer no papel o que a operação não
    // sustenta cria inadimplemento, não credibilidade.
    const sla = textoCorrido(documentoPorChave("acordo-de-nivel-de-servico")!);
    expect(sla).toContain("[DISPONIBILIDADE]");
    expect(sla).toContain("[PRAZO]");
  });
});
