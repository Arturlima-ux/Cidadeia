// ── AS OBRAS NO MAPA DO PAINEL EXECUTIVO ──
//
// Função pura, separada do componente, pelo mesmo motivo de pontos-cidade.ts:
// qual status vira qual cor é regra de negócio e precisa de teste — dentro do
// componente só seria verificável abrindo o navegador com a chave do Google.

/** As três situações que o prefeito lê no mapa. */
export type SituacaoNoMapa = "andamento" | "parada" | "concluida";

export const NOME_SITUACAO: Record<SituacaoNoMapa, string> = {
  andamento: "Em andamento",
  parada: "Parada",
  concluida: "Concluída",
};

// Situação é ESTADO, não série: a cor vem da paleta de status. Parada é o que
// exige ação, por isso é a única em vermelho; em andamento fica no âmbar de
// atenção, e concluída no verde de "está resolvido".
export const COR_SITUACAO: Record<SituacaoNoMapa, string> = {
  andamento: "var(--medio)",
  parada: "var(--urgente)",
  concluida: "var(--info)",
};

export type EntradaObraMapa = {
  id: string;
  nome: string;
  bairro: string | null;
  status: string;
  progressoAtual: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type ObraNoMapa = {
  id: string;
  nome: string;
  bairro: string | null;
  situacao: SituacaoNoMapa;
  /** Status "atrasada": continua em andamento, mas a legenda diz o atraso. */
  emAtraso: boolean;
  progressoAtual: number | null;
  /** Null quando a obra só tem bairro: o componente procura o bairro no Google. */
  latitude: number | null;
  longitude: number | null;
};

/**
 * Status cadastrado → situação no mapa.
 *
 * "Atrasada" é obra que está andando, só que devagar: entra como em andamento.
 * "Planejada" não tem canteiro, e um marcador de obra num lugar onde nada
 * começou diria ao prefeito que há máquina na rua. Cancelada e status
 * desconhecido também ficam fora.
 */
export function situacaoNoMapa(status: string): SituacaoNoMapa | null {
  switch (status) {
    case "em_andamento":
    case "atrasada":
      return "andamento";
    case "paralisada":
      return "parada";
    case "concluida":
      return "concluida";
    default:
      return null;
  }
}

function coordenadaValida(n: number | null): n is number {
  // Zero é o que um campo numérico vazio costuma virar, e nenhum município
  // brasileiro fica na linha do Equador com o meridiano de Greenwich.
  return typeof n === "number" && Number.isFinite(n) && n !== 0;
}

export function montarObrasNoMapa(obras: EntradaObraMapa[]): {
  obras: ObraNoMapa[];
  /** Em execução ou concluídas, mas sem coordenada nem bairro: não há onde pôr. */
  semLocal: number;
  /** Planejadas não entram no mapa; o número aparece para não sumirem calado. */
  planejadas: number;
} {
  const resultado: ObraNoMapa[] = [];
  let semLocal = 0;
  let planejadas = 0;

  for (const o of obras) {
    const situacao = situacaoNoMapa(o.status);
    if (situacao === null) {
      if (o.status === "planejada") planejadas++;
      continue;
    }

    const temCoordenada = coordenadaValida(o.latitude) && coordenadaValida(o.longitude);
    const bairro = o.bairro?.trim() || null;
    if (!temCoordenada && !bairro) {
      semLocal++;
      continue;
    }

    resultado.push({
      id: o.id,
      nome: o.nome,
      bairro,
      situacao,
      emAtraso: o.status === "atrasada",
      progressoAtual: o.progressoAtual,
      latitude: temCoordenada ? o.latitude : null,
      longitude: temCoordenada ? o.longitude : null,
    });
  }

  return { obras: resultado, semLocal, planejadas };
}

/** Texto do balão do marcador, sem inventar medição que ninguém fez. */
export function descricaoProgresso(o: Pick<ObraNoMapa, "situacao" | "progressoAtual" | "emAtraso">): string {
  if (o.situacao === "concluida") return "Obra entregue";
  const medicao = o.progressoAtual === null ? "Sem medição registrada" : `${o.progressoAtual}% executado`;
  return o.emAtraso ? `${medicao} · em atraso` : medicao;
}
