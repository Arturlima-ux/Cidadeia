import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { anoValido } from "@/lib/exigir-plano";
import { documentoExibivel } from "@/lib/contratos-pncp";
import { ehObraOuEngenharia } from "@/lib/obra-prazo";

const arquivo = (p: string) => readFileSync(p, "utf8");

describe("ano vindo do cliente", () => {
  // `ano: number` é tipo de TypeScript, que some em runtime: a server action
  // recebe o que o cliente mandar, e o valor ia direto para dentro da URL da
  // consulta ao PNCP (`dataInicial=${ano}0101`).
  const HOJE = new Date("2026-09-29T12:00:00Z");

  it("aceita a janela plausível", () => {
    expect(anoValido(2026, HOJE)).toBe(2026);
    expect(anoValido(2021, HOJE)).toBe(2021);
    expect(anoValido(2027, HOJE)).toBe(2027);
  });

  it("recusa string que injetaria parâmetro na consulta", () => {
    // "2026&cnpj=OUTRO" faria a importação gravar no cadastro deste município
    // os processos de outro. O PNCP é público, então não vaza dado protegido —
    // mas corrompe o cadastro de quem clicou, a partir de entrada não validada.
    expect(anoValido("2026&cnpj=00000000000191", HOJE)).toBeNull();
    expect(anoValido("2026 OR 1=1", HOJE)).toBeNull();
    expect(anoValido("../../etc", HOJE)).toBeNull();
  });

  it("recusa o que está fora da janela", () => {
    expect(anoValido(2020, HOJE)).toBeNull();
    expect(anoValido(2030, HOJE)).toBeNull();
    expect(anoValido(-2026, HOJE)).toBeNull();
  });

  it("recusa o que não é inteiro", () => {
    expect(anoValido(2026.5, HOJE)).toBeNull();
    expect(anoValido(NaN, HOJE)).toBeNull();
    expect(anoValido(Infinity, HOJE)).toBeNull();
    expect(anoValido(null, HOJE)).toBeNull();
    expect(anoValido(undefined, HOJE)).toBeNull();
    expect(anoValido({}, HOJE)).toBeNull();
  });
});

describe("toda entrada de módulo pago confere o plano", () => {
  // ── O BURACO QUE ESTE BLOCO FECHA ──
  //
  // temAcessoSecretaria responde "o CARGO alcança esta pasta?" e devolve true
  // para todo prefeito. temPlano responde "a PREFEITURA contratou o módulo?".
  //
  // As telas faziam a segunda; as server actions e a rota de API, criadas
  // depois, faziam só a primeira. Server action despacha por id no cabeçalho
  // Next-Action e rota de API não passa pelo proxy de /dashboard, então a tela
  // bloqueava e o que estava por baixo dela não.

  const entradas = [
    "src/app/dashboard/secretarias/licitacoes/pncp-actions.ts",
    "src/app/dashboard/secretarias/licitacoes/contratos-actions.ts",
    "src/app/dashboard/secretarias/obras/actions.ts",
    "src/app/api/licitacoes/pca/route.ts",
  ];

  it.each(entradas)("%s confere o plano contratado", (caminho) => {
    expect(arquivo(caminho)).toContain("exigirPlano");
  });

  it("as ações que consultam o PNCP validam o ano antes de montar a URL", () => {
    for (const c of entradas.slice(0, 2)) {
      expect(arquivo(c)).toContain("anoValido");
    }
  });

  it("nenhuma entrada monta a consulta com CNPJ lido fora da conferência de plano", () => {
    // exigirPlano devolve o CNPJ junto de propósito: uma consulta só a
    // `prefeituras` evita que alguém acrescente a quarta e esqueça a checagem.
    for (const c of entradas.slice(0, 2)) {
      expect(arquivo(c)).not.toMatch(/select\(\{\s*cnpj:\s*prefeituras\.cnpj\s*\}\)/);
    }
  });
});

describe("CPF não sai da aplicação", () => {
  it("mascara pessoa física e mantém CNPJ inteiro", () => {
    expect(documentoExibivel("12345678000199", "PJ")).toBe("12.345.678/0001-99");
    const cpf = documentoExibivel("12345678901", "PF")!;
    expect(cpf).toBe("***.456.789-**");
    expect(cpf).not.toContain("123");
    expect(cpf).not.toContain("01");
  });

  it("documento de tamanho inesperado de pessoa física também é mascarado", () => {
    const r = documentoExibivel("9988776655443322", "PF")!;
    expect(r.replace(/\D/g, "").length).toBeLessThanOrEqual(2);
  });

  it("a tela recebe o documento JÁ mascarado, não o cru", () => {
    // ── POR QUE ISTO É TESTADO NO ARQUIVO, E NÃO NA FUNÇÃO ──
    //
    // O defeito não estava na máscara: estava em ONDE ela rodava. A página
    // passava o documento cru como prop para um componente cliente, e props de
    // servidor para cliente viajam serializadas no payload da página. O CPF
    // inteiro chegava ao navegador e aparecia no código-fonte; a máscara era
    // cosmética.
    //
    // Nenhum teste de unidade pega isso — só olhar quem chama quem pega.
    const pagina = arquivo("src/app/dashboard/secretarias/licitacoes/page.tsx");
    expect(pagina).toContain("documentoExibivel(c.fornecedorDocumento");

    const painel = arquivo("src/app/dashboard/secretarias/licitacoes/PainelContratos.tsx");
    expect(painel).not.toContain("documentoExibivel");
    expect(painel).not.toContain("fornecedorTipoPessoa");
  });
});

describe("a importação de obras não traz contrato que não é obra", () => {
  it("só categorias de obra e engenharia passam", () => {
    // É o filtro que mantém a fronteira: importarObrasDeContratos lê a tabela
    // de contratos com acesso de OBRAS, não de Licitações. Afrouxar a
    // categoria faria todo contrato do município — merenda, locação, saúde —
    // aparecer na pasta de Obras para quem só tem acesso a ela.
    expect(ehObraOuEngenharia("Obras")).toBe(true);
    expect(ehObraOuEngenharia("Serviços de Engenharia")).toBe(true);
    for (const outra of [
      "Serviços",
      "Compras",
      "Locação Imóveis",
      "Cessão",
      "Serviços de Saúde",
      "Informática (TIC)",
      null,
      "",
    ]) {
      expect(ehObraOuEngenharia(outra)).toBe(false);
    }
  });

  it("a ação de importar obras aplica o filtro", () => {
    const acoes = arquivo("src/app/dashboard/secretarias/obras/actions.ts");
    expect(acoes).toContain("ehObraOuEngenharia(c.categoria)");
  });
});

describe("as rotas que já existiam, da mesma classe", () => {
  // Achadas na varredura, não no que mudou hoje. Deixar buraco conhecido
  // aberto porque "é pré-existente" é pior que a correção.

  it.each([
    ["src/app/api/educacao/reposicao/route.ts", "educacao"],
    ["src/app/api/saude/reposicao/route.ts", "saude"],
  ])("%s confere o plano antes de entregar o CSV", (caminho, addon) => {
    const s = arquivo(caminho);
    expect(s).toContain("exigirPlano");
    expect(s).toContain(`"${addon}"`);
  });

  it("o diagnóstico de ambiente é só para gestor", () => {
    // A decisão de exigir apenas "estar logado" é anterior aos cargos de
    // instalação. Hoje existem "unidade" e "escola", contas criadas para
    // terceiros — não há motivo para verem o mapa de arquitetura.
    const s = arquivo("src/app/api/diagnostico-ambiente/route.ts");
    expect(s).toContain("ehGestor(sessao)");
  });

  it("o diagnóstico continua sem devolver valor de variável", () => {
    // A regra que já estava certa e não pode se perder na mexida: o valor é
    // lido, mas só EXISTÊNCIA, COMPRIMENTO e espaço sobrando saem na resposta —
    // o bastante para separar "não existe" de "existe vazia" de "existe com
    // espaço", que são causas diferentes com a mesma aparência no painel.
    //
    // A primeira versão deste teste usava um regex esperto sobre
    // "process.env[...]" e reprovava o próprio código correto. Ler a variável
    // não é o problema; devolver o que foi lido é.
    const s = arquivo("src/app/api/diagnostico-ambiente/route.ts");
    const resposta = s.slice(s.indexOf("const estado ="));
    expect(resposta).not.toMatch(/:\s*valor\s*[,}]/);
    expect(resposta).not.toMatch(/\.\.\.valor/);
    expect(resposta).not.toMatch(/valor\.slice\(/);
    for (const campo of ["existe", "caracteres", "temEspacoSobrando"]) {
      expect(resposta).toContain(campo);
    }
  });

  it("a exportação segue SEM trava de plano, de propósito", () => {
    // Não é esquecimento: condicionar a exportação a módulo contratado
    // transformaria o dado do município em refém do contrato. Este teste
    // existe para que uma futura varredura não "corrija" a decisão.
    const s = arquivo("src/app/api/exportacao/route.ts");
    expect(s).not.toContain("exigirPlano");
    expect(s).toContain("DE PROPÓSITO");
    expect(s).toContain("ehGestor(sessao)");
  });
});
