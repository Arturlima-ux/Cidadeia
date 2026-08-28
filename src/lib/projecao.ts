// ── PROJEÇÃO ESTATÍSTICA SIMPLES ──
// Isto NÃO é IA preditiva nem um gêmeo digital de verdade. É uma regressão
// linear simples em cima do histórico real já registrado — a mesma
// matemática de "linha de tendência" de uma planilha. Não considera
// sazonalidade, eventos externos, nem múltiplas variáveis cruzadas (o que
// um gêmeo digital de verdade exigiria). Só existe pra dar uma direção
// aproximada de curtíssimo prazo quando já há dado real suficiente — e diz
// claramente o nível de confiança, que é baixo com poucos pontos.
//
// Ativa sozinha assim que houver dados reais suficientes; não precisa de
// nenhuma configuração ou variável de ambiente.

export type PontoHistorico = { data: string; valor: number | null };

export type Projecao = {
  valorProjetado: number;
  proximaData: string;
  baseadoEmRegistros: number;
  confianca: "baixa" | "média" | "alta";
  r2: number;
};

const MINIMO_REGISTROS_PARA_PROJETAR = 3;

/** Regressão linear (mínimos quadrados) em pontos (x,y). */
function regressaoLinear(pontos: { x: number; y: number }[]) {
  const n = pontos.length;
  const somaX = pontos.reduce((s, p) => s + p.x, 0);
  const somaY = pontos.reduce((s, p) => s + p.y, 0);
  const mediaX = somaX / n;
  const mediaY = somaY / n;

  const numerador = pontos.reduce((s, p) => s + (p.x - mediaX) * (p.y - mediaY), 0);
  const denominador = pontos.reduce((s, p) => s + (p.x - mediaX) ** 2, 0);
  const inclinacao = denominador === 0 ? 0 : numerador / denominador;
  const intercepto = mediaY - inclinacao * mediaX;

  // R² — o quanto a reta explica a variação real (1 = explica tudo, 0 = não explica nada).
  const ssTot = pontos.reduce((s, p) => s + (p.y - mediaY) ** 2, 0);
  const ssRes = pontos.reduce((s, p) => {
    const previsto = inclinacao * p.x + intercepto;
    return s + (p.y - previsto) ** 2;
  }, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { inclinacao, intercepto, r2 };
}

function confiancaPor(nRegistros: number, r2: number): Projecao["confianca"] {
  if (nRegistros < 5 || r2 < 0.3) return "baixa";
  if (nRegistros < 12 || r2 < 0.6) return "média";
  return "alta";
}

/**
 * Projeta o próximo período a partir do histórico real.
 * Retorna null se não houver registros reais suficientes — não inventa nada.
 */
export function projetarProximoPeriodo(
  serie: PontoHistorico[],
  minimoRegistros = MINIMO_REGISTROS_PARA_PROJETAR
): Projecao | null {
  const validos = serie
    .filter((p): p is { data: string; valor: number } => p.valor !== null)
    .map((p) => ({ ...p, timestamp: new Date(p.data).getTime() }))
    .filter((p) => !Number.isNaN(p.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (validos.length < minimoRegistros) return null;

  const primeiroTimestamp = validos[0].timestamp;
  // x em dias desde o primeiro registro, pra manter a escala numérica pequena.
  const pontos = validos.map((p) => ({
    x: (p.timestamp - primeiroTimestamp) / (1000 * 60 * 60 * 24),
    y: p.valor,
  }));

  const { inclinacao, intercepto, r2 } = regressaoLinear(pontos);

  const ultimoX = pontos[pontos.length - 1].x;
  // Projeta 30 dias à frente do último registro real.
  const proximoX = ultimoX + 30;
  const valorProjetado = inclinacao * proximoX + intercepto;

  const proximaDataMs = primeiroTimestamp + proximoX * 24 * 60 * 60 * 1000;

  return {
    valorProjetado: Math.round(valorProjetado * 100) / 100,
    proximaData: new Date(proximaDataMs).toISOString(),
    baseadoEmRegistros: validos.length,
    confianca: confiancaPor(validos.length, r2),
    r2: Math.round(r2 * 100) / 100,
  };
}

export const MINIMO_PARA_PROJECAO = MINIMO_REGISTROS_PARA_PROJETAR;
