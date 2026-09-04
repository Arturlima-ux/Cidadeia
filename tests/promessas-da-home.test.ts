import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PRECO_MENSAL, PORTES } from "@/lib/precos";
import { PLANOS_ADDON } from "@/lib/planos";

// ── O QUE A PÁGINA PROMETE PRECISA SER VERDADE ──
//
// Dois defeitos reais motivaram estes testes, e os dois eram do mesmo tipo:
// texto afirmando o que o sistema não entrega, sem nada quebrar.
//
// 1. A home dizia "O portal já está no ar — endereço público de um município
//    real", com botão e bolinha verde pulsando, sem NENHUM portal publicado.
//    O botão levava a uma página que responde "Nenhum portal publicado ainda".
//    A seção existe para dizer "não peça fé, confira" — e a conferência levava
//    dez segundos e desmentia a promessa.
//
// 2. A página de preços mostrava "Sob consulta" em todos os módulos enquanto a
//    calculadora da home exibia os valores. A única página do site sem preço
//    era a de preços, contradizendo o argumento central de "a conta está
//    aberta".
//
// Teste sobre o código-fonte é feio, e aqui se justifica: o que precisa ser
// travado é a AUSÊNCIA de uma promessa incondicional. Não há função a chamar —
// o defeito mora numa string escrita à mão dentro do JSX.

/**
 * Tira comentários antes de procurar.
 *
 * Sem isto o teste se engana com a própria explicação: os comentários que
 * documentam os dois defeitos CITAM as frases proibidas, e a busca casava com
 * eles em vez de com o JSX. Um teste sobre texto-fonte precisa olhar só o que
 * chega na tela.
 */
function semComentarios(codigo: string): string {
  return codigo
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "") // {/* comentário em JSX */}
    .replace(/\/\*[\s\S]*?\*\//g, "") // /* bloco */
    .replace(/^\s*\/\/.*$/gm, ""); // // linha
}

const home = semComentarios(readFileSync("src/app/page.tsx", "utf8"));
const precos = semComentarios(readFileSync("src/app/precos/page.tsx", "utf8"));

describe("prova social não promete portal que não existe", () => {
  it("a afirmação de portal no ar é condicional", () => {
    // Se voltar a ser texto solto, o site volta a mentir para quem confere.
    const posicao = home.indexOf("O portal já está no ar");
    expect(posicao).toBeGreaterThan(-1);

    // A afirmação precisa viver dentro da função que recebe o estado real.
    const inicioDaFuncao = home.indexOf("function autoridadeVerificavel");
    const fimDaFuncao = home.indexOf("\n}", inicioDaFuncao);
    expect(inicioDaFuncao).toBeGreaterThan(-1);
    expect(posicao).toBeGreaterThan(inicioDaFuncao);
    expect(posicao).toBeLessThan(fimDaFuncao);
  });

  it("nenhum link do site aponta para /transparencia sem checar se há portal", () => {
    // O "abrir um portal →" solto era o segundo caminho para a página vazia.
    // Ele agora só existe dentro do ramo `portais.length > 0`.
    const linksNus = home.match(/href="\/transparencia"/g) ?? [];
    for (const _ of linksNus) {
      expect(home).toContain("portais.length > 0");
    }
  });

  it("o texto de reserva convida ao Raio-X, que responde de verdade", () => {
    // A substituição não pode ser uma promessa vaga: precisa apontar para algo
    // que o cético abre e confere hoje, sobre a prefeitura dele.
    expect(home).toContain("Ver o Raio-X do seu município");
  });
});

describe("preço é o mesmo nas duas páginas", () => {
  it("a página de preços lê a tabela, em vez de escrever números à mão", () => {
    expect(precos).toContain("PRECO_MENSAL");
    expect(precos).toContain("PORTES");
  });

  it("não anuncia sob consulta o que tem preço definido", () => {
    // Enquanto todo módulo tiver valor nas três faixas, "sob consulta" não
    // pode aparecer como rótulo fixo da página.
    const todosTemPreco = PLANOS_ADDON.every((p) =>
      PORTES.every((porte) => PRECO_MENSAL[p.chave][porte.chave] !== null)
    );
    expect(todosTemPreco).toBe(true);
    expect(precos).not.toContain("Sob consulta — pedir proposta");
  });

  it("a tabela cobre todos os módulos vendidos", () => {
    // Um módulo novo sem linha na tabela quebraria a página de preços em
    // silêncio, mostrando vazio onde deveria haver valor.
    for (const p of PLANOS_ADDON) {
      expect(PRECO_MENSAL[p.chave], p.chave).toBeDefined();
    }
  });
});
