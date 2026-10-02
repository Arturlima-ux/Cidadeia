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
    // A unidade NÃO vem no valor: a cláusula já diz "em até [...] horas".
    expect(PRAZO_INCIDENTE).not.toMatch(/horas/);
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

  it("todo prazo de atendimento tem valor E o porquê dele", () => {
    // Os prazos foram decididos e vêm preenchidos. O que não pode acontecer é
    // um número aparecer sem o raciocínio que o sustenta: quem for revisar
    // precisa poder discordar com base em alguma coisa.
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
      const c = compromissoDe(m);
      expect(c, `${m} não está no catálogo`).toBeDefined();
      expect(c!.valor, `${m} sem valor`).not.toBeNull();
      // O fundamento precisa citar o próprio número, senão não explica ele.
      expect(c!.fundamento, `${m}: o fundamento não cita o valor`).toContain(c!.valor!);
    }
  });

  it("nenhum prazo promete o que uma pessoa só não cumpre", () => {
    // A régua foi prometer o que se cumpre num dia ruim. Primeira resposta em
    // menos de 4 horas úteis exigiria plantão, e plantão prometido e não
    // cumprido é sanção em contrato administrativo, não desculpa.
    expect(Number(compromissoDe("[RESPOSTA CRÍTICA]")!.valor)).toBeGreaterThanOrEqual(4);
    // E a solução nunca é mais rápida que a primeira resposta.
    const pares: [string, string][] = [
      ["[RESPOSTA CRÍTICA]", "[SOLUÇÃO CRÍTICA]"],
      ["[RESPOSTA ALTA]", "[SOLUÇÃO ALTA]"],
    ];
    for (const [resposta, solucao] of pares) {
      expect(Number(compromissoDe(solucao)!.valor)).toBeGreaterThanOrEqual(
        Number(compromissoDe(resposta)!.valor)
      );
    }
  });

  it("o documento diz o que conta como solução", () => {
    // Sem isso, "solução em 8 horas úteis" obrigaria a achar a causa raiz
    // dentro do prazo — descumprimento mesmo com o serviço já funcionando.
    const sla = textoCorrido(DOCUMENTOS.find((d) => d.chave === "acordo-de-nivel-de-servico")!);
    expect(sla).toMatch(/contorno/);
    expect(sla).toMatch(/operação é restabelecida/);
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

  it("o percentual de disponibilidade não é pendência: é decisão de não prometer", () => {
    // Ele fica NULL porque a cláusula foi reescrita, e não porque alguém
    // esqueceu. Cobrá-lo numa lista de pendências faria a lista nunca zerar —
    // e lista que nunca zera é lista que se aprende a ignorar.
    const pendentes = pendentesDeDecisao().map((c) => c.marcador);
    expect(pendentes).not.toContain("[DISPONIBILIDADE]");
    expect(pendentes).not.toContain("[DESCONTO]");
    expect(pendentes).not.toContain("[HOSPEDAGEM]");
    expect(pendentes).not.toContain("[PRAZO DE INCIDENTE]");

    // Com todos os prazos decididos, a ÚNICA pendência que pode sobrar é o
    // endereço da página de disponibilidade — e só quando APP_URL não está
    // configurada, como acontece no ambiente de teste. É de propósito: uma
    // minuta que manda o jurídico da prefeitura abrir "localhost" é pior que
    // uma com o campo visivelmente em branco.
    expect(pendentes.filter((m) => m !== "[PÁGINA DE DISPONIBILIDADE]")).toEqual([]);
  });

  it("o endereço da disponibilidade não cai em localhost", () => {
    const c = compromissoDe("[PÁGINA DE DISPONIBILIDADE]")!;
    if (c.valor !== null) {
      expect(c.valor).toMatch(/^https:\/\//);
      expect(c.valor).not.toMatch(/localhost|127\.0\.0\.1/);
      expect(c.valor).toContain("/disponibilidade");
    }
  });

  it("os condicionais continuam no documento, para o dia em que um edital exigir", () => {
    // Edital de pregão às vezes exige percentual contratual de
    // disponibilidade. Remover os marcadores tiraria a opção; mantê-los numa
    // cláusula condicional preserva as duas saídas.
    const sla = textoCorrido(DOCUMENTOS.find((d) => d.chave === "acordo-de-nivel-de-servico")!);
    expect(sla).toContain("[DISPONIBILIDADE]");
    expect(sla).toContain("[DESCONTO]");
    expect(sla).toMatch(/Quando o edital.*exigir/);
  });

  it("o regime padrão promete o que a operação controla", () => {
    const sla = textoCorrido(DOCUMENTOS.find((d) => d.chave === "acordo-de-nivel-de-servico")!);
    // Medir, publicar, avisar e deixar sair.
    expect(sla).toMatch(/verifica diariamente/);
    expect(sla).toMatch(/acesso público e sem cadastro/);
    // E a cláusula diz ONDE: promessa de publicação sem endereço é promessa
    // que o fiscal do contrato não consegue exercer.
    expect(sla).toMatch(/\[PÁGINA DE DISPONIBILIDADE\]|https:\/\//);
    expect(sla).toMatch(/comunicará a contratante sempre que/);
    expect(sla).toMatch(/sem multa, sem aviso prévio e sem qualquer ônus/);
  });

  it("o documento explica por que não há percentual, em vez de omitir", () => {
    // O silêncio pareceria esquecimento. A explicação transforma a ausência
    // em argumento.
    const sla = textoCorrido(DOCUMENTOS.find((d) => d.chave === "acordo-de-nivel-de-servico")!);
    expect(sla).toMatch(/não é afirmado por escolha, e não por esquecimento/);
    expect(sla).toMatch(/risco disfarçado de garantia/);
  });
});

describe("a unidade não pode sair dobrada", () => {
  // ── O DEFEITO QUE ISTO IMPEDE, E QUE CHEGOU A PRODUÇÃO ──
  //
  // O primeiro valor do prazo de incidente foi "24 (vinte e quatro) horas", e a
  // cláusula já dizia "em até [PRAZO DE INCIDENTE] horas da ciência". O
  // documento saiu com "em até 24 (vinte e quatro) horas horas da ciência" — e
  // é esse texto que vai ao jurídico da prefeitura.
  //
  // A convenção é: a unidade mora no DOCUMENTO e o valor é nu. A tabela de
  // severidade diz "[RESPOSTA CRÍTICA] horas úteis", o prazo de devolução diz
  // "em até [PRAZO DE DEVOLUÇÃO] dias". Se o valor trouxesse a unidade, todos
  // dobrariam do mesmo jeito.

  it("nenhum valor definido termina com a unidade que a cláusula já tem", () => {
    for (const c of COMPROMISSOS) {
      if (!c.valor) continue;
      expect(c.valor, `${c.marcador} repete a unidade`).not.toMatch(
        /\b(horas?|dias?|dias úteis|horas úteis)\s*$/i
      );
    }
  });

  it("nenhum documento preenchido tem palavra repetida em sequência", () => {
    // Pega a classe inteira, e não só o caso conhecido: qualquer valor que
    // duplique a palavra seguinte aparece aqui.
    for (const d of DOCUMENTOS) {
      const texto = textoCorrido(documentoPreenchido(d));
      // Só dentro da MESMA linha: textoCorrido junta blocos distintos com
      // quebra, e um cabeçalho "Severidade" logo abaixo de um título que
      // termina em "severidade" não é dobra nenhuma.
      const repetida = texto.match(/\b([a-zà-ú]{3,})[ \t]+\1\b/i);
      expect(repetida, `${d.chave}: "${repetida?.[0]}"`).toBeNull();
    }
  });

  it("vale também com os compromissos que ainda não foram decididos", () => {
    // Simula o dia em que todos estiverem preenchidos: a mesma dobra
    // aconteceria na tabela de severidade se alguém escrevesse "4 horas úteis"
    // na variável de ambiente em vez de "4".
    const exemplos: Record<string, string> = {
      "[DISPONIBILIDADE]": "99,5%",
      "[DESCONTO]": "5%",
      "[RESPOSTA CRÍTICA]": "4",
      "[SOLUÇÃO CRÍTICA]": "8",
      "[RESPOSTA ALTA]": "8",
      "[SOLUÇÃO ALTA]": "24",
      "[RESPOSTA MÉDIA]": "24",
      "[SOLUÇÃO MÉDIA]": "5",
      "[RESPOSTA BAIXA]": "3",
      "[PRAZO DE DEVOLUÇÃO]": "30",
    };
    for (const d of DOCUMENTOS) {
      let texto = textoCorrido(documentoPreenchido(d));
      for (const [m, v] of Object.entries(exemplos)) texto = texto.split(m).join(v);
      const repetida = texto.match(/\b([a-zà-ú]{3,})[ \t]+\1\b/i);
      expect(repetida, `${d.chave}: "${repetida?.[0]}"`).toBeNull();
    }
  });
});
