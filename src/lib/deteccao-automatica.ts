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
