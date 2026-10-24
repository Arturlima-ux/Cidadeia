import { describe, expect, it } from "vitest";
import { secaoAlertasParaIA } from "@/lib/alerta-por-area";
import { textoFilaVazia } from "@/lib/atendimento";

const alertas = [
  { titulo: "Remédio acabando na UBS", descricao: null, prioridade: "urgente", secretaria: "saude", resolvido: false },
  { titulo: "Reunião da licitação", descricao: "PE 014", prioridade: "medio", secretaria: "Licitações e contratos", resolvido: false },
  { titulo: "Prazo do RGF", descricao: null, prioridade: "urgente", secretaria: null, resolvido: false },
  { titulo: "Vacina reposta", descricao: null, prioridade: "info", secretaria: "Secretaria de Saúde", resolvido: true },
];

describe("alertas no contexto da IA seguem o recorte da tela", () => {
  it("o secretário vê os da própria área, como na tela de alertas", () => {
    const texto = secaoAlertasParaIA({ cargo: "secretario", secretaria: "saude" }, alertas);
    expect(texto).toContain("Alertas em aberto (1)");
    expect(texto).toContain("Remédio acabando na UBS");
    expect(texto).not.toContain("Reunião da licitação");
    expect(texto).not.toContain("Prazo do RGF");
    expect(texto).toContain("Alertas já resolvidos: 1");
    // Era "o filtro de alertas por secretaria ainda não existe".
    expect(texto).not.toContain("ainda não existe");
  });

  it("o prefeito vê todos, sem aviso de recorte", () => {
    const texto = secaoAlertasParaIA({ cargo: "prefeito" }, alertas);
    expect(texto).toContain("Alertas em aberto (3):");
    expect(texto).toContain("Prazo do RGF");
    expect(texto).not.toContain("só os da área");
  });

  it("cargo de uma instalação não recebe alerta nenhum", () => {
    expect(secaoAlertasParaIA({ cargo: "escola" }, alertas)).toContain("Alertas em aberto (0)");
  });
});

describe("fila vazia da ouvidoria", () => {
  it("não manda o secretário ativar um portal que ele não vê", () => {
    expect(textoFilaVazia(false, false)).not.toContain("acima");
    expect(textoFilaVazia(false, false)).toContain("gabinete");
    expect(textoFilaVazia(false, true)).toContain("sua secretaria");
  });

  it("o gestor continua sendo orientado a ativar o portal", () => {
    expect(textoFilaVazia(true, false)).toContain("Ative o portal público acima");
    expect(textoFilaVazia(true, true)).toContain("ela aparece aqui");
  });
});

describe("medidor do Índice de Transparência", () => {
  it("a primeira pintura já traz o valor real, não 0%", async () => {
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { default: GaugeEficiencia } = await import("@/components/GaugeEficiencia");
    const html = renderToStaticMarkup(createElement(GaugeEficiencia, { valor: 78, label: "Índice de Transparência" }));
    expect(html).toContain("78%");
    expect(html).not.toContain(">0%<");
    expect(html).toContain('aria-label="Índice de Transparência: 78%"');
  });
});

describe("formulários do painel", () => {
  // Rótulo seguido do campo, sem htmlFor/id: na tela parece certo, mas o
  // leitor de tela anuncia só "caixa de edição" e clicar no rótulo não foca
  // o campo. Eram 46 assim em outubro de 2026.
  it("todo rótulo que precede um campo está ligado a ele", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const arquivos: string[] = [];
    const andar = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) andar(caminho);
        else if (caminho.endsWith(".tsx")) arquivos.push(caminho);
      }
    };
    andar("src/app/dashboard");
    const soltos: string[] = [];
    const padrao = /<label (?![^>]*htmlFor)[^>]*>((?:(?!<\/label>|<input|<select|<textarea)[\s\S])*?)<\/label>\s*<(input|select|textarea)\b/g;
    for (const arquivo of arquivos) {
      const codigo = readFileSync(arquivo, "utf8");
      for (const m of codigo.matchAll(padrao)) soltos.push(`${arquivo}: ${m[1].replace(/\s+/g, " ").trim().slice(0, 40)}`);
    }
    expect(soltos).toEqual([]);
  });
});

describe("Central Inteligente", () => {
  it("o achado sem secretaria leva a etiqueta da área certa, não sempre 'Financeiro'", async () => {
    const { moduloDoAchado } = await import("@/lib/deteccao-automatica");
    expect(moduloDoAchado({ secretaria: null, categoria: "prazo", chave: "atendimento:vencendo" })).toBe("Ouvidoria");
    expect(moduloDoAchado({ secretaria: null, categoria: "prazo", chave: "atendimento:vencidos" })).toBe("Ouvidoria");
    expect(moduloDoAchado({ secretaria: null, categoria: "pessoal", chave: "pessoal:prudencial" })).toBe("Pessoal");
    expect(moduloDoAchado({ secretaria: null, categoria: "financeiro", chave: "financeiro:saldo-negativo" })).toBe("Financeiro");
    expect(moduloDoAchado({ secretaria: "licitacoes", categoria: "prazo", chave: "licitacao:x" })).toBe("Licitações");
  });

  it("o resumo concorda em número", async () => {
    const { resumoDosAchados } = await import("@/lib/deteccao-automatica");
    expect(resumoDosAchados(1)).toBe("1 ponto detectado automaticamente que merece atenção.");
    expect(resumoDosAchados(6)).toBe("6 pontos detectados automaticamente que merecem atenção.");
    expect(resumoDosAchados(0)).toContain("Nenhum ponto crítico");
    expect(resumoDosAchados(6)).not.toContain("(s)");
  });
});

describe("CNPJ nas Configurações", () => {
  it("sai com a máscara oficial; o que não tem 14 dígitos sai como veio", async () => {
    const { formatarCnpj } = await import("@/lib/formatadores");
    expect(formatarCnpj("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatarCnpj("12.345.678/0001-90")).toBe("12.345.678/0001-90");
    expect(formatarCnpj("123")).toBe("123");
    expect(formatarCnpj(null)).toBeNull();
  });
});

describe("eixo dos gráficos do histórico", () => {
  it("valores em reais cabem no eixo de 44–56px", async () => {
    const { formatarCompacto: bruto } = await import("@/lib/formatadores");
    // O Intl separa "600" de "mil" com espaço não separável.
    const formatarCompacto = (v: number) => bruto(v).replace(/\s/g, " ");
    expect(formatarCompacto(600000)).toBe("600 mil");
    expect(formatarCompacto(-50000)).toBe("-50 mil");
    expect(formatarCompacto(1200000)).toBe("1,2 mi");
    for (const v of [600000, -150000, 1250000]) expect(formatarCompacto(v).length).toBeLessThanOrEqual(8);
  });
});

describe("obras: o esperado diz de onde vem", () => {
  const base = {
    id: "o1", nome: "Reforma da UBS", fornecedorNome: null, valorContrato: 480000,
    progressoAtual: 20, progressoEsperado: 65, atualizadoEm: "2026-09-12T14:00:00Z",
  };

  it("sem datas de contrato, o número digitado não é chamado de prazo", async () => {
    const { esperadoDaObra, rotuloDoEsperado, fraseDoAtraso } = await import("@/lib/obra-prazo");
    const e = esperadoDaObra({ ...base, vigenciaInicio: null, vigenciaFim: null }, new Date("2026-10-23T12:00:00Z"))!;
    expect(e).toEqual({ valor: 65, fonte: "informado" });
    expect(rotuloDoEsperado(e)).not.toContain("prazo");
    expect(fraseDoAtraso("Reforma da UBS", 20, e)).not.toContain("pelo prazo");
    expect(fraseDoAtraso("Reforma da UBS", 20, e)).toContain("65% esperados");
  });

  it("com datas, o esperado é a fração do prazo, e o texto diz isso", async () => {
    const { esperadoDaObra, rotuloDoEsperado } = await import("@/lib/obra-prazo");
    const e = esperadoDaObra(
      { ...base, vigenciaInicio: "2026-01-01", vigenciaFim: "2026-12-31" },
      new Date("2026-07-02T12:00:00Z")
    )!;
    expect(e.fonte).toBe("prazo");
    expect(e.valor).toBeGreaterThanOrEqual(49);
    expect(e.valor).toBeLessThanOrEqual(51);
    expect(rotuloDoEsperado(e)).toMatch(/^pelo prazo, \d+%$/);
  });

  it("sem datas e sem esperado digitado, não há esperado", async () => {
    const { esperadoDaObra } = await import("@/lib/obra-prazo");
    expect(esperadoDaObra({ ...base, progressoEsperado: 0, vigenciaInicio: null, vigenciaFim: null })).toBeNull();
  });
});

describe("mapas sem dependência de CDN para os marcadores", () => {
  it("nenhum componente busca o ícone do Leaflet no unpkg", async () => {
    const { execSync } = await import("node:child_process");
    const achados = execSync('grep -rln "unpkg.com/leaflet" src || true', { encoding: "utf8" }).trim();
    expect(achados).toBe("");
  });
});

describe("formulário de despesa com pessoal", () => {
  it("o campo do ano não disputa a largura com o mês", async () => {
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { default: FormularioPessoal } = await import("@/app/dashboard/pessoal/FormularioPessoal");
    const html = renderToStaticMarkup(createElement(FormularioPessoal, { exercicio: 2026, mesSugerido: 8, rcl: null, despesa: null }));
    const ano = html.match(/<input[^>]*name="exercicio"[^>]*>/)![0];
    const classes = ano.match(/class="([^"]*)"/)![1].split(/\s+/);
    // "w-full w-28" fazia o ano tomar a linha inteira e o mês sumir.
    expect(classes).toContain("w-28");
    expect(classes).not.toContain("w-full");
    const mes = html.match(/<select[^>]*id="pessoal-mes"[^>]*>/)![0];
    expect(mes).toContain("flex-1");
  });
});

describe("textos do painel concordam em número", () => {
  it("contar escreve singular e plural sem '(s)'", async () => {
    const { contar } = await import("@/lib/formatadores");
    expect(contar(1, "obra", "obras")).toBe("1 obra");
    expect(contar(3, "obra", "obras")).toBe("3 obras");
    expect(contar(0, "item", "itens")).toBe("0 itens");
  });

  it("a eficácia de obras e licitações não escreve '(s)'", async () => {
    const { eficaciaObras, eficaciaLicitacoes } = await import("@/lib/eficacia");
    const obras = eficaciaObras(
      [
        { nome: "UBS", status: "em_andamento", progressoAtual: 20, progressoEsperado: 65, valorContrato: 480000 },
        { nome: "Via", status: "em_andamento", progressoAtual: 72, progressoEsperado: 70, valorContrato: 1250000 },
        { nome: "Creche", status: "concluida", progressoAtual: 100, progressoEsperado: 100, valorContrato: 690000 },
      ],
      0
    );
    const lic = eficaciaLicitacoes(
      [
        { numero: "PE 1", status: "homologada", valorEstimado: 100, observacaoRisco: null },
        { numero: "PE 2", status: "cancelada", valorEstimado: 100, observacaoRisco: "impugnação" },
      ],
      0
    );
    const tudo = JSON.stringify([obras, lic]);
    expect(tudo).not.toMatch(/\((s|es|ns)\)/);
    expect(tudo).toContain("1 de 3 obras concluídas; 1 atrasada.");
    expect(tudo).toContain("1 de 2 obras em andamento está com progresso abaixo do esperado");
  });
});

describe("cartão de matrícula da Educação", () => {
  it("não diz que bate quando o valor acima aponta dinheiro fora da conta", async () => {
    const { apurarFundebPorAluno, fraseMatriculaDaRede } = await import("@/lib/resultado-educacao");
    // A demonstração: +19 numa escola, -17 noutra, -2 noutra; a rede fecha igual.
    const escolas = [
      { id: "a", nome: "Padre Cícero", matriculasCenso: 412, matriculasAtuais: 431 },
      { id: "b", nome: "Maria das Dores", matriculasCenso: 188, matriculasAtuais: 171 },
      { id: "c", nome: "José Alencar", matriculasCenso: 356, matriculasAtuais: 354 },
      { id: "d", nome: "Santa Luzia", matriculasCenso: 74, matriculasAtuais: 74 },
    ];
    const ap = apurarFundebPorAluno(escolas, 7240);
    const frase = fraseMatriculaDaRede({ escolasInformadas: 4, saldoDaRede: 0, alunosForaDaConta: ap.alunosForaDaConta, alunosDeclaradosAMais: ap.alunosDeclaradosAMais });
    expect(ap.reaisForaDaConta).toBeGreaterThan(0);
    expect(frase).not.toContain("o número de hoje bate com o declarado");
    expect(frase).toContain("19 alunos a mais");
    expect(frase).toContain("19 alunos a menos");
  });

  it("rede que bate escola a escola continua dizendo que bate", async () => {
    const { fraseMatriculaDaRede } = await import("@/lib/resultado-educacao");
    expect(fraseMatriculaDaRede({ escolasInformadas: 2, saldoDaRede: 0, alunosForaDaConta: 0, alunosDeclaradosAMais: 0 })).toContain("bate com o declarado");
    expect(fraseMatriculaDaRede({ escolasInformadas: 1, saldoDaRede: 3, alunosForaDaConta: 3, alunosDeclaradosAMais: 0 })).toContain("Na escola que já informou, há 3 alunos a mais");
  });
});
