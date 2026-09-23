// ── A REDE DE ESCOLAS, DO CADASTRO OFICIAL ──
//
// Na saúde a rede entra sozinha: o CNES tem API pública (src/lib/cnes.ts).
// Na educação não existe equivalente — o Catálogo de Escolas do INEP é um
// portal de BI, o dados.gov.br exige chave e o dadosabertos.mec.gov.br
// responde 403 a qualquer robô. Testado, não suposto.
//
// Então a automação é outra: o município exporta o arquivo do Catálogo de
// Escolas (ou os microdados do Censo Escolar) e joga aqui. Este módulo
// aceita os dois formatos, em qualquer separador e nos dois encodings que
// o INEP publica, e devolve a rede pronta — com código INEP, dependência,
// etapas e matrícula declarada. Um arquivo, uma rede.
//
// Nada aqui toca banco nem rede: são regras puras, testáveis.

export const DEPENDENCIAS = ["municipal", "estadual", "federal", "privada"] as const;
export type Dependencia = (typeof DEPENDENCIAS)[number];

export const ROTULO_DEPENDENCIA: Record<Dependencia, string> = {
  municipal: "Municipal",
  estadual: "Estadual",
  federal: "Federal",
  privada: "Privada",
};

export type Localizacao = "urbana" | "rural";
export type SituacaoEscola = "ativa" | "paralisada" | "extinta";

/** O que o município realmente administra — o resto entra como contexto. */
export const DEPENDENCIA_DO_MUNICIPIO: Dependencia = "municipal";

export type EscolaImportada = {
  codigoInep: string | null;
  nome: string;
  codigoMunicipio: string | null;
  municipio: string | null;
  uf: string | null;
  dependencia: Dependencia | null;
  localizacao: Localizacao | null;
  situacao: SituacaoEscola | null;
  endereco: string | null;
  telefone: string | null;
  etapas: string | null;
  porte: string | null;
  matriculas: number | null;
  latitude: number | null;
  longitude: number | null;
};

// ── leitura do arquivo ──

/**
 * O INEP publica ora em UTF-8, ora em Windows-1252. Abrir o arquivo errado
 * transforma "Escola Municipal João Pessoa" em "JoÃ£o" — e a secretária
 * acha que o sistema está quebrado. Decide pelo próprio conteúdo.
 */
export function decodificarArquivo(bytes: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  if (!utf8.includes("�")) return utf8;
  try {
    return new TextDecoder("windows-1252").decode(bytes);
  } catch {
    return utf8;
  }
}

/** Separador mais frequente na primeira linha — o INEP usa ";", exportações de planilha usam "," ou tab. */
export function detectarSeparador(primeiraLinha: string): string {
  const candidatos = [";", ",", "\t", "|"];
  let melhor = ";";
  let maior = -1;
  for (const c of candidatos) {
    const n = primeiraLinha.split(c).length - 1;
    if (n > maior) {
      maior = n;
      melhor = c;
    }
  }
  return melhor;
}

/** CSV de verdade: aspas, aspas dobradas dentro do campo e quebra de linha dentro de aspas. */
export function lerCsv(texto: string, separador: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  const limpo = texto.replace(/^﻿/, "");
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i++;
        } else dentroDeAspas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') dentroDeAspas = true;
    else if (c === separador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c !== "\r") campo += c;
  }
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Nomes de coluna dos dois formatos que o INEP publica, na mesma tabela:
// o do Catálogo de Escolas (legível) e o dos microdados (siglas).
const COLUNAS: Record<keyof EscolaImportada, string[]> = {
  codigoInep: ["codigoinep", "coentidade", "codigodaescola", "codescola", "codigoescola", "codigo"],
  nome: ["escola", "noentidade", "nomedaescola", "nomeescola", "nome"],
  codigoMunicipio: ["comunicipio", "codigomunicipio", "codmunicipio", "codigoibge", "codigodomunicipio"],
  municipio: ["municipio", "nomunicipio", "nomedomunicipio"],
  uf: ["uf", "sguf", "siglauf", "estado", "nouf"],
  dependencia: ["dependenciaadministrativa", "tpdependencia", "dependencia", "rede"],
  localizacao: ["localizacao", "tplocalizacao", "localizacaozona"],
  situacao: ["tpsituacaofuncionamento", "situacaodefuncionamento", "situacaofuncionamento", "situacao"],
  endereco: ["endereco", "dsendereco", "logradouro"],
  telefone: ["telefone", "nutelefone", "ddd"],
  etapas: ["etapasemodalidadedeensinooferecidas", "etapasemodalidades", "etapas", "etapadeensino"],
  porte: ["portedaescola", "porte"],
  matriculas: ["qtmatbas", "matriculas", "qtdmatriculas", "totaldematriculas", "numerodematriculas", "qtmatriculas"],
  latitude: ["latitude", "nulatitude"],
  longitude: ["longitude", "nulongitude"],
};

function mapearColunas(cabecalho: string[]): Partial<Record<keyof EscolaImportada, number>> {
  const normalizado = cabecalho.map(normalizar);
  const mapa: Partial<Record<keyof EscolaImportada, number>> = {};
  for (const [campo, apelidos] of Object.entries(COLUNAS) as [keyof EscolaImportada, string[]][]) {
    for (const apelido of apelidos) {
      const i = normalizado.indexOf(apelido);
      if (i >= 0) {
        mapa[campo] = i;
        break;
      }
    }
  }
  return mapa;
}

// ── normalização dos valores ──

export function lerDependencia(valor: string): Dependencia | null {
  const v = normalizar(valor);
  if (!v) return null;
  // Microdados: TP_DEPENDENCIA 1=Federal 2=Estadual 3=Municipal 4=Privada.
  if (v === "1") return "federal";
  if (v === "2") return "estadual";
  if (v === "3") return "municipal";
  if (v === "4") return "privada";
  if (v.includes("municipal")) return "municipal";
  if (v.includes("estadual")) return "estadual";
  if (v.includes("federal")) return "federal";
  if (v.includes("privada") || v.includes("particular")) return "privada";
  return null;
}

export function lerLocalizacao(valor: string): Localizacao | null {
  const v = normalizar(valor);
  if (!v) return null;
  if (v === "1") return "urbana";
  if (v === "2") return "rural";
  if (v.includes("urbana")) return "urbana";
  if (v.includes("rural")) return "rural";
  return null;
}

export function lerSituacao(valor: string): SituacaoEscola | null {
  const v = normalizar(valor);
  if (!v) return null;
  // Microdados: 1=Em Atividade 2=Paralisada 3=Extinta 4=Extinta no ano anterior.
  if (v === "1") return "ativa";
  if (v === "2") return "paralisada";
  if (v === "3" || v === "4") return "extinta";
  if (v.includes("atividade") || v.includes("ativa")) return "ativa";
  if (v.includes("paralisada")) return "paralisada";
  if (v.includes("extinta")) return "extinta";
  return null;
}

function lerNumero(valor: string): number | null {
  const limpo = valor.trim().replace(/\./g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

function lerInteiro(valor: string): number | null {
  const n = lerNumero(valor);
  return n === null ? null : Math.round(n);
}

function texto(valor: string | undefined): string | null {
  const t = (valor ?? "").trim();
  return t === "" || normalizar(t) === "naoinformado" ? null : t;
}

export type ResultadoLeitura = {
  escolas: EscolaImportada[];
  /** Colunas que o arquivo tem e o sistema reconheceu — mostrado ao usuário. */
  colunasLidas: string[];
  erro: string | null;
};

/**
 * Transforma o arquivo do INEP na rede. Aceita o Catálogo de Escolas e os
 * microdados do Censo; ignora colunas que não conhece em vez de recusar o
 * arquivo inteiro — arquivo do INEP muda de ano para ano.
 */
export function lerArquivoDeEscolas(texto_: string): ResultadoLeitura {
  const primeiraQuebra = texto_.indexOf("\n");
  const primeiraLinha = primeiraQuebra >= 0 ? texto_.slice(0, primeiraQuebra) : texto_;
  const separador = detectarSeparador(primeiraLinha);
  const linhas = lerCsv(texto_, separador);
  if (linhas.length < 2) {
    return { escolas: [], colunasLidas: [], erro: "O arquivo não tem cabeçalho e linhas de escola." };
  }

  const cabecalho = linhas[0]!;
  const mapa = mapearColunas(cabecalho);
  if (mapa.nome === undefined) {
    return {
      escolas: [],
      colunasLidas: [],
      erro:
        "Não achei a coluna com o nome da escola. Exporte pelo Catálogo de Escolas do INEP ou use os microdados do Censo Escolar sem editar o cabeçalho.",
    };
  }

  const campo = (linha: string[], chave: keyof EscolaImportada) => {
    const i = mapa[chave];
    return i === undefined ? "" : (linha[i] ?? "");
  };

  const escolas: EscolaImportada[] = [];
  for (const linha of linhas.slice(1)) {
    const nome = texto(campo(linha, "nome"));
    if (!nome) continue;
    escolas.push({
      codigoInep: texto(campo(linha, "codigoInep"))?.replace(/\D/g, "") || null,
      nome,
      codigoMunicipio: texto(campo(linha, "codigoMunicipio"))?.replace(/\D/g, "") || null,
      municipio: texto(campo(linha, "municipio")),
      uf: texto(campo(linha, "uf"))?.toUpperCase().slice(0, 2) ?? null,
      dependencia: lerDependencia(campo(linha, "dependencia")),
      localizacao: lerLocalizacao(campo(linha, "localizacao")),
      situacao: lerSituacao(campo(linha, "situacao")),
      endereco: texto(campo(linha, "endereco")),
      telefone: texto(campo(linha, "telefone")),
      etapas: texto(campo(linha, "etapas")),
      porte: texto(campo(linha, "porte")),
      matriculas: lerInteiro(campo(linha, "matriculas")),
      latitude: lerNumero(campo(linha, "latitude")),
      longitude: lerNumero(campo(linha, "longitude")),
    });
  }

  const colunasLidas = (Object.keys(mapa) as (keyof EscolaImportada)[]).map((c) => cabecalho[mapa[c]!]!.trim());
  return { escolas, colunasLidas, erro: null };
}

/**
 * Fica só o que é daquele município. O arquivo do INEP costuma vir com o
 * estado inteiro: sem este filtro, uma prefeitura de 5 mil habitantes
 * importaria 9 mil escolas.
 *
 * O código IBGE do município tem 7 dígitos; o arquivo às vezes traz 6
 * (sem o dígito verificador), por isso a comparação é pelos 6 primeiros.
 */
export function doMunicipio(escola: EscolaImportada, codigoIbge: string | null, nomeMunicipio?: string | null): boolean {
  if (codigoIbge && escola.codigoMunicipio) {
    return escola.codigoMunicipio.slice(0, 6) === codigoIbge.slice(0, 6);
  }
  if (nomeMunicipio && escola.municipio) {
    return normalizar(escola.municipio) === normalizar(nomeMunicipio);
  }
  // Sem como comparar: o arquivo provavelmente já é só do município.
  return true;
}

/** Extinta não entra na rede; paralisada entra, porque prédio parado continua sendo problema do prefeito. */
export function entraNaRede(escola: EscolaImportada): boolean {
  return escola.situacao !== "extinta";
}

// ── idade do cadastro ──

/**
 * O Censo Escolar é anual, com data de referência na última quarta-feira
 * de maio (Decreto 6.425/2008). Cadastro de dois anos atrás não descreve
 * mais a rede: escola fechou, creche abriu, turma mudou de prédio.
 */
export const ANOS_CENSO_VELHO = 1;

export function censoVelho(anoDoCenso: number | null, hoje: Date = new Date()): boolean {
  if (anoDoCenso === null) return false;
  return hoje.getUTCFullYear() - anoDoCenso > ANOS_CENSO_VELHO;
}

/**
 * O ano do Censo que já deveria estar na mão. O resultado sai no ano
 * seguinte à coleta, então até o meio do ano o mais novo disponível é o
 * do ano anterior.
 */
export function censoMaisRecenteDisponivel(hoje: Date = new Date()): number {
  const ano = hoje.getUTCFullYear();
  // Os dados do Censo de um ano saem por volta de novembro/dezembro.
  return hoje.getUTCMonth() >= 10 ? ano : ano - 1;
}
