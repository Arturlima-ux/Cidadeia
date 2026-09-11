import { formatarMoeda } from "@/lib/formatadores";
import type { AlertaExecutivo, MetricaPainel } from "@/components/PainelExecutivo";

export type PainelModulo = {
  chave: string;
  nomeModulo: string;
  metricas: [MetricaPainel, MetricaPainel, MetricaPainel];
  eficienciaPct: number;
  eficienciaLabel: string;
  alerta: AlertaExecutivo;
};

// ── DADOS ILUSTRATIVOS, MAS MÉTRICAS REAIS ──
//
// Os números são de uma "Prefeitura Modelo" inventada. As MÉTRICAS, não: cada
// rótulo aqui é um rótulo que existe na tela correspondente do painel. A aba
// Essencial prometia "Atendimentos WhatsApp" e "Tempo médio de resposta" —
// contadores que o produto não tem. Quem assinasse pelo que viu em Preços
// entraria e não encontraria. O teste em tests/paineis-modulos.test.ts trava
// cada rótulo contra o código da tela real.
//
// O medidor circular é a única licença: as telas mostram contagens (no prazo,
// vencendo, vencidas), e o medidor mostra a proporção entre elas.
export const PAINEIS_MODULOS: PainelModulo[] = [
  {
    chave: "essencial",
    nomeModulo: "Essencial",
    metricas: [
      { label: "Aguardando resposta", valor: "14", sentimento: "neutro" },
      { label: "Vence nos próximos dias", valor: "3", sentimento: "down" },
      { label: "Respondidas", valor: "82", sentimento: "up" },
    ],
    eficienciaPct: 91,
    eficienciaLabel: "No prazo da LAI",
    alerta: {
      status: "aprovado",
      secretaria: "OUVIDORIA",
      texto: "Prazo de 20 dias da Lei de Acesso cumprido em todas as manifestações do mês.",
    },
  },
  {
    chave: "gestao",
    nomeModulo: "Gestão",
    metricas: [
      { label: "Receita", valor: formatarMoeda(482300), sentimento: "up" },
      { label: "Despesas", valor: formatarMoeda(356800), sentimento: "down" },
      { label: "Saldo", valor: formatarMoeda(125500), sentimento: "up" },
    ],
    eficienciaPct: 78,
    eficienciaLabel: "Eficiência da gestão",
    alerta: {
      status: "sugere",
      secretaria: "SEC. EDUCAÇÃO",
      texto: "Frequência escolar caiu 6% no último registro — vale investigar.",
    },
  },
  {
    chave: "saude",
    nomeModulo: "Saúde",
    metricas: [
      { label: "Tempo médio de atendimento", valor: "38 min", sentimento: "up" },
      { label: "Médicos ativos", valor: "46", sentimento: "up" },
      { label: "Faltas", valor: "12%", sentimento: "down" },
    ],
    eficienciaPct: 84,
    eficienciaLabel: "Estoque de medicamentos",
    alerta: {
      status: "sugere",
      secretaria: "UBS CENTRO",
      texto: "Faltas de pacientes subiram 9% nas últimas duas semanas.",
    },
  },
  {
    chave: "educacao",
    nomeModulo: "Educação",
    metricas: [
      { label: "Nota média", valor: "7,2", sentimento: "up" },
      { label: "Alunos no transporte", valor: "312", sentimento: "neutro" },
      { label: "Professores ativos", valor: "58", sentimento: "neutro" },
    ],
    eficienciaPct: 93,
    eficienciaLabel: "Frequência",
    alerta: {
      status: "aguardando",
      secretaria: "SEC. EDUCAÇÃO",
      texto: "Proposta de reforço no transporte escolar aguardando aprovação.",
    },
  },
  {
    chave: "obras",
    nomeModulo: "Obras",
    metricas: [
      { label: "Todas as obras", valor: "24", sentimento: "neutro" },
      { label: "Progresso abaixo do esperado", valor: "5", sentimento: "down" },
      { label: "Em andamento", valor: "17", sentimento: "neutro" },
    ],
    eficienciaPct: 79,
    eficienciaLabel: "No cronograma",
    alerta: {
      status: "sugere",
      secretaria: "SEC. OBRAS",
      texto: "Reforma da UBS Norte com progresso 15% abaixo do esperado.",
    },
  },
  {
    chave: "licitacoes",
    nomeModulo: "Licitações",
    metricas: [
      { label: "Todos os processos", valor: "31", sentimento: "neutro" },
      { label: "Com observação de risco", valor: "4", sentimento: "down" },
      { label: "Homologada", valor: "19", sentimento: "up" },
    ],
    eficienciaPct: 87,
    eficienciaLabel: "Sem observação de risco",
    alerta: {
      status: "aprovado",
      secretaria: "SEC. LICITAÇÕES",
      texto: "Pregão nº 014/2026 homologado dentro do prazo previsto.",
    },
  },
];
