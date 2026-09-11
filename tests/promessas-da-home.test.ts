import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { PRECO_MENSAL, PORTES } from "@/lib/precos";
import { PLANOS_ADDON } from "@/lib/planos";
import { POLITICA_PRIVACIDADE, TERMOS_DE_USO } from "@/lib/documentos-legais";

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

/** Todo .ts/.tsx sob um diretório, recursivamente. */
function varrerFontes(dir: string): string[] {
  const achados: string[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = `${dir}/${entrada.name}`;
    if (entrada.isDirectory()) achados.push(...varrerFontes(caminho));
    else if (/\.tsx?$/.test(entrada.name)) achados.push(caminho);
  }
  return achados;
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
    // Nas faixas que o site promete (até 100 mil), todo módulo tem valor, e
    // "sob consulta" não pode aparecer como rótulo fixo da página. As faixas
    // grandes nascem sem preço, e aí o rótulo é honesto.
    const todosTemPreco = PLANOS_ADDON.every((p) =>
      PORTES.filter((porte) => porte.garanteDispensa).every(
        (porte) => PRECO_MENSAL[p.chave][porte.chave] !== null
      )
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

describe("hierarquia de chamada para ação", () => {
  // A página tinha seis ações competindo, três delas com o peso visual máximo
  // (fundo cheio da marca). Uma delas apontava para o funil do CIDADÃO, com o
  // mesmo destaque da ação que fecha a venda: dois destinos opostos disputando
  // o olho do prefeito na mesma rolagem, e ele decide em meio segundo.
  //
  // A regra que estes testes travam: no máximo dois DESTINOS com botão cheio
  // na página, e eles não competem — um qualifica no topo (diagnóstico), o
  // outro converte no fecho (proposta).

  const barra = semComentarios(
    readFileSync("src/components/site/BarraConversao.tsx", "utf8")
  );

  /**
   * Destinos de todo <Link> com fundo cheio da marca.
   *
   * Lê só a TAG DE ABERTURA de cada link, do `<Link` até o `>` que a fecha.
   * A primeira versão olhava um bloco de doze linhas à frente e alcançava o
   * botão seguinte — acusava o link "Portal do cidadão", que é texto simples,
   * de ser um botão cheio. Detector de defeito que inventa defeito é pior que
   * detector nenhum: ensina a ignorar a suíte.
   */
  function destinosCheios(codigo: string): string[] {
    const achados: string[] = [];
    for (const tag of codigo.matchAll(/<Link\b[^>]*>/g)) {
      const abertura = tag[0];
      if (!/bg-brand(?!-)/.test(abertura)) continue;
      const href = abertura.match(/href=[{"]+([^"}\s]+)/)?.[1];
      if (href) achados.push(href);
    }
    return achados;
  }

  it("a home tem no máximo dois destinos com botão cheio", () => {
    const destinos = new Set(destinosCheios(home));
    expect(destinos.size).toBeLessThanOrEqual(2);
  });

  it("os dois são qualificar no topo e converter no fecho", () => {
    const destinos = destinosCheios(home);
    expect(destinos).toContain("/diagnostico");
    expect(destinos.some((d) => d.startsWith("/suporte"))).toBe(true);
  });

  it("o portal do cidadão não disputa peso com a venda", () => {
    // Ele continua na página, contornado. O que não pode é ter o mesmo
    // destaque da ação comercial — são funis opostos.
    expect(destinosCheios(home)).not.toContain("/transparencia");
  });

  it("a barra fixa reforça o fecho, sem criar um terceiro caminho", () => {
    // A barra cobre o cabeçalho ao rolar. Se o botão cheio dela levasse a
    // outro lugar, o caminho principal do site trocaria sozinho conforme a
    // rolagem — que é a definição do problema.
    for (const destino of destinosCheios(barra)) {
      expect(destino).toContain("/suporte");
    }
  });

  it("nenhum arquivo do site promete conversa antes do preço", () => {
    // ── POR QUE ISTO VARRE O PROJETO INTEIRO ──
    //
    // A primeira versão conferia só a home e a barra fixa, e passou verde
    // enquanto "Falar com especialista" continuava no BOTÃO DO CABEÇALHO —
    // que aparece em todas as páginas e é o mais visível do site. O
    // comentário ao lado daquele botão já dizia que ele não podia
    // contradizer o argumento central; o texto contradizia mesmo assim.
    //
    // Um teste que confere só onde você lembrou de olhar dá a sensação de
    // cobertura sem a cobertura. A frase é proibida no site inteiro: ela é
    // exatamente a exigência que a home acusa as incumbentes de fazer.
    const arquivos = varrerFontes("src");
    const culpados = arquivos.filter((a) =>
      semComentarios(readFileSync(a, "utf8")).includes("Falar com especialista")
    );
    expect(culpados).toEqual([]);
  });
});

describe("documentos legais existem de verdade", () => {
  // O rodapé linkava "Política de privacidade" e "Termos de uso" — os dois
  // para /sobre, que é "Segurança & LGPD". Aquela página explica COMO o dado é
  // protegido; não diz o que é coletado, com que base legal, nem por quanto
  // tempo fica guardado. Não é a mesma coisa.
  //
  // Para um produto vendido a prefeitura isso não é detalhe: é a primeira
  // pasta que o setor jurídico abre antes de autorizar a contratação, e
  // encontrar uma página técnica no lugar do documento é o tipo de coisa que
  // trava um processo por semanas.

  const rodape = semComentarios(
    readFileSync("src/components/site/SiteFooter.tsx", "utf8")
  );

  it("o rodapé aponta para páginas que existem", () => {
    for (const rota of ["/privacidade", "/termos"]) {
      expect(rodape, rota).toContain(`href="${rota}"`);
      expect(() => readFileSync(`src/app${rota}/page.tsx`, "utf8")).not.toThrow();
    }
  });

  it("nenhum dos dois aponta para a página de segurança", () => {
    // Guarda contra a volta do atalho: /sobre continua existindo e continua
    // linkada, mas como complemento, não como substituta.
    const trecho = rodape.slice(rodape.indexOf("Política de privacidade") - 300);
    expect(trecho.slice(0, 600)).not.toContain('href="/sobre"');
  });

  it("a política distingue controlador de operador", () => {
    // É a distinção que decide quem responde por dado de cidadão que está no
    // sistema. Trocá-la é o erro que faria o CidadeIA assumir obrigação do
    // município — ou o contrário, deixar o cidadão sem a quem recorrer.
    const politica = POLITICA_PRIVACIDADE.map((s) => s.paragrafos.join(" ")).join(" ");
    expect(politica).toContain("controlador");
    expect(politica).toContain("operador");
  });

  it("os termos dizem o que o sistema NÃO é", () => {
    // Sem isto o documento vira só regra de uso, e a limitação mais importante
    // do produto — acompanhamento não é demonstrativo oficial — fica só nas
    // telas, onde ninguém do jurídico procura.
    const termos = TERMOS_DE_USO.map((s) => `${s.titulo} ${s.paragrafos.join(" ")}`).join(" ");
    expect(termos).toContain("NÃO é");
    expect(termos).toContain("ACOMPANHAMENTO");
  });
});

// ── AFIRMAÇÃO ESTATÍSTICA SEM FONTE ──
// "É o caminho da maioria dos municípios" saiu do site porque ninguém mediu.
// Num produto que vende conformidade, uma frase dessas é a primeira que o
// jurídico da prefeitura pede para provar.
describe("claims sem fonte", () => {
  it("nenhum arquivo do site afirma 'maioria dos municípios' ou parecido", () => {
    const suspeitos = varrerFontes("src").filter((a) =>
      /maioria dos munic|maioria das prefeituras|todos os munic[ií]pios|a maioria dos gestores/i.test(
        semComentarios(readFileSync(a, "utf8"))
      )
    );
    expect(suspeitos).toEqual([]);
  });
});
