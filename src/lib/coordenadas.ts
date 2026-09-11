// ── COORDENADAS: SÓ DENTRO DO BRASIL ──
//
// O cadastro aceitava qualquer latitude entre -90 e 90 e qualquer longitude
// entre -180 e 180 — o mundo inteiro. O erro mais comum de quem preenche à
// mão é trocar os dois campos: latitude -38,5 e longitude -3,7 passam na
// validação e caem no meio do Atlântico Sul. O mapa então mostra azul liso
// com um pino no oceano, e parece travado.
//
// O produto é para município brasileiro. Limitar à caixa do Brasil pega a
// troca no ato — uma longitude brasileira nunca cabe no campo de latitude —
// e ainda pega vírgula onde deveria ser ponto, sinal esquecido e outros.
//
// Os limites têm folga de ~1 grau sobre os extremos reais (Chuí ao sul,
// Monte Caburaí ao norte, Serra da Contamana a oeste, Trindade a leste),
// para não recusar município de fronteira por arredondamento.

export const LIMITES_BRASIL = {
  latitude: { min: -34, max: 6 },
  longitude: { min: -74, max: -28 },
} as const;

export function dentroDoBrasil(latitude: number, longitude: number): boolean {
  return (
    latitude >= LIMITES_BRASIL.latitude.min &&
    latitude <= LIMITES_BRASIL.latitude.max &&
    longitude >= LIMITES_BRASIL.longitude.min &&
    longitude <= LIMITES_BRASIL.longitude.max
  );
}

/** Verdadeiro quando os valores trocados de lugar cairiam no Brasil. */
export function pareceTrocado(latitude: number, longitude: number): boolean {
  return !dentroDoBrasil(latitude, longitude) && dentroDoBrasil(longitude, latitude);
}

/** Mensagem para o campo, quando fora dos limites. */
export function explicarCoordenada(latitude: number, longitude: number): string | null {
  if (dentroDoBrasil(latitude, longitude)) return null;
  if (pareceTrocado(latitude, longitude)) {
    return "Latitude e longitude parecem trocadas. No Brasil, a latitude fica entre -34 e 6 e a longitude entre -74 e -28.";
  }
  return "Coordenada fora do Brasil. Latitude entre -34 e 6; longitude entre -74 e -28.";
}
