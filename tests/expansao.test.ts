import { describe, it, expect } from "vitest";
import { avaliarExpansao, modulosDisponiveis, resumoDoCaminho } from "@/lib/expansao";
import { LIMITE_DISPENSA } from "@/lib/contratacao";
import { PRECO_MENSAL, PORTES } from "@/lib/precos";
import { PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";

const TODOS = PLANOS_ADDON.map((p) => p.chave);

/** Anual direto da tabela — nunca número escrito à mão no teste. */
const anualDe = (modulo: PlanoAddon, porte: "ate10k" | "de10a50k" | "de50a100k") =>
  (PRECO_MENSAL[modulo][porte] ?? 0) * 12;

describe("a soma é do exercício, não do pedido", () => {
  // O art. 75, § 1º manda somar o gasto do exercício com objetos de mesma
  // natureza antes de enquadrar. Seis módulos do mesmo sistema, do mesmo
  // fornecedor, são o mesmo ramo de atividade — responder sobre o contrato
  // isolado seria responder uma pergunta que ninguém faz.

  it("o acumulado é tudo que está ativo mais o novo", () => {
    const e = avaliarExpansao({
      porte: "ate10k",
      jaContratados: ["essencial", "gestao"],
      novos: ["saude"],
    });
    expect(e.anualAtual).toBeCloseTo(anualDe("essencial", "ate10k") + anualDe("gestao", "ate10k"), 2);
    expect(e.anualNovo).toBeCloseTo(anualDe("saude", "ate10k"), 2);
    expect(e.anualAcumulado).toBeCloseTo(e.anualAtual + e.anualNovo, 2);
  });

  it("o caminho sai do acumulado, não do contrato novo", () => {
    const e = avaliarExpansao({ porte: "ate10k", jaContratados: TODOS.filter((c) => c !== "saude"), novos: ["saude"] });
    const sozinho = avaliarExpansao({ porte: "ate10k", jaContratados: [], novos: ["saude"] });
    expect(e.anualAcumulado).toBeGreaterThan(sozinho.anualAcumulado);
  });

  it("o anual é mensal vezes doze", () => {
    // Comparar o mensal com o limite anual seria o fracionamento que a lei veda.
    const e = avaliarExpansao({ porte: "ate10k", jaContratados: [], novos: ["saude"] });
    expect(e.anualNovo).toBeCloseTo(PRECO_MENSAL.saude.ate10k! * 12, 5);
  });

  it("o limite vem de LIMITE_DISPENSA, não de um número solto", () => {
    // O limite é reajustado por decreto todo ano; escrevê-lo à mão faria o
    // produto publicar informação errada sobre contratação pública em janeiro.
    const e = avaliarExpansao({ porte: "ate10k", jaContratados: [], novos: [] });
    expect(e.margem).toBeCloseTo(LIMITE_DISPENSA.valor, 5);
  });
});

describe("o risco que a tabela de preços já eliminou", () => {
  // ── O ERRO QUE EU IA COMETER ──
  //
  // Esta biblioteca nasceu para avisar que expandir módulo a módulo estouraria
  // o limite de dispensa no exercício. Não estoura: a tabela foi desenhada
  // para o pacote inteiro caber nas faixas com valor definido, e
  // tests/contratacao.test.ts trava a propriedade. O teste abaixo é a mesma
  // verdade vista do lado da expansão — se um dia quebrar, a tela aqui passa a
  // dizer "pregão" sozinha, sem ninguém precisar lembrar de mexer nela.

  it("em qualquer faixa com valor definido, acrescentar qualquer módulo cabe em dispensa", () => {
    for (const porte of PORTES.filter((p) => p.garanteDispensa)) {
      // Pior caso: tudo contratado menos um, e esse um sendo acrescentado.
      for (const alvo of TODOS) {
        const e = avaliarExpansao({
          porte: porte.chave,
          jaContratados: TODOS.filter((c) => c !== alvo),
          novos: [alvo],
        });
        expect(e.incompleta, `${porte.chave}/${alvo}`).toBe(false);
        expect(e.caminho, `${porte.chave}/${alvo}`).toBe("dispensa");
      }
    }
  });

  it("e sobra margem, em vez de passar raspando", () => {
    // Encostar no limite deixaria a promessa refém do primeiro reajuste.
    for (const porte of PORTES.filter((p) => p.garanteDispensa)) {
      const e = avaliarExpansao({ porte: porte.chave, jaContratados: TODOS, novos: [] });
      expect(e.margem, porte.chave).toBeGreaterThan(0);
    }
  });
});

describe("o módulo já contratado não é cobrado duas vezes", () => {
  it("módulo nos dois lados conta uma vez só", () => {
    const e = avaliarExpansao({ porte: "ate10k", jaContratados: ["saude"], novos: ["saude"] });
    expect(e.novos).toHaveLength(0);
    expect(e.anualNovo).toBe(0);
    expect(e.anualAcumulado).toBeCloseTo(anualDe("saude", "ate10k"), 2);
  });

  it("já contratados duplicados não se repetem", () => {
    const e = avaliarExpansao({ porte: "ate10k", jaContratados: ["saude", "saude", "gestao"], novos: [] });
    expect(e.jaContratados).toHaveLength(2);
  });
});

describe("valor sob consulta não vira zero", () => {
  // As três faixas grandes nascem em null na tabela. Somar zero por elas daria
  // um total baixo e um "cabe na dispensa" sobre valor que ninguém decidiu.
  it("marca a avaliação como incompleta", () => {
    const e = avaliarExpansao({ porte: "de100a500k", jaContratados: ["gestao"], novos: ["saude"] });
    expect(e.incompleta).toBe(true);
  });

  it("módulo sob consulta não é marcado como cabendo", () => {
    for (const m of modulosDisponiveis("de100a500k", ["gestao"])) {
      expect(m.sobConsulta).toBe(true);
      expect(m.cabeNaDispensa).toBe(false);
    }
  });

  it("faixa com tabela completa não é incompleta", () => {
    expect(avaliarExpansao({ porte: "ate10k", jaContratados: ["gestao"], novos: ["saude"] }).incompleta).toBe(false);
  });
});

describe("um por vez, não o pacote", () => {
  it("lista só o que não está contratado", () => {
    const lista = modulosDisponiveis("ate10k", ["gestao", "essencial"]);
    expect(lista.map((m) => m.modulo).sort()).toEqual(
      ["educacao", "licitacoes", "obras", "saude"].sort()
    );
  });

  it("nada a oferecer quando tudo está contratado", () => {
    expect(modulosDisponiveis("ate10k", TODOS)).toEqual([]);
  });

  it("sem nada contratado, todos cabem nas faixas com valor", () => {
    for (const porte of PORTES.filter((p) => p.garanteDispensa)) {
      expect(modulosDisponiveis(porte.chave, []).every((m) => m.cabeNaDispensa), porte.chave).toBe(true);
    }
  });
});

describe("o resumo do caminho não revela valor nenhum", () => {
  // ── A TABELA É INTERNA, E ISSO É DECISÃO TOMADA ──
  //
  // O cliente recebe os números na proposta. O que faltava dentro do produto
  // não era o preço: era a resposta sobre o PROCESSO, e ela cabe inteira sem
  // revelar um real.

  const todosOsCasos = [
    resumoDoCaminho("ate10k", []),
    resumoDoCaminho("ate10k", ["gestao", "essencial"]),
    resumoDoCaminho("de50a100k", ["essencial", "gestao", "saude"]),
    resumoDoCaminho("de100a500k", ["gestao"]),
    resumoDoCaminho("ate10k", TODOS),
  ];

  it("nenhum texto traz cifrão, 'R$' ou valor da tabela", () => {
    for (const r of todosOsCasos) {
      expect(r.texto).not.toMatch(/R\$|\d{3,}/);
      expect(r.titulo).not.toMatch(/R\$|\d{3,}/);
    }
  });

  it("o fundamento cita a norma, o decreto e o parágrafo da soma", () => {
    for (const r of todosOsCasos.filter((x) => x.tom !== "completo")) {
      expect(r.fundamento).toContain(LIMITE_DISPENSA.base);
      expect(r.fundamento).toContain(LIMITE_DISPENSA.atualizadoPor);
      expect(r.fundamento).toMatch(/§ 1º/);
    }
  });

  it("com tudo contratado não há norma a citar", () => {
    // Não há contratação a enquadrar, e jogar o limite de dispensa na tela de
    // quem não tem o que decidir é norma por norma.
    expect(resumoDoCaminho("ate10k", TODOS).fundamento).toBe("");
  });

  it("nenhum texto promete uma conta que a tela não mostra", () => {
    // Dizia "a conta abaixo já soma" — e não há conta abaixo, porque a tabela
    // é interna. A frase mandava o leitor procurar um número inexistente.
    for (const r of todosOsCasos) {
      expect(r.fundamento).not.toMatch(/conta abaixo|tabela abaixo|valores abaixo/i);
    }
  });

  it("nunca afirma o enquadramento", () => {
    // Quem enquadra é o procurador. Um produto que decide isso por ele está
    // assinando um parecer que não pode assinar.
    for (const r of todosOsCasos) {
      expect(r.texto).not.toMatch(/está dispensad|é dispensável|pode dispensar/i);
    }
  });

  it("todo resumo tem título e texto de verdade", () => {
    for (const r of todosOsCasos) {
      expect(r.titulo.length).toBeGreaterThan(10);
      expect(r.texto.length).toBeGreaterThan(50);
    }
  });
});

describe("cada situação tem o seu resumo", () => {
  it("faixa com valor e módulos faltando: cabe em dispensa", () => {
    const r = resumoDoCaminho("ate10k", ["gestao"]);
    expect(r.tom).toBe("dispensa");
    expect(r.texto).toMatch(/sem edital/);
  });

  it("concorda em número com um módulo só faltando", () => {
    const r = resumoDoCaminho("ate10k", TODOS.filter((c) => c !== "obras"));
    expect(r.tom).toBe("dispensa");
    expect(r.texto).toContain("o módulo que falta");
  });

  it("faixa sob consulta não promete caminho", () => {
    const r = resumoDoCaminho("de100a500k", ["gestao"]);
    expect(r.tom).toBe("sob_consulta");
    expect(r.texto).not.toMatch(/dispensa|pregão/i);
  });

  it("tudo contratado não tenta vender nada", () => {
    const r = resumoDoCaminho("ate10k", TODOS);
    expect(r.tom).toBe("completo");
    expect(r.texto).toMatch(/produto inteiro/);
  });
});
