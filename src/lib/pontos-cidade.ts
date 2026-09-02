import type { PontoCidade } from "@/components/MapaCidade";

// ── MONTAGEM DOS PONTOS DO MAPA DA CIDADE ──
//
// Função pura, separada do componente, porque a regra do que conta como obra
// atrasada é regra de negócio e precisa de teste — dentro do componente ela
// só seria verificável abrindo o navegador.

/** Diferença em pontos percentuais a partir da qual a obra é considerada atrasada. */
const TOLERANCIA_ATRASO_PP = 10;

export type EntradaSaude = { id: string; nome: string; tipo: string; latitude: number | null; longitude: number | null };
export type EntradaEscola = { id: string; nome: string; evasaoPercentual: number | null; latitude: number | null; longitude: number | null };
export type EntradaObra = {
  id: string;
  nome: string;
  status: string;
  progressoAtual: number;
  progressoEsperado: number;
  latitude: number | null;
  longitude: number | null;
};

function temCoordenada<T extends { latitude: number | null; longitude: number | null }>(
  item: T
): item is T & { latitude: number; longitude: number } {
  // Zero é coordenada válida no globo, mas não em município brasileiro — e é o
  // valor que um campo numérico vazio costuma virar. Descartar zero evita
  // plotar meia dúzia de escolas no Golfo da Guiné.
  return (
    typeof item.latitude === "number" &&
    typeof item.longitude === "number" &&
    item.latitude !== 0 &&
    item.longitude !== 0
  );
}

/**
 * Obra atrasada é a que está mais de dez pontos abaixo do progresso esperado.
 *
 * Mesma tolerância que o resto do sistema usa para não chamar de atraso a
 * variação normal de um cronograma. Obra concluída nunca conta, mesmo que o
 * esperado tenha ficado registrado acima.
 */
export function obraAtrasada(o: { status: string; progressoAtual: number; progressoEsperado: number }): boolean {
  if (o.status === "concluida" || o.status === "cancelada") return false;
  return o.progressoAtual < o.progressoEsperado - TOLERANCIA_ATRASO_PP;
}

export function montarPontosCidade(dados: {
  saude: EntradaSaude[];
  escolas: EntradaEscola[];
  obras: EntradaObra[];
}): PontoCidade[] {
  const pontos: PontoCidade[] = [];

  for (const u of dados.saude.filter(temCoordenada)) {
    pontos.push({
      id: `saude-${u.id}`,
      nome: u.nome,
      latitude: u.latitude,
      longitude: u.longitude,
      camada: "saude",
      descricao: u.tipo.toUpperCase(),
    });
  }

  for (const e of dados.escolas.filter(temCoordenada)) {
    pontos.push({
      id: `educacao-${e.id}`,
      nome: e.nome,
      latitude: e.latitude,
      longitude: e.longitude,
      camada: "educacao",
      descricao:
        e.evasaoPercentual !== null ? `Evasão de ${e.evasaoPercentual}%` : undefined,
    });
  }

  for (const o of dados.obras.filter(temCoordenada)) {
    const atrasada = obraAtrasada(o);
    pontos.push({
      id: `obras-${o.id}`,
      nome: o.nome,
      latitude: o.latitude,
      longitude: o.longitude,
      camada: "obras",
      emAtraso: atrasada,
      descricao: atrasada
        ? `${o.progressoAtual}% executado, esperado ${o.progressoEsperado}%`
        : `${o.progressoAtual}% executado`,
    });
  }

  return pontos;
}
