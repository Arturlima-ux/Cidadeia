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
// 2. A tabela de preços é INTERNA, por decisão comercial (15/09/2026): ela
//    alimenta o e-mail da proposta e o contrato, e não aparece em página
//    pública nenhuma. Já foi o contrário — a página de Preços exibia a tabela
//    e a home dizia "a conta está aberta". O argumento agora é transparência
//    de processo: proposta em um dia útil, por módulo e por faixa, sem reunião
//    obrigatória. O que se trava aqui é que a tabela não vaze para o site.
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

describe("a tabela de preços é interna", () => {
  // Páginas e componentes públicos. O e-mail da proposta (server action) e o
  // painel logado ficam de fora: lá a tabela pode viver.
  const PUBLICOS = [
    "src/app/page.tsx",
    "src/app/solucoes/page.tsx",
    "src/app/proposta/page.tsx",
    "src/app/modulos/[chave]/page.tsx",
    "src/app/faq/page.tsx",
    "src/app/como-contratar/page.tsx",
    "src/app/conformidade/page.tsx",
    "src/components/site/MontadorProposta.tsx",
    "src/components/site/SeletorPainelModulo.tsx",
    "src/components/site/PainelModuloFiel.tsx",
    "src/components/site/BarraConversao.tsx",
    "src/components/site/Diagnostico.tsx",
  ];

  it("nenhuma página pública lê a tabela de preços", () => {
    const culpados = PUBLICOS.filter((a) =>
      /PRECO_MENSAL|menorPrecoMensal|montarProposta\(/.test(semComentarios(readFileSync(a, "utf8")))
    );
    expect(culpados).toEqual([]);
  });

  it("nenhuma página pública promete valor visível", () => {
    const culpados = PUBLICOS.filter((a) =>
      /a partir de R\$|conta está aberta|veja se cabe na dispensa/i.test(semComentarios(readFileSync(a, "utf8")))
    );
    expect(culpados).toEqual([]);
  });

  it("a tabela interna continua completa nas faixas que cabem na dispensa", () => {
    // Ela alimenta a proposta e o contrato; um null nas faixas pequenas
    // viraria "sob consulta" no e-mail do pedido.
    const todosTemPreco = PLANOS_ADDON.every((p) =>
      PORTES.filter((porte) => porte.garanteDispensa).every(
        (porte) => PRECO_MENSAL[p.chave][porte.chave] !== null
      )
    );
    expect(todosTemPreco).toBe(true);
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
    // ── O QUE ESTÁ TRAVADO AQUI É A REGRA, NÃO A URL ──
    //
    // A primeira versão exigia "/diagnostico" literal. Em 23/09/2026 o topo
    // passou a abrir pelo Raio-X, que qualifica melhor: não pede nada além
    // do nome do município e já devolve o dado do Tesouro sobre ele, contra
    // dois minutos de respostas do diagnóstico. O teste quebrou por causa
    // do nome, não do que ele defende — e teste que quebra em melhoria é
    // teste que alguém apaga.
    //
    // Qualificar continua obrigatório no topo. Qual das duas portas faz
    // isso é decisão de produto.
    const QUALIFICADORES = ["/raio-x", "/diagnostico"];
    expect(destinos.some((d) => QUALIFICADORES.some((q) => d.startsWith(q)))).toBe(true);
    // O fecho converte pedindo a proposta — que tem página própria, não é
    // "precisa de ajuda". /suporte fica para suporte.
    expect(destinos.some((d) => d.startsWith("/proposta"))).toBe(true);
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
      expect(destino).toContain("/proposta");
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
