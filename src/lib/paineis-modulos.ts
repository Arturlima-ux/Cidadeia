import { formatarMoeda } from "@/lib/formatadores";

// ── O MOCKUP DE PREÇOS REPRODUZ A TELA REAL, BLOCO POR BLOCO ──
//
// A versão anterior tinha estrutura própria — três cartões, um medidor
// circular e um cartão "Aguardando aprovação" — que não correspondia a
// NENHUMA tela do painel. Ao comparar lado a lado, a pessoa via coisas no
// desenho que não existiam no produto, e coisas no produto que o desenho não
// mostrava. Corrigir só os rótulos não bastou.
//
// Cada módulo agora descreve a tela real dele com os mesmos blocos que ela
// tem: título (o h1 de verdade), Insight da IA (onde a tela tem), cartões de
// indicador (onde a tela tem), contadores de prazo (Atendimento), aviso e
// lista (Obras e Licitações). Bloco que a tela não tem, o mockup não tem.
//
// Os NÚMEROS são inventados, de uma "Prefeitura Modelo". Os rótulos, títulos
// e a forma são os da tela — e tests/paineis-modulos.test.ts confere cada
// rótulo contra o código da tela correspondente.

export type CartaoModulo = { label: string; valor: string };
export type ContadorPrazo = { n: number; rotulo: string; tom: "urgente" | "medio" | "neutro" };
export type ItemLista = {
  nome: string;
  sub?: string;
  pilula?: { label: string; tom: "positivo" | "negativo" | "andamento" | "neutro" };
  progresso?: { atual: number; esperado: number };
};

export type PainelModulo = {
  chave: string;
  nomeModulo: string;
  /** O h1 da tela real. */
  titulo: string;
  /** Caminho real da tela, mostrado na barra do frame. */
  caminho: string;
  /** Texto do Insight da IA, no formato que a análise local produz. */
  insight?: string;
  /** Cartões de indicador, na ordem e com os rótulos da tela. */
  cartoes?: CartaoModulo[];
  /** Contadores do painel "Prazo de resposta" (Atendimento). */
  prazos?: ContadorPrazo[];
  /** Aviso no topo da lista (Obras, Licitações). */
  aviso?: { nivel: "urgente" | "medio" | "info"; titulo: string; itens: string[] };
  /** Lista de itens, com o cabeçalho que a tela usa. */
  lista?: { cabecalho: string; itens: ItemLista[] };
};

export const PAINEIS_MODULOS: PainelModulo[] = [
  {
    chave: "essencial",
    nomeModulo: "Essencial",
    titulo: "Atendimento ao cidadão",
    caminho: "/dashboard/atendimento",
    prazos: [
      { n: 0, rotulo: "vencidos", tom: "urgente" },
      { n: 3, rotulo: "vencendo", tom: "medio" },
      { n: 11, rotulo: "no prazo", tom: "neutro" },
    ],
    lista: {
      cabecalho: "Aguardando resposta (14)",
      itens: [
        {
          nome: "202609-K7M3PQ",
          sub: "Iluminação pública · Rua das Flores, bairro Centro",
          pilula: { label: "Em análise", tom: "andamento" },
        },
        {
          nome: "202609-H2XW9T",
          sub: "Pedido de informação · contratos de transporte escolar",
          pilula: { label: "Em análise", tom: "andamento" },
        },
        {
          nome: "202609-R8CN4V",
          sub: "Coleta de lixo · bairro Alto da Serra",
          pilula: { label: "Aberto", tom: "neutro" },
        },
      ],
    },
  },
  {
    chave: "gestao",
    nomeModulo: "Gestão",
    titulo: "Visão Geral",
    caminho: "/dashboard",
    insight:
      "Saldo positivo de R$ 125,5 mil no período, mas a despesa cresceu 4,2% acima da receita. " +
      "Ação sugerida: peça à Secretaria de Finanças a despesa aberta por função — a média esconde onde o crescimento está.",
    cartoes: [
      { label: "Receita", valor: formatarMoeda(482300) },
      { label: "Despesas", valor: formatarMoeda(356800) },
      { label: "Saldo", valor: formatarMoeda(125500) },
      { label: "Eficiência da gestão", valor: "78%" },
    ],
  },
  {
    chave: "saude",
    nomeModulo: "Saúde",
    titulo: "Secretaria da Saúde",
    caminho: "/dashboard/secretarias/saude",
    insight:
      "Faltas de pacientes em 12%, acima do limite de 10%. " +
      "Ação sugerida: peça à Secretaria de Saúde o relatório de faltas por unidade para saber onde os 12% se concentram.",
    cartoes: [
      { label: "Tempo médio de atendimento", valor: "38 min" },
      { label: "Médicos ativos", valor: "46" },
      { label: "Faltas", valor: "12%" },
      { label: "Estoque de medicamentos", valor: "84%" },
    ],
  },
  {
    chave: "educacao",
    nomeModulo: "Educação",
    titulo: "Secretaria da Educação",
    caminho: "/dashboard/secretarias/educacao",
    insight:
      "Frequência média em 71%, abaixo do limite de 75%. " +
      "Ação sugerida: peça à Secretaria de Educação a frequência aberta por escola — a média de 71% esconde onde a queda está.",
    cartoes: [
      { label: "Frequência", valor: "71%" },
      { label: "Nota média", valor: "7,2" },
      { label: "Alunos no transporte", valor: "312" },
      { label: "Professores ativos", valor: "58" },
    ],
  },
  {
    chave: "obras",
    nomeModulo: "Obras",
    titulo: "Obras",
    caminho: "/dashboard/secretarias/obras",
    insight:
      "Uma obra com progresso 15 pontos abaixo do esperado para a data. " +
      "Ação sugerida: peça à Secretaria de Obras o cronograma atualizado da Reforma da UBS Norte antes da próxima medição.",
    aviso: {
      nivel: "urgente",
      titulo: "1 obra com progresso abaixo do esperado",
      itens: ["Reforma da UBS Norte: 45% concluído (esperado: 60%)"],
    },
    lista: {
      cabecalho: "Todas as obras (24)",
      itens: [
        {
          nome: "Reforma da UBS Norte",
          sub: "Bairro Norte",
          pilula: { label: "Atrasada", tom: "negativo" },
          progresso: { atual: 45, esperado: 60 },
        },
        {
          nome: "Pavimentação da Av. Beira-Rio",
          sub: "Centro",
          pilula: { label: "Em andamento", tom: "andamento" },
          progresso: { atual: 72, esperado: 70 },
        },
        {
          nome: "Creche Municipal Jardim",
          sub: "Jardim das Oliveiras",
          pilula: { label: "Concluída", tom: "positivo" },
          progresso: { atual: 100, esperado: 100 },
        },
      ],
    },
  },
  {
    chave: "licitacoes",
    nomeModulo: "Licitações",
    titulo: "Licitações",
    caminho: "/dashboard/secretarias/licitacoes",
    insight:
      "Quatro processos com observação de risco registrada, dois deles do mesmo fornecedor. " +
      "Ação sugerida: peça à Comissão de Licitação o histórico de contratos desse fornecedor antes da homologação.",
    aviso: {
      nivel: "medio",
      titulo: "4 processos com observação de risco registrada",
      itens: [
        "PE 014/2026: único licitante habilitado",
        "PE 011/2026: preço 38% acima da estimativa",
      ],
    },
    lista: {
      cabecalho: "Todos os processos (31)",
      itens: [
        {
          nome: "PE 014/2026 — Merenda escolar",
          sub: "Pregão eletrônico · R$ 1,2 mi · Alimentos Boa Mesa Ltda.",
          pilula: { label: "Em disputa", tom: "andamento" },
        },
        {
          nome: "PE 012/2026 — Medicamentos básicos",
          sub: "Pregão eletrônico · R$ 640 mil · Distribuidora Vida",
          pilula: { label: "Homologada", tom: "positivo" },
        },
        {
          nome: "TP 003/2026 — Pavimentação Beira-Rio",
          sub: "Tomada de preços · R$ 2,1 mi",
          pilula: { label: "Publicada", tom: "neutro" },
        },
      ],
    },
  },
];
