import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ── A DOCUMENTAÇÃO QUE NÃO PODE VIRAR FICÇÃO ──
//
// docs/design-system.md diz "nunca escreva uma cor em hexadecimal numa tela".
// Documento nenhum obriga ninguém a nada: seis meses depois a regra vira
// folclore e o repositório volta a ter três vermelhos diferentes para a mesma
// prioridade — que foi exatamente o estado encontrado em outubro de 2026.
//
// Este teste é a regra com dentes.

const RAIZ = join(process.cwd(), "src");

/**
 * Onde a cor PRECISA ser literal, porque quem renderiza não resolve variável
 * CSS. Cada entrada traz o motivo: acrescentar um caminho aqui é decisão
 * deliberada, e uma lista sem motivos vira o lugar onde se esconde o descuido.
 */
const EXCECOES: { caminho: string; motivo: string }[] = [
  { caminho: "lib/relatorios/", motivo: "PDF — o renderizador não tem o CSS do documento" },
  { caminho: "app/api/kit/", motivo: "documento gerado, fora do navegador" },
  { caminho: "lib/og-imagem.tsx", motivo: "imagem de compartilhamento, renderizada fora do navegador" },
  { caminho: "lib/pedido-proposta.ts", motivo: "HTML de e-mail — cliente de e-mail não suporta variável CSS" },
  { caminho: "app/raio-x/lead-actions.ts", motivo: "HTML do e-mail de lead — cliente de e-mail não resolve variável CSS" },
  { caminho: "lib/cobranca-servidor.ts", motivo: "HTML dos e-mails de fatura e de ativação — cliente de e-mail não resolve variável CSS" },
  // Este o teste achou, e eu não: o aviso de erro que vai por e-mail para a
  // equipe. Mesma razão dos outros, e a prova de que a varredura precisava
  // existir em vez de uma auditoria feita uma vez à mão.
  { caminho: "instrumentation.ts", motivo: "HTML do e-mail de erro da aplicação — cliente de e-mail não resolve variável CSS" },
  { caminho: "app/global-error.tsx", motivo: "substitui o layout raiz; a folha de estilo pode não ter carregado" },
  { caminho: "components/site/SiteFooter.tsx", motivo: "a marca sobre o rodapé, escuro nos dois temas" },
  { caminho: "components/FaixaDemo.tsx", motivo: "o selo de demonstração é âmbar fixo de propósito — precisa destoar do tema" },
  { caminho: "components/site/PainelDemonstracao.tsx", motivo: "três pontinhos que desenham uma janela: ilustração, não dado nem estado" },
];

function arquivosDeCodigo(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const cheio = join(dir, nome);
    if (statSync(cheio).isDirectory()) arquivosDeCodigo(cheio, acc);
    else if (/\.tsx?$/.test(nome)) acc.push(cheio);
  }
  return acc;
}

/**
 * Tira comentários antes de procurar hexadecimal.
 *
 * O comentário é onde a MEDIÇÃO fica registrada — MarcadorSituacao.tsx anota
 * os ΔE de cada par com as cores escritas por extenso, e isso é o contrário de
 * descuido. A regra é sobre o que é renderizado, não sobre o que é explicado.
 */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const HEX = /#[0-9a-fA-F]{3,8}\b/g;

const relativo = (p: string) => p.slice(RAIZ.length + 1).replace(/\\/g, "/");
const temExcecao = (rel: string) => EXCECOES.some((e) => rel.startsWith(e.caminho));

describe("cor de tela vem de token, nunca de hexadecimal", () => {
  const arquivos = arquivosDeCodigo(RAIZ).map((p) => ({
    rel: relativo(p),
    hex: (semComentarios(readFileSync(p, "utf8")).match(HEX) ?? []) as string[],
  }));

  it("acha os arquivos do produto", () => {
    // Se a varredura quebrar, todos os outros testes passam sem testar nada.
    expect(arquivos.length).toBeGreaterThan(100);
  });

  it("nenhum arquivo fora da lista de exceções escreve cor literal", () => {
    const infratores = arquivos
      .filter((a) => a.hex.length > 0 && !temExcecao(a.rel))
      .map((a) => `${a.rel}: ${a.hex.join(", ")}`);
    expect(infratores, "use um token de globals.css — ver docs/design-system.md").toEqual([]);
  });

  it("toda exceção tem motivo escrito", () => {
    // Lista sem motivos vira o lugar onde se esconde o descuido.
    for (const e of EXCECOES) expect(e.motivo.length, e.caminho).toBeGreaterThan(20);
  });

  it("nenhuma exceção está sobrando", () => {
    // Exceção que já não é usada mantém a porta aberta para quem vier depois.
    const semUso = EXCECOES.filter(
      (e) => !arquivos.some((a) => a.rel.startsWith(e.caminho) && a.hex.length > 0)
    ).map((e) => e.caminho);
    expect(semUso, "remova de EXCECOES o que não precisa mais").toEqual([]);
  });

  it("comentário pode citar cor — é onde a medição fica registrada", () => {
    const fonte = readFileSync(join(RAIZ, "components/MarcadorSituacao.tsx"), "utf8");
    expect(fonte).toMatch(HEX);
    expect(semComentarios(fonte).match(HEX)).toBeNull();
  });
});

describe("os tokens que a documentação promete existem", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  // Um bloco por tema. O escuro é ESCOLHIDO, não derivado do claro: a faixa de
  // luminosidade que o validador exige no escuro é mais estreita e mais baixa,
  // e clarear o claro automaticamente joga metade da paleta para fora dela.
  const temas = css.split(".tema-noite");

  it("as seis séries existem nos dois temas", () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(css, `--serie-${n}`).toContain(`--serie-${n}:`);
    }
    expect(temas.length, "o bloco do tema noite sumiu").toBeGreaterThan(1);
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(temas[1], `--serie-${n} no tema noite`).toContain(`--serie-${n}:`);
    }
  });

  it("o passo escuro de cada série é DIFERENTE do claro", () => {
    // Se alguém "simplificar" definindo as séries uma vez só, o tema noite
    // volta a ficar fora da faixa de luminosidade — em silêncio.
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const claro = temas[0].match(new RegExp(`--serie-${n}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
      const escuro = temas[1].match(new RegExp(`--serie-${n}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
      expect(claro, `--serie-${n} no claro`).toBeTruthy();
      expect(escuro, `--serie-${n} no escuro`).toBeTruthy();
      expect(escuro, `--serie-${n}: claro e escuro iguais`).not.toBe(claro);
    }
  });

  it("status e tinta sobre preenchimento existem", () => {
    for (const t of ["--urgente", "--medio", "--info", "--sobre-forte", "--sobre-acento"]) {
      expect(css, t).toContain(`${t}:`);
    }
  });

  it("os tokens de movimento existem e o movimento reduzido é respeitado", () => {
    for (const t of ["--saida", "--rapido", "--t-micro", "--t-entrada"]) {
      expect(css, t).toContain(`${t}:`);
    }
    expect(css).toContain("prefers-reduced-motion");
  });

  it("o foco visível é desenhado com a cor de marca", () => {
    expect(css).toMatch(/:focus-visible[\s\S]{0,120}outline:\s*2px solid var\(--brand\)/);
  });
});

describe("a documentação aponta para o que existe", () => {
  const doc = readFileSync(join(process.cwd(), "docs/design-system.md"), "utf8");

  it("cada arquivo citado como exceção na documentação está na lista do teste", () => {
    // O documento e o teste discordarem é a forma mais rápida de a regra virar
    // folclore: um diz uma coisa, o outro permite outra.
    for (const e of EXCECOES) {
      const arquivo = e.caminho.replace(/\/$/, "").split("/").pop()!;
      expect(doc, `${e.caminho} não aparece na documentação`).toContain(arquivo);
    }
  });

  it("registra as medições da paleta, e não só a promessa de medir", () => {
    expect(doc).toMatch(/ΔE/);
    expect(doc).toContain("validate_palette.js");
  });
});
