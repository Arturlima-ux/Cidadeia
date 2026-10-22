// ── ONDE A PESSOA ESTÁ, SEM CHUTAR ──
//
// O ponto azul "Você está aqui" no mapa do topo. A precisão não é do site,
// é do aparelho: com GPS (celular ao ar livre) chega a poucos metros; num
// computador o navegador estima pela rede Wi-Fi e pode errar por
// quarteirões; sem permissão, não há posição nenhuma. O que o site controla
// é não mostrar uma estimativa como se fosse certeza:
//
//   1. pede a posição de alta precisão (GPS quando houver), nunca uma lida
//      em cache;
//   2. continua ouvindo por alguns segundos e fica com a leitura de menor
//      margem de erro, porque a primeira costuma vir da rede e as seguintes
//      do GPS;
//   3. devolve a margem de erro que o próprio aparelho informa, e o mapa
//      desenha um círculo desse tamanho em volta do ponto, e o texto diz
//      "margem de 30 m" ou "margem de 2 km".
//
// Nada disso sai do aparelho: a posição só vira o ponto no mapa e o nome da
// cidade mais próxima, calculados aqui.

export type Leitura = { lat: number; lng: number; precisaoM: number };

/** Evento do navegador que leva a posição da busca até o mapa. */
export const EVENTO_LOCALIZACAO = "cidadeia:localizacao";

/** Precisão boa o bastante para parar de esperar (GPS a céu aberto). */
export const PRECISAO_SUFICIENTE_M = 25;
/** Quanto tempo esperar por leituras melhores antes de ficar com a melhor. */
export const ESPERA_MAXIMA_MS = 8000;

/** Mesma projeção do mapa (lib/mapa-municipios.ts): equirretangular corrigida. */
export const paraMapa = (lat: number, lon: number) => ({ x: 24.0686 * lon + 1780.593, y: -24.8884 * lat + 137.0145 });
/** Uma unidade do mapa vale cerca de 4,6 km. */
export const KM_POR_UNIDADE = 4.6;

/** Entre várias leituras, a de menor margem de erro. */
export function melhorLeitura(leituras: Leitura[]): Leitura | null {
  let melhor: Leitura | null = null;
  for (const l of leituras) {
    if (!Number.isFinite(l.lat) || !Number.isFinite(l.lng) || !Number.isFinite(l.precisaoM)) continue;
    if (!melhor || l.precisaoM < melhor.precisaoM) melhor = l;
  }
  return melhor;
}

/** "margem de 30 m", "margem de 1,2 km": como a margem aparece para a pessoa. */
export function textoDaMargem(precisaoM: number): string {
  if (precisaoM < 1000) return `margem de ${Math.max(1, Math.round(precisaoM / (precisaoM < 100 ? 5 : 10)) * (precisaoM < 100 ? 5 : 10))} m`;
  const km = precisaoM / 1000;
  return `margem de ${km.toLocaleString("pt-BR", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

/**
 * Pede a posição ao aparelho e refina por alguns segundos. Resolve com a
 * melhor leitura; rejeita com o GeolocationPositionError (ou um Error) se
 * nenhuma chegar.
 */
export function localizarComPrecisao(geo: Geolocation = navigator.geolocation): Promise<Leitura> {
  return new Promise((resolver, rejeitar) => {
    const leituras: Leitura[] = [];
    let encerrado = false;
    let relogio: ReturnType<typeof setTimeout> | null = null;
    const id = geo.watchPosition(
      (pos) => {
        leituras.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, precisaoM: pos.coords.accuracy });
        if (pos.coords.accuracy <= PRECISAO_SUFICIENTE_M) fim();
      },
      (erro) => {
        // Um erro depois de já ter leituras não apaga o que chegou.
        if (leituras.length) fim();
        else encerrar(() => rejeitar(erro));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: ESPERA_MAXIMA_MS }
    );
    relogio = setTimeout(fim, ESPERA_MAXIMA_MS);

    function encerrar(depois: () => void) {
      if (encerrado) return;
      encerrado = true;
      geo.clearWatch(id);
      if (relogio) clearTimeout(relogio);
      depois();
    }
    function fim() {
      encerrar(() => {
        const melhor = melhorLeitura(leituras);
        if (melhor) resolver(melhor);
        else rejeitar(new Error("sem leitura"));
      });
    }
  });
}

/** Avisa o mapa (MapaVivo) de onde a pessoa está. */
export function anunciarLocalizacao(l: Leitura) {
  window.dispatchEvent(new CustomEvent<Leitura>(EVENTO_LOCALIZACAO, { detail: l }));
}
