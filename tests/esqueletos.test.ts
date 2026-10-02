import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

/** Todo loading.tsx do projeto. */
function esqueletos(): string[] {
  return readdirSync("src/app", { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith("loading.tsx"))
    .map((f) => `src/app/${f}`.replace(/\\/g, "/"));
}

describe("os esqueletos de carregamento", () => {
  // ── POR QUE ISTO É TESTADO NO ARQUIVO ──
  //
  // Esqueleto é tela que aparece por um segundo e some. Ninguém revisa o que
  // não fica na tela — e é exatamente por isso que ele acumula defeito: um
  // esqueleto sem aria-busy deixa quem usa leitor de tela ouvir o cabeçalho e
  // concluir que a página acabou ali, em silêncio, para sempre.

  it("existem esqueletos para as telas pesadas, e não só um genérico", () => {
    const todos = esqueletos();
    // O painel tinha UM esqueleto para 34 rotas. As quatro secretarias são as
    // telas mais pesadas — a de Educação faz oito consultas em paralelo.
    for (const m of ["saude", "educacao", "licitacoes", "obras"]) {
      expect(
        todos.some((f) => f.includes(`secretarias/${m}/loading.tsx`)),
        `${m} sem esqueleto próprio`
      ).toBe(true);
    }
    expect(todos).toContain("src/app/dashboard/loading.tsx");
  });

  it("todo esqueleto passa pelo envelope, que carrega o aviso ao leitor de tela", () => {
    for (const f of esqueletos()) {
      const s = readFileSync(f, "utf8");
      expect(s, `${f} não usa o componente Esqueleto`).toContain("@/components/Esqueleto");
    }
  });

  it("o envelope anuncia o que está carregando e esconde o resto", () => {
    const s = readFileSync("src/components/Esqueleto.tsx", "utf8");
    expect(s).toContain("aria-busy");
    expect(s).toContain("sr-only");
    // As peças visuais ficam atrás de aria-hidden: dezenas de retângulos
    // anunciados viram ruído puro.
    expect(s).toContain('aria-hidden="true"');
  });

  it("cada esqueleto diz O QUE está carregando, e não só que algo carrega", () => {
    // "Carregando." não ajuda ninguém. "Carregando a Secretaria da Saúde"
    // confirma que o clique foi para onde a pessoa queria.
    for (const f of esqueletos()) {
      const s = readFileSync(f, "utf8");
      const m = s.match(/oQue="([^"]+)"/);
      expect(m, `${f} não informa oQue`).not.toBeNull();
      expect(m![1]!.length, `${f}: descrição curta demais`).toBeGreaterThan(4);
    }
  });

  it("nenhum esqueleto anima além de opacidade", () => {
    // A mesma regra do motor em globals.css. Animar outra coisa força
    // recálculo de layout a cada quadro — e esqueleto que trava a máquina é
    // pior que tela branca.
    for (const f of esqueletos()) {
      const s = readFileSync(f, "utf8");
      expect(s, `${f} usa animação fora do permitido`).not.toMatch(
        /animate-(?!pulse-soft|fade-in-up)/
      );
    }
  });
});
