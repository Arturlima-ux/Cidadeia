import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PAINEIS_MODULOS } from "@/lib/paineis-modulos";

// ── O MOCKUP DE PREÇOS SÓ PODE MOSTRAR O QUE O PAINEL MOSTRA ──
//
// A aba Essencial prometia "Atendimentos WhatsApp" e "Tempo médio resposta",
// contadores que o produto não tem. Depois de corrigir os rótulos, a
// estrutura ainda era outra: medidor circular e cartão "Aguardando
// aprovação" que não existem em tela nenhuma. Quem comparasse lado a lado
// via coisas no desenho que não estavam no produto.
//
// O que se trava aqui: cada texto FIXO do mockup — título, rótulo de cartão,
// rótulo de contador, cabeçalho de lista, nome de status — existe, palavra
// por palavra, no código da tela real do módulo (ou nos arquivos que ela
// usa). Os números continuam inventados; o nome do que se mede, não.

const TELA_REAL: Record<string, string[]> = {
  essencial: [
    "src/app/dashboard/atendimento/page.tsx",
    "src/app/dashboard/atendimento/PainelPrazos.tsx",
    "src/lib/atendimento.ts",
  ],
  gestao: ["src/app/dashboard/page.tsx"],
  saude: ["src/app/dashboard/secretarias/saude/page.tsx"],
  educacao: ["src/app/dashboard/secretarias/educacao/page.tsx"],
  obras: ["src/app/dashboard/secretarias/obras/page.tsx"],
  licitacoes: ["src/app/dashboard/secretarias/licitacoes/page.tsx"],
};

function normalizar(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** "Todas as obras (24)" → "Todas as obras" — o número é inventado. */
function semContagem(t: string) {
  return t.replace(/\s*\(\d+\)\s*$/, "");
}

describe("mockup de Preços × telas reais", () => {
  it("todo módulo do mockup tem tela real mapeada", () => {
    for (const p of PAINEIS_MODULOS) {
      expect(TELA_REAL[p.chave], `módulo ${p.chave}`).toBeDefined();
    }
  });

  it("a rota mostrada no frame existe de verdade", () => {
    for (const p of PAINEIS_MODULOS) {
      const arquivo = `src/app${p.caminho}/page.tsx`;
      expect(() => readFileSync(arquivo), `${p.nomeModulo}: ${p.caminho}`).not.toThrow();
    }
  });

  for (const painel of PAINEIS_MODULOS) {
    it(`${painel.nomeModulo}: todo texto fixo do mockup existe na tela real`, () => {
      const fonte = normalizar(
        (TELA_REAL[painel.chave] ?? []).map((f) => readFileSync(f, "utf8")).join("\n")
      );
      const textos: string[] = [
        painel.titulo,
        ...(painel.cartoes ?? []).map((c) => c.label),
        ...(painel.prazos ?? []).map((c) => c.rotulo),
        ...(painel.lista ? [semContagem(painel.lista.cabecalho)] : []),
        ...(painel.lista?.itens ?? []).flatMap((i) => (i.pilula ? [i.pilula.label] : [])),
      ];
      for (const t of textos) {
        expect(fonte, `"${t}" não aparece na tela de ${painel.nomeModulo}`).toContain(normalizar(t));
      }
    });
  }

  it("o Insight da IA só aparece nos módulos cuja tela tem InsightIA", () => {
    for (const p of PAINEIS_MODULOS) {
      const temNaTela = (TELA_REAL[p.chave] ?? []).some((f) =>
        readFileSync(f, "utf8").includes("<InsightIA")
      );
      expect(Boolean(p.insight), `${p.nomeModulo}: insight no mockup=${Boolean(p.insight)}, na tela=${temNaTela}`).toBe(temNaTela);
    }
  });

  it("o insight segue o formato da análise local: constatação + 'Ação sugerida:'", () => {
    for (const p of PAINEIS_MODULOS) {
      if (!p.insight) continue;
      expect(p.insight, p.nomeModulo).toContain("Ação sugerida:");
    }
  });
});
