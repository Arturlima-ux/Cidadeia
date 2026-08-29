// ── IMPORTAÇÃO DE DADOS DO SISTEMA ANTIGO ──
//
// A home promete que a prefeitura não precisa recomeçar do zero. Na prática
// isso quase sempre chega como uma planilha exportada de outro sistema — e
// planilha de prefeitura vem torta: cabeçalho com acento e maiúscula, número
// no formato brasileiro, ponto e vírgula como separador (o padrão do Excel
// em português), coluna a mais, coluna faltando, linha em branco no fim.
//
// Este módulo é puro: transforma texto em linhas validadas e devolve os
// erros em vez de estourar. Quem grava no banco é a action, que força o
// prefeituraId da sessão — o arquivo NUNCA decide de qual município é o dado.

export type TipoCampo = "texto" | "numero" | "percentual" | "moeda" | "enum" | "competencia";

export type CampoImportavel = {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio: boolean;
  opcoes?: string[];
  /** Cabeçalhos que costumam aparecer nas planilhas das prefeituras. */
  sinonimos: string[];
};

export type TabelaImportavel = {
  chave: string;
  rotulo: string;
  descricao: string;
  campos: CampoImportavel[];
};

export const TABELAS_IMPORTAVEIS: TabelaImportavel[] = [
  {
    chave: "unidades_saude",
    rotulo: "Unidades de saúde",
    descricao: "UBS, postos, hospitais e SAMU.",
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, sinonimos: ["unidade", "nome da unidade", "estabelecimento"] },
      { chave: "tipo", rotulo: "Tipo", tipo: "enum", obrigatorio: true, opcoes: ["ubs", "posto", "hospital", "samu"], sinonimos: ["categoria", "tipo de unidade"] },
      { chave: "bairro", rotulo: "Bairro", tipo: "texto", obrigatorio: false, sinonimos: ["localidade", "distrito", "endereco"] },
      { chave: "latitude", rotulo: "Latitude", tipo: "numero", obrigatorio: false, sinonimos: ["lat"] },
      { chave: "longitude", rotulo: "Longitude", tipo: "numero", obrigatorio: false, sinonimos: ["lon", "lng", "long"] },
    ],
  },
  {
    chave: "escolas",
    rotulo: "Escolas",
    descricao: "Rede municipal de ensino.",
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, sinonimos: ["escola", "nome da escola", "estabelecimento"] },
      { chave: "bairro", rotulo: "Bairro", tipo: "texto", obrigatorio: false, sinonimos: ["localidade", "distrito", "endereco"] },
      { chave: "evasaoPercentual", rotulo: "Evasão (%)", tipo: "percentual", obrigatorio: false, sinonimos: ["evasao", "taxa de evasao", "evasao escolar"] },
      { chave: "latitude", rotulo: "Latitude", tipo: "numero", obrigatorio: false, sinonimos: ["lat"] },
      { chave: "longitude", rotulo: "Longitude", tipo: "numero", obrigatorio: false, sinonimos: ["lon", "lng", "long"] },
    ],
  },
  {
    chave: "obras",
    rotulo: "Obras",
    descricao: "Obras públicas em qualquer estágio.",
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, sinonimos: ["obra", "descricao da obra", "objeto"] },
      { chave: "bairro", rotulo: "Bairro", tipo: "texto", obrigatorio: false, sinonimos: ["localidade", "local", "endereco"] },
      { chave: "progressoAtual", rotulo: "Progresso atual (%)", tipo: "percentual", obrigatorio: false, sinonimos: ["progresso", "execucao", "percentual executado", "andamento"] },
      { chave: "progressoEsperado", rotulo: "Progresso esperado (%)", tipo: "percentual", obrigatorio: false, sinonimos: ["previsto", "percentual previsto", "meta"] },
      { chave: "valorContrato", rotulo: "Valor do contrato", tipo: "moeda", obrigatorio: false, sinonimos: ["valor", "valor contratado", "contrato"] },
      { chave: "status", rotulo: "Status", tipo: "enum", obrigatorio: false, opcoes: ["planejada", "em_andamento", "atrasada", "concluida", "paralisada"], sinonimos: ["situacao", "estagio"] },
    ],
  },
  {
    chave: "licitacoes",
    rotulo: "Licitações",
    descricao: "Processos licitatórios.",
    campos: [
      { chave: "numero", rotulo: "Número", tipo: "texto", obrigatorio: true, sinonimos: ["n", "no", "numero do processo", "processo", "edital"] },
      { chave: "objeto", rotulo: "Objeto", tipo: "texto", obrigatorio: true, sinonimos: ["descricao", "objeto da licitacao"] },
      { chave: "modalidade", rotulo: "Modalidade", tipo: "texto", obrigatorio: false, sinonimos: ["tipo", "modalidade licitatoria"] },
      { chave: "valorEstimado", rotulo: "Valor estimado", tipo: "moeda", obrigatorio: false, sinonimos: ["valor", "valor de referencia", "estimativa"] },
      { chave: "fornecedor", rotulo: "Fornecedor", tipo: "texto", obrigatorio: false, sinonimos: ["contratada", "vencedor", "empresa"] },
      { chave: "status", rotulo: "Status", tipo: "enum", obrigatorio: false, opcoes: ["planejamento", "publicada", "em_disputa", "homologada", "cancelada"], sinonimos: ["situacao", "fase"] },
    ],
  },
  {
    chave: "investimentos",
    rotulo: "Investimentos",
    descricao: "Aportes por secretaria e competência.",
    campos: [
      { chave: "secretaria", rotulo: "Secretaria", tipo: "enum", obrigatorio: true, opcoes: ["saude", "educacao", "obras", "licitacoes"], sinonimos: ["area", "pasta"] },
      { chave: "valor", rotulo: "Valor", tipo: "moeda", obrigatorio: true, sinonimos: ["montante", "aporte", "despesa"] },
      { chave: "competencia", rotulo: "Competência (AAAA-MM)", tipo: "competencia", obrigatorio: true, sinonimos: ["mes", "periodo", "referencia", "mes de referencia"] },
      { chave: "descricao", rotulo: "Descrição", tipo: "texto", obrigatorio: false, sinonimos: ["historico", "detalhe", "observacao"] },
    ],
  },
];

export function tabelaImportavel(chave: string): TabelaImportavel | null {
  return TABELAS_IMPORTAVEIS.find((t) => t.chave === chave) ?? null;
}

// ── LEITURA DO CSV ──

/**
 * O Excel em português salva CSV com ponto e vírgula, porque a vírgula já é
 * o separador decimal. Adivinhar errado transforma a planilha inteira numa
 * coluna só, então a escolha é pelo separador que mais aparece FORA das
 * aspas na primeira linha.
 */
export function detectarSeparador(primeiraLinha: string): "," | ";" {
  let virgulas = 0;
  let pontosVirgula = 0;
  let dentroDeAspas = false;
  for (const caractere of primeiraLinha) {
    if (caractere === '"') dentroDeAspas = !dentroDeAspas;
    else if (!dentroDeAspas && caractere === ",") virgulas++;
    else if (!dentroDeAspas && caractere === ";") pontosVirgula++;
  }
  return pontosVirgula > virgulas ? ";" : ",";
}

export type CsvLido = { cabecalhos: string[]; linhas: string[][]; separador: "," | ";" };

/**
 * Leitor de CSV conforme a RFC 4180: campo entre aspas pode conter o
 * separador e quebra de linha, e `""` dentro das aspas é uma aspas literal.
 * Come o BOM que o Excel escreve e ignora linhas totalmente vazias — a
 * última linha em branco é o erro mais comum em planilha exportada.
 */
export function analisarCsv(texto: string): CsvLido {
  const limpo = texto.replace(/^﻿/, "");
  if (limpo.trim() === "") return { cabecalhos: [], linhas: [], separador: "," };

  const separador = detectarSeparador(primeiraLinhaLogica(limpo));

  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') dentroDeAspas = true;
    else if (c === separador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpo[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      campo = "";
      linha = [];
    } else {
      campo += c;
    }
  }
  linha.push(campo);
  linhas.push(linha);

  const naoVazias = linhas.filter((l) => l.some((c) => c.trim() !== ""));
  const [cabecalhos = [], ...resto] = naoVazias;

  return {
    cabecalhos: cabecalhos.map((c) => c.trim()),
    linhas: resto,
    separador,
  };
}

/** A primeira linha ignorando quebras dentro de aspas. */
function primeiraLinhaLogica(texto: string): string {
  let dentroDeAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '"') dentroDeAspas = !dentroDeAspas;
    else if (!dentroDeAspas && (c === "\n" || c === "\r")) return texto.slice(0, i);
  }
  return texto;
}

// ── MAPEAMENTO DE COLUNAS ──

export function normalizarCabecalho(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Adivinha qual coluna da planilha corresponde a cada campo nosso. Bate por
 * nome exato normalizado, depois pelos sinônimos, depois por conter o termo.
 * O resultado é uma SUGESTÃO: a tela mostra o mapeamento para a pessoa
 * conferir antes de gravar qualquer coisa.
 */
export function sugerirMapeamento(
  cabecalhos: string[],
  tabela: TabelaImportavel
): Record<string, number | null> {
  const normalizados = cabecalhos.map(normalizarCabecalho);
  const usados = new Set<number>();
  const mapa: Record<string, number | null> = {};

  for (const campo of tabela.campos) {
    const candidatos = [campo.chave, campo.rotulo, ...campo.sinonimos].map(normalizarCabecalho);

    let indice = normalizados.findIndex((h, i) => !usados.has(i) && candidatos.includes(h));

    if (indice === -1) {
      indice = normalizados.findIndex(
        (h, i) =>
          !usados.has(i) &&
          h.length > 2 &&
          candidatos.some((c) => c.length > 2 && (h.includes(c) || c.includes(h)))
      );
    }

    if (indice >= 0) usados.add(indice);
    mapa[campo.chave] = indice >= 0 ? indice : null;
  }

  return mapa;
}

// ── CONVERSÃO DE VALORES ──

/**
 * Número em formato de planilha brasileira.
 *
 * "1.234,56" é mil duzentos e trinta e quatro; "1,234.56" é o mesmo número
 * em formato americano. Quando os dois separadores aparecem, o ÚLTIMO é o
 * decimal. Com só um ponto sobra ambiguidade real ("1.234" pode ser 1234 ou
 * 1,234): tratamos como milhar quando há exatamente três dígitos depois e
 * mais de um antes, que é o caso comum em exportação brasileira.
 */
export function converterNumero(bruto: string): number | null {
  let texto = bruto.trim();
  if (texto === "") return null;

  const negativo = /^\(.*\)$/.test(texto) || texto.startsWith("-");
  texto = texto.replace(/^[-(]|\)$/g, "");
  texto = texto.replace(/r\$|%|\s/gi, "");
  if (texto === "") return null;

  const ultimaVirgula = texto.lastIndexOf(",");
  const ultimoPonto = texto.lastIndexOf(".");

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    const decimal = ultimaVirgula > ultimoPonto ? "," : ".";
    const milhar = decimal === "," ? "." : ",";
    texto = texto.split(milhar).join("").replace(decimal, ".");
  } else if (ultimaVirgula >= 0) {
    texto = texto.replace(",", ".");
  } else if (ultimoPonto >= 0) {
    // Só ponto: ambíguo. "1.234" é mil duzentos e trinta e quatro numa
    // exportação brasileira, mas "0.750" é setenta e cinco centésimos —
    // ninguém escreve zero milhar. A regra é: três casas depois e a parte
    // inteira não começando com zero significa separador de milhar.
    const inteira = texto.slice(0, ultimoPonto);
    const decimais = texto.length - ultimoPonto - 1;
    const soUmPonto = texto.indexOf(".") === ultimoPonto;
    if (soUmPonto && decimais === 3 && inteira !== "" && !inteira.startsWith("0")) {
      texto = texto.replace(".", "");
    }
  }

  if (!/^\d*\.?\d+$/.test(texto)) return null;
  const numero = Number(texto);
  if (!Number.isFinite(numero)) return null;
  return negativo ? -numero : numero;
}

/** "2026-08", "08/2026", "ago/2026" → "2026-08". */
export function converterCompetencia(bruto: string): string | null {
  const texto = bruto.trim();
  if (texto === "") return null;

  const iso = texto.match(/^(\d{4})[-/](\d{1,2})$/);
  if (iso) return formatarCompetencia(Number(iso[1]), Number(iso[2]));

  const br = texto.match(/^(\d{1,2})[-/](\d{4})$/);
  if (br) return formatarCompetencia(Number(br[2]), Number(br[1]));

  const dataCompleta = texto.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (dataCompleta) return formatarCompetencia(Number(dataCompleta[1]), Number(dataCompleta[2]));

  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const porExtenso = normalizarCabecalho(texto).match(/^([a-z]{3})[a-z]* (\d{4})$/);
  if (porExtenso) {
    const mes = MESES.indexOf(porExtenso[1]);
    if (mes >= 0) return formatarCompetencia(Number(porExtenso[2]), mes + 1);
  }

  return null;
}

function formatarCompetencia(ano: number, mes: number): string | null {
  if (mes < 1 || mes > 12) return null;
  if (ano < 1900 || ano > 2200) return null;
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

/** Casa o texto da planilha com uma das opções do enum. */
export function converterEnum(bruto: string, opcoes: string[]): string | null {
  const alvo = normalizarCabecalho(bruto);
  if (alvo === "") return null;

  const direto = opcoes.find((o) => normalizarCabecalho(o) === alvo);
  if (direto) return direto;

  // "Em andamento" → "em_andamento"; "Concluída" → "concluida".
  const comUnderscore = opcoes.find((o) => normalizarCabecalho(o.replace(/_/g, " ")) === alvo);
  if (comUnderscore) return comUnderscore;

  return null;
}

// ── VALIDAÇÃO LINHA A LINHA ──

export type ErroLinha = { linha: number; campo: string; valor: string; motivo: string };

export type ResultadoImportacao = {
  cabecalhos: string[];
  separador: "," | ";";
  mapeamento: Record<string, number | null>;
  /** Colunas da planilha que não casaram com nenhum campo nosso. */
  colunasIgnoradas: string[];
  /** Campos obrigatórios sem coluna correspondente — impede a importação. */
  camposFaltando: string[];
  linhas: Record<string, unknown>[];
  erros: ErroLinha[];
  totalLidas: number;
};

/**
 * Lê o arquivo e devolve o que dá para gravar mais o que deu errado, sem
 * tocar no banco. Uma linha ruim NÃO derruba as outras: a prefeitura corrige
 * as três linhas com defeito depois, em vez de refazer a planilha inteira.
 */
export function prepararImportacao(entrada: {
  tabela: TabelaImportavel;
  texto: string;
  /** Sobrescreve a sugestão automática, quando a pessoa corrige na tela. */
  mapeamento?: Record<string, number | null>;
}): ResultadoImportacao {
  const { cabecalhos, linhas: brutas, separador } = analisarCsv(entrada.texto);
  const mapeamento = entrada.mapeamento ?? sugerirMapeamento(cabecalhos, entrada.tabela);

  const usadas = new Set(Object.values(mapeamento).filter((i): i is number => i !== null));
  const colunasIgnoradas = cabecalhos.filter((_, i) => !usadas.has(i));
  const camposFaltando = entrada.tabela.campos
    .filter((c) => c.obrigatorio && mapeamento[c.chave] === null)
    .map((c) => c.rotulo);

  const linhas: Record<string, unknown>[] = [];
  const erros: ErroLinha[] = [];

  brutas.forEach((bruta, indice) => {
    // +2: a planilha começa em 1 e a primeira linha é o cabeçalho, então
    // o número aqui é o mesmo que a pessoa vê no Excel.
    const numeroLinha = indice + 2;
    const registro: Record<string, unknown> = {};
    let linhaValida = true;

    for (const campo of entrada.tabela.campos) {
      const coluna = mapeamento[campo.chave];
      const bruto = coluna === null || coluna === undefined ? "" : (bruta[coluna] ?? "").trim();

      if (bruto === "") {
        if (campo.obrigatorio) {
          erros.push({ linha: numeroLinha, campo: campo.rotulo, valor: "", motivo: "obrigatório e veio vazio" });
          linhaValida = false;
        }
        continue;
      }

      const convertido = converterCampo(campo, bruto);
      if (convertido === undefined) {
        erros.push({ linha: numeroLinha, campo: campo.rotulo, valor: bruto, motivo: motivoDeErro(campo) });
        if (campo.obrigatorio) linhaValida = false;
        continue;
      }

      registro[campo.chave] = convertido;
    }

    if (linhaValida) linhas.push(registro);
  });

  return {
    cabecalhos,
    separador,
    mapeamento,
    colunasIgnoradas,
    camposFaltando,
    linhas,
    erros,
    totalLidas: brutas.length,
  };
}

/** `undefined` = não deu para converter. `null` nunca acontece aqui. */
function converterCampo(campo: CampoImportavel, bruto: string): unknown | undefined {
  switch (campo.tipo) {
    case "texto":
      return bruto;
    case "numero":
    case "moeda":
    case "percentual": {
      const numero = converterNumero(bruto);
      if (numero === null) return undefined;
      // Percentual escrito como fração (0,45) vira 45 — planilha de
      // prefeitura mistura os dois formatos na mesma coluna.
      if (campo.tipo === "percentual" && numero > 0 && numero <= 1 && bruto.includes(",")) {
        return numero * 100;
      }
      return numero;
    }
    case "competencia": {
      const competencia = converterCompetencia(bruto);
      return competencia ?? undefined;
    }
    case "enum": {
      const valor = converterEnum(bruto, campo.opcoes ?? []);
      return valor ?? undefined;
    }
  }
}

function motivoDeErro(campo: CampoImportavel): string {
  if (campo.tipo === "enum") return `valor precisa ser um de: ${(campo.opcoes ?? []).join(", ")}`;
  if (campo.tipo === "competencia") return "data precisa ser AAAA-MM, MM/AAAA ou mmm/AAAA";
  return "não é um número reconhecível";
}
