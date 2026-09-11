import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PAINEIS_MODULOS } from "@/lib/paineis-modulos";

// ── O MOCKUP DE PREÇOS SÓ PODE PROMETER O QUE O PAINEL MOSTRA ──
//
// A aba Essencial prometia "Atendimentos WhatsApp" e "Tempo médio resposta",
// contadores que o produto não tem. Quem assinasse pelo que viu em Preços
// entraria e não encontraria. Cada rótulo de métrica do mockup precisa
// existir, palavra por palavra, no código da tela real do módulo.
//
// Os números continuam inventados (é uma "Prefeitura Modelo"); o que se
// trava aqui é o nome do que se mede.

const TELA_REAL: Record<string, string[]> = {
  essencial: ["src/app/dashboard/atendimento/page.tsx", "src/app/dashboard/atendimento/PainelPrazos.tsx"],
  gestao: ["src/app/dashboard/page.tsx"],
  saude: ["src/app/dashboard/secretarias/saude/page.tsx"],
  educacao: ["src/app/dashboard/secretarias/educacao/page.tsx"],
  obras: ["src/app/dashboard/secretarias/obras/page.tsx"],
  licitacoes: ["src/app/dashboard/secretarias/licitacoes/page.tsx"],
};

function normalizar(t: string) {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

describe("mockup de Preços × telas reais", () => {
  it("todo módulo do mockup tem tela real mapeada", () => {
    for (const p of PAINEIS_MODULOS) {
      expect(TELA_REAL[p.chave], `módulo ${p.chave}`).toBeDefined();
    }
  });

  for (const painel of PAINEIS_MODULOS) {
    it(`${painel.nomeModulo}: cada métrica do mockup existe na tela real`, () => {
      const fonte = normalizar(
        (TELA_REAL[painel.chave] ?? []).map((f) => readFileSync(f, "utf8")).join("\n")
      );
      for (const m of painel.metricas) {
        expect(fonte, `"${m.label}" não aparece na tela de ${painel.nomeModulo}`).toContain(
          normalizar(m.label)
        );
      }
    });
  }
});
