import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";

// ── O QUE A DECLARAÇÃO DE ACESSIBILIDADE PROMETE, O CÓDIGO CUMPRE ──
// /acessibilidade diz que há "pular para o conteúdo", rótulo ligado a cada
// campo do formulário do cidadão e conteúdo principal marcado. Se alguém
// tirar um desses, a página passa a mentir — e este teste quebra antes.

function paginasPublicas(dir = "src/app", out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const q = `${dir}/${n}`;
    if (statSync(q).isDirectory()) {
      if (!/dashboard|admin|api|login|cadastro|demo$|sessao-encerrada/.test(q)) paginasPublicas(q, out);
    } else if (n === "page.tsx") out.push(q);
  }
  return out;
}

describe("acessibilidade", () => {
  it("o cabeçalho público e os portais têm 'pular para o conteúdo'", () => {
    for (const a of ["src/components/site/SiteHeader.tsx", "src/app/transparencia/[slug]/page.tsx", "src/app/transparencia/PortalMinimo.tsx"]) {
      expect(readFileSync(a, "utf8"), a).toContain('href="#conteudo"');
    }
  });

  it("toda página pública tem conteúdo principal marcado (main#conteudo) ou usa o template que tem", () => {
    const semMain: string[] = [];
    for (const p of paginasPublicas()) {
      const s = readFileSync(p, "utf8");
      const temMain = /<main[^>]*id="conteudo"/.test(s);
      const usaTemplate = /PaginaLegal|FormularioCadastro/.test(s);
      if (!temMain && !usaTemplate) semMain.push(p);
    }
    expect(semMain).toEqual([]);
  });

  it("no formulário do cidadão, todo rótulo aponta para um campo e todo campo visível tem id", () => {
    const s = readFileSync("src/app/transparencia/FormularioCidadao.tsx", "utf8");
    const rotulos = [...s.matchAll(/<label\b([^>]*)>/g)].map((m) => m[1]);
    // rótulos que envolvem o input (checkbox) não precisam de htmlFor
    const soltos = rotulos.filter((a) => !/htmlFor=/.test(a) && !/flex items-start/.test(a));
    expect(soltos).toEqual([]);
    const campos = [...s.matchAll(/<(input|select|textarea)\b([^>]*)>/g)].filter((m) => !/type="hidden"|type="checkbox"|aria-hidden/.test(m[2]));
    const semId = campos.filter((m) => !/\bid=/.test(m[2])).map((m) => m[0].slice(0, 60));
    expect(semId).toEqual([]);
    expect(s).toContain('role="alert"');
  });

  it("o botão azul do tema escuro usa o tom com contraste AA", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/\.tema-noite \.bg-brand \{\s*background-color: var\(--brand-dark\)/);
  });
});
