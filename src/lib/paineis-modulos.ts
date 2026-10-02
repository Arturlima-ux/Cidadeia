import { formatarMoeda } from "@/lib/formatadores";
import type { TomStatus } from "@/components/PilulaStatus";

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
  // Repete os tons de PilulaStatus, que é o componente que a tela real usa.
  // Faltava "atencao" aqui, e por isso a demonstração não conseguia mostrar o
  // estado de obra sem medição — justamente o que distingue "ninguém mediu" de
  // "está em zero".
  pilula?: { label: string; tom: TomStatus };
  /**
   * Espelha a tela real: o progresso MEDIDO pela prefeitura e a fração do
   * prazo do CONTRATO já consumida.
   *
   * Tinha `esperado`, que era o progresso que a obra "deveria" ter — um número
   * digitado à mão, sem fonte, que o módulo deixou de usar. A demonstração
   * continuou mostrando a tela antiga, e o componente que a renderiza chama-se
   * PainelModuloFiel justamente por existir para ser fiel.
   *
   * `atual: null` é obra sem medição registrada, que é diferente de obra em 0%.
   */
  progresso?: { atual: number | null; prazo: number };
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
      "Faltas em 12%, acima do limite de 10% — subiu 5 pontos desde julho (era 7%). " +
      "Ação sugerida: Peça à Secretaria de Saúde o relatório de faltas por unidade para saber onde os 12% estão concentrados.",
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
      "Frequência média em 71%, abaixo do limite de 75% — caiu 7 pontos desde junho (era 78%). " +
      "Ação sugerida: Peça à Secretaria de Educação a frequência aberta por escola — a média de 71% esconde onde a queda está.",
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
      "Uma obra com 45% medidos e 88% do prazo do contrato já consumido. " +
      "Ação sugerida: peça à fiscalização o boletim de medição da Reforma da UBS Norte e decida entre acelerar e instruir aditivo de prazo — depois do vencimento não há contrato para aditar.",
    aviso: {
      nivel: "urgente",
      titulo: "1 obra com contrato encerrado sem conclusão",
      itens: [
        "Pavimentação da Av. Beira-Rio: vigência encerrou em 12/08, com 72% medidos",
      ],
    },
    lista: {
      cabecalho: "Todas as obras (24)",
      itens: [
        {
          nome: "Reforma da UBS Norte",
          sub: "Construtora Horizonte Ltda",
          pilula: { label: "Atrasada", tom: "negativo" },
          progresso: { atual: 45, prazo: 88 },
        },
        {
          nome: "Pavimentação da Av. Beira-Rio",
          sub: "Pavimenta Sul Engenharia Ltda",
          pilula: { label: "Contrato encerrado", tom: "negativo" },
          progresso: { atual: 72, prazo: 100 },
        },
        {
          nome: "Creche Municipal Jardim",
          sub: "Edificar Construções Ltda",
          // Sem medição registrada: a tela diz isso em vez de mostrar 0%.
          pilula: { label: "Sem medição", tom: "atencao" },
          progresso: { atual: null, prazo: 34 },
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
      "Três contratos vencem nos próximos cinco dias e nenhum deles cabe mais numa nova licitação: só a publicação do edital exige oito dias úteis. " +
      "Ação sugerida: verifique hoje quais admitem prorrogação e instrua os aditivos — depois do vencimento não há contrato para aditar.",
    aviso: {
      nivel: "urgente",
      titulo: "3 contratos sem tempo para nova licitação",
      itens: [
        "Transporte escolar: vence em 5 dias (3 dias úteis), e o edital exige 8",
        "Coleta de resíduos: 4 dispensas do mesmo objeto somaram acima do limite do exercício",
      ],
    },
    lista: {
      cabecalho: "Todos os processos (31)",
      itens: [
        {
          nome: "PE 014/2026 — Merenda escolar",
          sub: "Pregão eletrônico · R$ 1,2 mi · importado do PNCP",
          pilula: { label: "Em disputa", tom: "andamento" },
        },
        {
          nome: "PE 012/2026 — Medicamentos básicos",
          sub: "Pregão eletrônico · R$ 640 mil · importado do PNCP",
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
