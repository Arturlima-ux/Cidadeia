/**
 * Detectores determinísticos — regras simples, sem IA, sem custo, sempre
 * corretos. Cobrem dores que existiam em cada processo mas não tinham
 * nenhum tipo de aviso automático até agora (prazo vencendo, obra parada,
 * dado desatualizado, saldo negativo). A IA (lib/ia.ts) usa a saída destes
 * detectores como fatos verificados — nunca reinventa esses números.
 */

export type DeteccaoAutomatica = {
  categoria: "prazo" | "estagnacao" | "dado_desatualizado" | "financeiro";
  prioridade: "urgente" | "medio" | "info";
  secretaria: string | null;
  titulo: string;
  descricao: string;
};

function diasDesde(dataIso: string): number {
  return Math.floor((Date.now() - new Date(dataIso).getTime()) / (1000 * 60 * 60 * 24));
}

function diasAte(dataIso: string): number {
  return Math.floor((new Date(dataIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const LIMITE_PRAZO_URGENTE_DIAS = 3;
const LIMITE_PRAZO_ATENCAO_DIAS = 7;
const LIMITE_OBRA_PARADA_ATENCAO_DIAS = 14;
const LIMITE_OBRA_PARADA_URGENTE_DIAS = 30;
const LIMITE_INDICADOR_DESATUALIZADO_DIAS = 30;

export function detectarLicitacoesVencendo(
  licitacoes: { numero: string; objeto: string; status: string; prazoFinal: string | null }[]
): DeteccaoAutomatica[] {
  const achados: DeteccaoAutomatica[] = [];
  for (const l of licitacoes) {
    if (!l.prazoFinal) continue;
    if (l.status === "homologada" || l.status === "cancelada") continue;
    const dias = diasAte(l.prazoFinal);
    if (dias < 0) {
      achados.push({
        categoria: "prazo",
        prioridade: "urgente",
        secretaria: "licitacoes",
        titulo: `Licitação ${l.numero} com prazo vencido`,
        descricao: `${l.objeto} — o prazo final passou há ${Math.abs(dias)} dia(s) e o processo ainda está "${l.status}".`,
      });
    } else if (dias <= LIMITE_PRAZO_URGENTE_DIAS) {
      achados.push({
        categoria: "prazo",
        prioridade: "urgente",
        secretaria: "licitacoes",
        titulo: `Licitação ${l.numero} vence em ${dias} dia(s)`,
        descricao: `${l.objeto} — prazo final chegando, processo ainda em "${l.status}".`,
      });
    } else if (dias <= LIMITE_PRAZO_ATENCAO_DIAS) {
      achados.push({
        categoria: "prazo",
        prioridade: "medio",
        secretaria: "licitacoes",
        titulo: `Licitação ${l.numero} vence em ${dias} dias`,
        descricao: `${l.objeto} — vale acompanhar antes do prazo final.`,
      });
    }
  }
  return achados;
}

export function detectarObrasParadas(
  obras: { nome: string; status: string; atualizadoEm: string; progressoAtual: number; progressoEsperado: number }[]
): DeteccaoAutomatica[] {
  const achados: DeteccaoAutomatica[] = [];
  for (const o of obras) {
    if (o.status === "concluida") continue;
    const dias = diasDesde(o.atualizadoEm);
    if (dias >= LIMITE_OBRA_PARADA_URGENTE_DIAS) {
      achados.push({
        categoria: "estagnacao",
        prioridade: "urgente",
        secretaria: "obras",
        titulo: `Obra "${o.nome}" sem atualização há ${dias} dias`,
        descricao: `Progresso parado em ${o.progressoAtual}% (esperado ${o.progressoEsperado}%) — mais de um mês sem registro novo.`,
      });
    } else if (dias >= LIMITE_OBRA_PARADA_ATENCAO_DIAS) {
      achados.push({
        categoria: "estagnacao",
        prioridade: "medio",
        secretaria: "obras",
        titulo: `Obra "${o.nome}" sem atualização há ${dias} dias`,
        descricao: `Progresso em ${o.progressoAtual}% — considere atualizar ou verificar o andamento.`,
      });
    }
  }
  return achados;
}

export function detectarIndicadorDesatualizado(
  secretaria: "saude" | "educacao",
  indicador: { atualizadoEm: string } | null
): DeteccaoAutomatica[] {
  if (!indicador) return [];
  const dias = diasDesde(indicador.atualizadoEm);
  if (dias < LIMITE_INDICADOR_DESATUALIZADO_DIAS) return [];
  const label = secretaria === "saude" ? "Saúde" : "Educação";
  return [
    {
      categoria: "dado_desatualizado",
      prioridade: "info",
      secretaria,
      titulo: `Indicadores de ${label} desatualizados`,
      descricao: `Último registro foi há ${dias} dias — atualize pra manter os relatórios e a IA precisos.`,
    },
  ];
}

export function detectarSaldoNegativo(
  snapshot: { saldo: number | null } | null
): DeteccaoAutomatica[] {
  if (!snapshot || snapshot.saldo === null || snapshot.saldo >= 0) return [];
  return [
    {
      categoria: "financeiro",
      prioridade: "urgente",
      secretaria: null,
      titulo: "Saldo negativo no último registro",
      descricao: `Despesas superaram a receita em ${Math.abs(snapshot.saldo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    },
  ];
}

// ── DETECTORES QUE FALTAVAM NA CENTRAL ──
//
// O mínimo constitucional e o prazo de resposta ao cidadão viviam só nas telas
// próprias. Na prática isso obrigava o prefeito a visitar três lugares para
// saber os três riscos — e o risco que ele não visita é o que estoura.
//
// A conferência no PNCP fica de fora de propósito: ela depende de chamada de
// rede a um serviço que limita requisição com facilidade, e a Central carrega
// a cada abertura de tela. Continua sob demanda, na tela de Licitações.

/**
 * Mínimo de educação ou saúde abaixo do exigido.
 *
 * Recebe a avaliação já calculada por lib/minimos-constitucionais.ts em vez de
 * recalcular: a regra de severidade daquele módulo leva em conta o esforço de
 * aceleração e os meses restantes, e duplicar esse julgamento aqui produziria
 * duas verdades sobre o mesmo número.
 */
export function detectarMinimoConstitucional(entradas: {
  area: "educacao" | "saude";
  nomeArea: string;
  percentualAtual: number;
  exigido: number;
  faltamReais: number;
  situacao: "cumprido" | "no_caminho" | "risco" | "critico";
}[]): DeteccaoAutomatica[] {
  const achados: DeteccaoAutomatica[] = [];

  for (const e of entradas) {
    if (e.situacao === "cumprido" || e.situacao === "no_caminho") continue;

    const reais = e.faltamReais.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

    achados.push({
      categoria: "financeiro",
      prioridade: e.situacao === "critico" ? "urgente" : "medio",
      secretaria: e.area,
      titulo: `Mínimo em ${e.nomeArea}: ${e.percentualAtual.toFixed(1).replace(".", ",")}%`,
      descricao:
        `Abaixo do mínimo de ${e.exigido}% exigido por lei. Faltam ${reais} até o fim do ` +
        `exercício — aplicar menos que o mínimo é a causa mais comum de rejeição de contas.`,
    });
  }

  return achados;
}

/**
 * Manifestação do cidadão com prazo legal vencido ou perto de vencer.
 *
 * Agrupa em vez de listar uma a uma: numa prefeitura com trinta protocolos
 * atrasados, trinta linhas afogariam todo o resto da Central e o prefeito
 * pararia de olhar a tela.
 */
export function detectarPrazoAtendimento(resumo: {
  vencidos: number;
  vencendo: number;
}): DeteccaoAutomatica[] {
  const achados: DeteccaoAutomatica[] = [];

  if (resumo.vencidos > 0) {
    const plural = resumo.vencidos > 1;
    achados.push({
      categoria: "prazo",
      prioridade: "urgente",
      secretaria: null,
      titulo: `${resumo.vencidos} ${plural ? "manifestações com prazo vencido" : "manifestação com prazo vencido"}`,
      descricao:
        "Pedido de informação tem 20 dias pela Lei de Acesso à Informação; as demais " +
        "manifestações têm 30 dias pela Lei 13.460. O prazo já passou.",
    });
  }

  if (resumo.vencendo > 0) {
    const plural = resumo.vencendo > 1;
    achados.push({
      categoria: "prazo",
      prioridade: "medio",
      secretaria: null,
      titulo: `${resumo.vencendo} ${plural ? "manifestações vencem" : "manifestação vence"} nos próximos dias`,
      descricao:
        "Ainda dá para responder no prazo, ou formalizar a prorrogação prevista em lei " +
        "com justificativa comunicada ao cidadão.",
    });
  }

  return achados;
}
