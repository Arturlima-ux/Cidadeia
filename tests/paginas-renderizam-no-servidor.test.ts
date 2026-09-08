import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

// ── PÁGINA QUE SÓ EXISTE DEPOIS DO JAVASCRIPT ──
//
// Ler a URL no cliente faz o Next DESISTIR de pré-renderizar a página inteira.
// Nada quebra, nenhum teste falha, o navegador com JavaScript mostra tudo
// certo — e o HTML servido sai com o `<head>` e mais nada.
//
// Foi o que aconteceu com /login: sem formulário, sem campo de CPF, sem botão.
// Com script funcionando ninguém percebe. Sem ele — rede ruim de prefeitura,
// extensão que bloqueia, um pedaço de bundle que falhou depois de um deploy —
// a tela de login fica em branco. E login em branco não é uma página feia: é
// um cliente com contrato que não consegue entrar.
//
// Um `<Suspense fallback={null}>` não resolve: a página prerenderiza, mas o
// conteúdo dela vira o fallback, que é nada. Era o caso de
// /login/redefinir-senha, aberta a partir de link de e-mail.
//
// O jeito certo é ler o parâmetro no servidor, onde ele já está, e passar por
// propriedade. O componente continua cliente se precisar de estado.

/**
 * Tira comentários antes de procurar.
 *
 * Sem isto o teste acusa justamente o arquivo que EXPLICA o defeito — o
 * comentário acima cita o nome da função para dizer por que ela saiu. Já caiu
 * nessa uma vez, no teste das promessas da home.
 */
function semComentarios(codigo: string): string {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function varrer(dir: string): string[] {
  const achados: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const caminho = `${dir}/${e.name}`;
    if (e.isDirectory()) achados.push(...varrer(caminho));
    else if (/\.tsx?$/.test(e.name)) achados.push(caminho);
  }
  return achados;
}

describe("o site público não depende de JavaScript para existir", () => {
  // ── UMA REGRA QUE EU TINHA ESCRITO ERRADA ──
  //
  // A primeira versão deste arquivo proibia Client Component em página
  // pública. Estava errado, e medir mostrou: /cadastro é "use client" e serve
  // dez campos e o formulário no HTML — "use client" diz onde o componente
  // HIDRATA, não se ele é renderizado no servidor.
  //
  // Manter aquela regra teria forçado a reescrita de duas páginas que
  // funcionam, para corrigir um problema que elas não têm. O que de fato
  // esvazia a página é ler a URL no cliente, e é só isso que se proíbe aqui.

  it("nenhum componente do site lê a URL no cliente", () => {
    // O parâmetro já está no servidor. Lê-lo no cliente custa a página inteira.
    const culpados = varrer("src")
      .filter((a) => !a.includes("/dashboard/"))
      .filter((a) => semComentarios(readFileSync(a, "utf8")).includes("useSearchParams("));
    expect(culpados).toEqual([]);
  });

  it("as páginas de entrada leem o parâmetro no servidor", () => {
    // Guarda contra alguém "simplificar" juntando página e formulário de novo:
    // a página lê o parâmetro, o formulário recebe por propriedade.
    for (const pagina of ["src/app/login/page.tsx", "src/app/login/redefinir-senha/page.tsx"]) {
      const codigo = readFileSync(pagina, "utf8");
      expect(semComentarios(codigo), pagina).toContain("searchParams");
      expect(semComentarios(codigo), pagina).not.toContain("use client");
    }
  });
});
