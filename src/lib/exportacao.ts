// ── EXPORTAÇÃO DE DADOS DO MUNICÍPIO ──
//
// Os dados são da prefeitura, não nossos. Este módulo produz a exportação
// completa em formato aberto (JSON e CSV), sem depender de nós para nada:
// nenhum plano contratado libera ou bloqueia a exportação, e ela não passa
// por aprovação. Isso é deliberado — prender dado de município para segurar
// contrato é o oposto do que o produto promete, e num serviço público vira
// problema de verdade quando a prefeitura decide trocar de fornecedor.
//
// Aqui fica só a parte PURA (transformar linhas em arquivo). As consultas ao
// banco ficam em ./dados-exportacao.ts, para este arquivo seguir testável
// sem banco.

export type ChaveTabela =
  | "prefeitura"
  | "usuarios"
  | "sistemas_conectados"
  | "dashboard_snapshots"
  | "saude_indicadores"
  | "unidades_saude"
  | "educacao_indicadores"
  | "escolas"
  | "obras"
  | "licitacoes"
  | "investimentos"
  | "alertas"
  | "alertas_sugeridos"
  | "atendimentos"
  | "config_publica";

export type TabelaExportavel = {
  chave: ChaveTabela;
  rotulo: string;
  descricao: string;
  /** Colunas apagadas antes de sair — credencial nunca é "dado do município". */
  camposRemovidos: string[];
};

export const TABELAS_EXPORTAVEIS: TabelaExportavel[] = [
  {
    chave: "prefeitura",
    rotulo: "Prefeitura",
    descricao: "Cadastro do município: nome, CNPJ, população, mandato e módulos contratados.",
    camposRemovidos: [],
  },
  {
    chave: "usuarios",
    rotulo: "Usuários",
    descricao: "Quem tem acesso ao sistema, com cargo e secretaria.",
    camposRemovidos: ["senhaHash"],
  },
  {
    chave: "sistemas_conectados",
    rotulo: "Sistemas conectados",
    descricao: "Sistemas externos sinalizados no cadastro e o status de cada um.",
    camposRemovidos: [],
  },
  {
    chave: "dashboard_snapshots",
    rotulo: "Financeiro (histórico)",
    descricao: "Receita, despesas, saldo e índice de transparência ao longo do tempo.",
    camposRemovidos: [],
  },
  {
    chave: "saude_indicadores",
    rotulo: "Saúde — indicadores",
    descricao: "Tempo de atendimento, médicos ativos, faltas e estoque de medicamentos.",
    camposRemovidos: [],
  },
  {
    chave: "unidades_saude",
    rotulo: "Saúde — unidades",
    descricao: "UBS, postos, hospitais e SAMU cadastrados, com bairro e coordenadas.",
    camposRemovidos: [],
  },
  {
    chave: "educacao_indicadores",
    rotulo: "Educação — indicadores",
    descricao: "Frequência, nota média, alunos no transporte e professores ativos.",
    camposRemovidos: [],
  },
  {
    chave: "escolas",
    rotulo: "Educação — escolas",
    descricao: "Escolas cadastradas, com bairro, evasão e coordenadas.",
    camposRemovidos: [],
  },
  {
    chave: "obras",
    rotulo: "Obras",
    descricao: "Obras com progresso atual e esperado, valor de contrato e status.",
    camposRemovidos: [],
  },
  {
    chave: "licitacoes",
    rotulo: "Licitações",
    descricao: "Processos licitatórios, modalidade, valor estimado, fornecedor e prazo.",
    camposRemovidos: [],
  },
  {
    chave: "investimentos",
    rotulo: "Investimentos",
    descricao: "Aportes por secretaria e competência, manuais ou importados do SICONFI.",
    camposRemovidos: [],
  },
  {
    chave: "alertas",
    rotulo: "Alertas",
    descricao: "Alertas oficiais, com prioridade, secretaria e se já foram resolvidos.",
    camposRemovidos: [],
  },
  {
    chave: "alertas_sugeridos",
    rotulo: "Sugestões de alerta (IA)",
    descricao: "Rascunhos sugeridos pela IA e ainda não aprovados por uma pessoa.",
    camposRemovidos: [],
  },
  {
    chave: "atendimentos",
    rotulo: "Protocolos e ouvidoria",
    descricao:
      "Manifestações do cidadão com assunto, mensagem, status e resposta. " +
      "Manifestações anônimas saem sem identificação.",
    camposRemovidos: ["chaveConsulta"],
  },
  {
    chave: "config_publica",
    rotulo: "Configuração do portal público",
    descricao: "Endereço público do município, WhatsApp e o que fica visível no portal.",
    camposRemovidos: [],
  },
];

// Ficam de fora, e o motivo importa: `tokens_recuperacao_senha` e
// `tentativas_login` são mecanismo de autenticação (exportar é entregar
// material de ataque, não dado do município); `limites_uso`,
// `insights_cache` e `central_inteligente` são cache — somem e são
// recalculados, não são informação que a prefeitura produziu.
export const TABELAS_NAO_EXPORTADAS = [
  { nome: "tokens_recuperacao_senha", motivo: "material de autenticação" },
  { nome: "tentativas_login", motivo: "material de autenticação" },
  { nome: "limites_uso", motivo: "cache de controle de uso" },
  { nome: "insights_cache", motivo: "cache regenerável de texto da IA" },
  { nome: "central_inteligente", motivo: "cache regenerável de texto da IA" },
] as const;

export function tabelaPorChave(chave: string): TabelaExportavel | null {
  return TABELAS_EXPORTAVEIS.find((t) => t.chave === chave) ?? null;
}

// ── LIMPEZA ──

type Linha = Record<string, unknown>;

/**
 * Tira da linha o que nunca deve sair, tabela por tabela.
 *
 * Além dos campos listados em `camposRemovidos`, `atendimentos` recebe um
 * tratamento próprio: a Lei 13.460/2017 garante manifestação anônima, e o
 * anonimato não pode depender de o formulário ter deixado os campos vazios.
 * Se `anonimo` for verdadeiro, nome/e-mail/telefone saem zerados aqui, mesmo
 * que estejam preenchidos no banco por qualquer motivo.
 */
export function higienizarLinhas(chave: ChaveTabela, linhas: Linha[]): Linha[] {
  const tabela = tabelaPorChave(chave);
  const remover = new Set(tabela?.camposRemovidos ?? []);

  return linhas.map((linha) => {
    const limpa: Linha = {};
    for (const [campo, valor] of Object.entries(linha)) {
      if (remover.has(campo)) continue;
      limpa[campo] = valor;
    }

    if (chave === "atendimentos" && ehVerdadeiro(limpa.anonimo)) {
      limpa.nome = null;
      limpa.email = null;
      limpa.telefone = null;
    }

    return limpa;
  });
}

// O SQLite dos testes guarda boolean como 0/1; o Postgres, como boolean.
function ehVerdadeiro(valor: unknown): boolean {
  return valor === true || valor === 1 || valor === "true" || valor === "t";
}

// ── CSV ──

const BOM = "﻿"; // marca de ordem de bytes — ver comentário em paraCsv()
const QUEBRA = "\r\n";

/**
 * Uma célula que começa com =, +, - ou @ é interpretada como fórmula pelo
 * Excel e pelo LibreOffice ao abrir o arquivo. Boa parte deste conteúdo é
 * texto que o cidadão digitou na ouvidoria, ou seja, entrada não confiável:
 * sem neutralizar, uma manifestação poderia executar algo na máquina do
 * servidor que abrisse a planilha. O apóstrofo na frente força leitura como
 * texto e não aparece na célula.
 */
function neutralizarFormula(texto: string): string {
  return /^[=+\-@\t\r]/.test(texto) ? "'" + texto : texto;
}

export function escaparCampoCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return "";

  let texto: string;
  if (typeof valor === "boolean") texto = valor ? "true" : "false";
  else if (valor instanceof Date) texto = valor.toISOString();
  else if (typeof valor === "object") texto = JSON.stringify(valor);
  else texto = String(valor);

  texto = neutralizarFormula(texto);

  // Aspas, separador ou quebra de linha no conteúdo, e espaço nas pontas,
  // exigem aspas duplas ao redor; cada aspas interna vira duas (RFC 4180).
  if (/["\n\r,;]/.test(texto) || texto !== texto.trim()) {
    return '"' + texto.replace(/"/g, '""') + '"';
  }
  return texto;
}

/**
 * Gera o CSV. Sai com BOM porque, sem ele, o Excel em português abre UTF-8
 * como Latin-1 e "Educação" vira "EducaÃ§Ã£o" — a prefeitura recebe um
 * arquivo aparentemente corrompido e conclui que a exportação não funciona.
 *
 * As colunas vêm da união das chaves de TODAS as linhas, não só da primeira:
 * senão uma linha com campo opcional preenchido perderia esse campo sem
 * ninguém perceber.
 */
export function paraCsv(linhas: Linha[]): string {
  if (linhas.length === 0) return BOM;

  const colunas: string[] = [];
  const vistas = new Set<string>();
  for (const linha of linhas) {
    for (const campo of Object.keys(linha)) {
      if (!vistas.has(campo)) {
        vistas.add(campo);
        colunas.push(campo);
      }
    }
  }

  const cabecalho = colunas.map(escaparCampoCsv).join(",");
  const corpo = linhas.map((linha) =>
    colunas.map((coluna) => escaparCampoCsv(linha[coluna])).join(",")
  );

  return BOM + [cabecalho, ...corpo].join(QUEBRA) + QUEBRA;
}

// ── PACOTE JSON ──

export const VERSAO_EXPORTACAO = 1;

export type PacoteExportacao = {
  versao: number;
  geradoEm: string;
  geradoPor: string;
  municipio: string;
  observacoes: string[];
  tabelas: Record<string, Linha[]>;
};

export function montarPacote(entrada: {
  municipio: string;
  geradoPor: string;
  geradoEm: string;
  tabelas: Partial<Record<ChaveTabela, Linha[]>>;
}): PacoteExportacao {
  const tabelas: Record<string, Linha[]> = {};
  // Percorre a definição, e não o que veio: uma tabela vazia precisa aparecer
  // como lista vazia no arquivo. Sem isso, "não tem obra cadastrada" e "a
  // exportação esqueceu as obras" ficam indistinguíveis para quem recebe.
  for (const definicao of TABELAS_EXPORTAVEIS) {
    tabelas[definicao.chave] = higienizarLinhas(
      definicao.chave,
      entrada.tabelas[definicao.chave] ?? []
    );
  }

  return {
    versao: VERSAO_EXPORTACAO,
    geradoEm: entrada.geradoEm,
    geradoPor: entrada.geradoPor,
    municipio: entrada.municipio,
    observacoes: [
      "Exportação completa dos dados desta prefeitura, em formato aberto.",
      "Manifestações anônimas de ouvidoria saem sem identificação, conforme a Lei 13.460/2017.",
      "Senhas e chaves de consulta não são exportadas: são material de autenticação, não dado do município.",
      ...TABELAS_NAO_EXPORTADAS.map((t) => `Tabela fora da exportação: ${t.nome} (${t.motivo}).`),
    ],
    tabelas,
  };
}

// ── NOME DO ARQUIVO ──

export function apelidoMunicipio(municipio: string): string {
  const semAcento = municipio.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const apelido = semAcento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return apelido || "municipio";
}

/** Ex.: cidadeia-barro-duro-obras-2026-08-29.csv */
export function nomeArquivo(entrada: {
  municipio: string;
  sufixo: string;
  extensao: "json" | "csv";
  data: Date;
}): string {
  const dia = entrada.data.toISOString().slice(0, 10);
  const base = ["cidadeia", apelidoMunicipio(entrada.municipio), entrada.sufixo, dia].join("-");
  return `${base}.${entrada.extensao}`;
}
