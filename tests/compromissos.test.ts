import { describe, it, expect } from "vitest";
import {
  COMPROMISSOS,
  HOSPEDAGEM,
  PRAZO_INCIDENTE,
  preencherCompromissos,
  valoresDefinidos,
  pendentesDeDecisao,
  compromissoDe,
} from "@/lib/compromissos";
import {
  CAMPOS_A_PREENCHER,
  DOCUMENTOS,
  documentoPreenchido,
  marcadoresDe,
  textoCorrido,
} from "@/lib/kit-contratacao";

describe("o que é fato vem apurado", () => {
  it("a hospedagem diz as duas camadas, porque as duas importam para a LGPD", () => {
    // Dado em repouso no Brasil mas processado fora é transferência
    // internacional (art. 33). Dizer só onde fica o banco seria meia verdade.
    expect(HOSPEDAGEM).toMatch(/sa-east-1/);
    expect(HOSPEDAGEM).toMatch(/gru1/);
    expect(HOSPEDAGEM).toMatch(/banco de dados/);
    expect(HOSPEDAGEM).toMatch(/aplicação/);
  });

  it("a hospedagem é conferível, não declarada", () => {
    const c = compromissoDe("[HOSPEDAGEM]")!;
    expect(c.origem).toBe("apurado");
    // O fundamento tem de dizer ONDE conferir, não só afirmar.
    expect(c.fundamento).toMatch(/pooler|X-Vercel-Id/);
  });
});

describe("o que a lei determina vem deduzido", () => {
  it("o prazo da operadora cabe dentro do prazo do controlador", () => {
    // O município tem 3 dias úteis para comunicar a ANPD (art. 48 da LGPD e
    // Resolução CD/ANPD nº 15/2024). Se a operadora avisasse em 3 dias úteis,
    // o município perderia o prazo dele no mesmo instante — o relógio dele só
    // começa quando ele sabe.
    expect(PRAZO_INCIDENTE).toMatch(/24/);
    expect(PRAZO_INCIDENTE).toMatch(/horas/);
  });

  it("o fundamento cita a norma, para o jurídico conferir", () => {
    const c = compromissoDe("[PRAZO DE INCIDENTE]")!;
    expect(c.origem).toBe("deduzido");
    expect(c.fundamento).toMatch(/art\. 48/);
    expect(c.fundamento).toMatch(/ANPD/);
    expect(c.fundamento).toMatch(/3 dias úteis/);
  });
});

describe("o que é decisão de negócio fica em branco", () => {
  // ── A REGRA QUE SUSTENTA O RESTO ──
  //
  // Preencher sozinho um compromisso de serviço seria inventar promessa em
  // nome de quem vai responder por ela — e é exatamente o que este produto se
  // recusa a fazer com qualquer número.

  it("disponibilidade e desconto não têm valor padrão", () => {
    expect(compromissoDe("[DISPONIBILIDADE]")!.valor).toBeNull();
    expect(compromissoDe("[DESCONTO]")!.valor).toBeNull();
  });

  it("a disponibilidade avisa que o fornecedor não garante nada", () => {
    // O Supabase não oferece SLA de disponibilidade nos planos Free, Pro ou
    // Team. Prometer percentual é assumir sozinho um risco que o fornecedor
    // não cobre, com multa atrelada.
    const c = compromissoDe("[DISPONIBILIDADE]")!;
    expect(c.fundamento).toMatch(/Supabase/);
    expect(c.fundamento).toMatch(/não oferece SLA|sem SLA/i);
  });

  it("nenhum prazo de atendimento vem inventado", () => {
    for (const m of [
      "[RESPOSTA CRÍTICA]",
      "[SOLUÇÃO CRÍTICA]",
      "[RESPOSTA ALTA]",
      "[SOLUÇÃO ALTA]",
      "[RESPOSTA MÉDIA]",
      "[SOLUÇÃO MÉDIA]",
      "[RESPOSTA BAIXA]",
      "[PRAZO DE DEVOLUÇÃO]",
    ]) {
      expect(compromissoDe(m), `${m} não está no catálogo`).toBeDefined();
      expect(compromissoDe(m)!.valor, `${m} veio preenchido sozinho`).toBeNull();
    }
  });

  it("todo compromisso tem fundamento escrito", () => {
    for (const c of COMPROMISSOS) {
      expect(c.fundamento.length, `${c.marcador} sem fundamento`).toBeGreaterThan(30);
    }
  });
});

describe("o preenchimento não inventa nem apaga", () => {
  it("troca o que tem valor e deixa o que não tem", () => {
    const texto = "Hospedado em [HOSPEDAGEM], com disponibilidade de [DISPONIBILIDADE].";
    const saida = preencherCompromissos(texto);
    expect(saida).not.toContain("[HOSPEDAGEM]");
    expect(saida).toContain("sa-east-1");
    // O que ninguém decidiu continua visível como pendência.
    expect(saida).toContain("[DISPONIBILIDADE]");
  });

  it("troca todas as ocorrências, não só a primeira", () => {
    const saida = preencherCompromissos("[PRAZO DE INCIDENTE] e depois [PRAZO DE INCIDENTE]");
    expect(saida).not.toContain("[PRAZO DE INCIDENTE]");
  });

  it("texto sem marcador nenhum sai igual", () => {
    const t = "Cláusula sem campo a preencher.";
    expect(preencherCompromissos(t)).toBe(t);
  });

  it("a fonte continua crua, e é sobre ela que a cobertura é conferida", () => {
    // Se o preenchimento acontecesse na fonte, um marcador preenchido sumiria
    // dela e deixaria de ser verificado pelo teste de cobertura.
    const dpa = DOCUMENTOS.find((d) => d.chave === "acordo-de-tratamento-de-dados")!;
    expect(textoCorrido(dpa)).toContain("[HOSPEDAGEM]");
    expect(textoCorrido(documentoPreenchido(dpa))).not.toContain("[HOSPEDAGEM]");
  });
});

describe("o kit e o catálogo não divergem", () => {
  it("todo compromisso é um campo que o kit conhece", () => {
    const catalogados = new Set(CAMPOS_A_PREENCHER.map((c) => c.marcador));
    for (const c of COMPROMISSOS) {
      expect(catalogados, `${c.marcador} não está em CAMPOS_A_PREENCHER`).toContain(c.marcador);
    }
  });

  it("todo compromisso aparece em algum documento que geramos", () => {
    // Compromisso que não aparece em documento nenhum é decisão pedida à toa.
    const usados = new Set(DOCUMENTOS.filter((d) => d.geramos).flatMap(marcadoresDe));
    for (const c of COMPROMISSOS) {
      expect(usados, `${c.marcador} não é usado por nenhum documento`).toContain(c.marcador);
    }
  });

  it("o que foi preenchido sai da lista de pendências do documento", () => {
    const dpa = DOCUMENTOS.find((d) => d.chave === "acordo-de-tratamento-de-dados")!;
    const antes = marcadoresDe(dpa);
    const depois = marcadoresDe(documentoPreenchido(dpa));
    expect(antes).toContain("[HOSPEDAGEM]");
    expect(depois).not.toContain("[HOSPEDAGEM]");
    // E nada mais sumiu junto.
    const sumiram = antes.filter((m) => !depois.includes(m));
    for (const m of sumiram) expect(valoresDefinidos().has(m)).toBe(true);
  });

  it("as pendências de decisão são as que não têm valor", () => {
    const pendentes = pendentesDeDecisao().map((c) => c.marcador);
    expect(pendentes).toContain("[DISPONIBILIDADE]");
    expect(pendentes).not.toContain("[HOSPEDAGEM]");
    expect(pendentes).not.toContain("[PRAZO DE INCIDENTE]");
  });
});
