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

// Dados ilustrativos de uma "Prefeitura Modelo" — mesmo ritmo visual pra
// todo produto, só troca a métrica de acordo com o módulo/plano.
export const PAINEIS_MODULOS: PainelModulo[] = [
  {
    chave: "essencial",
    nomeModulo: "Essencial",
    metricas: [
      { label: "Atendimentos WhatsApp", valor: "1.284", sentimento: "up" },
      { label: "Manifestações Ouvidoria", valor: "96", sentimento: "neutro" },
      { label: "Tempo médio resposta", valor: "2,4 dias", sentimento: "up" },
    ],
    eficienciaPct: 91,
    eficienciaLabel: "Índice de Transparência",
    alerta: {
      status: "aprovado",
      secretaria: "OUVIDORIA",
      texto: "Meta de resposta em até 3 dias mantida no último trimestre.",
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
      { label: "Tempo médio atendimento", valor: "38 min", sentimento: "up" },
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
      { label: "Evasão", valor: "4,1%", sentimento: "down" },
      { label: "Professores ativos", valor: "58", sentimento: "neutro" },
    ],
    eficienciaPct: 93,
    eficienciaLabel: "Frequência escolar",
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
      { label: "Obras cadastradas", valor: "24", sentimento: "neutro" },
      { label: "Obras atrasadas", valor: "5", sentimento: "down" },
      { label: "Valor contratado", valor: "R$ 3,8 mi", sentimento: "neutro" },
    ],
    eficienciaPct: 67,
    eficienciaLabel: "Progresso médio",
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
      { label: "Processos cadastrados", valor: "31", sentimento: "neutro" },
      { label: "Com risco observado", valor: "4", sentimento: "down" },
      { label: "Valor estimado total", valor: "R$ 2,1 mi", sentimento: "neutro" },
    ],
    eficienciaPct: 88,
    eficienciaLabel: "Processos sem risco",
    alerta: {
      status: "aprovado",
      secretaria: "SEC. LICITAÇÕES",
      texto: "Pregão nº 014/2026 homologado dentro do prazo previsto.",
    },
  },
];
