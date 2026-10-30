// ── ONDE O VISITANTE ESTÁ, PELA CONEXÃO ──
//
// O ponto que acende no mapa do topo assim que a pessoa abre o site, sem
// janela de permissão. Quem sabe a posição aproximada é a Vercel: em cada
// pedido ela manda cabeçalhos com a cidade, o estado e as coordenadas da
// conexão (x-vercel-ip-*). É uma estimativa de nível de cidade, e às vezes é
// a cidade do provedor de internet, não a da pessoa. Por isso a página diz
// "perto de", nunca "você está em".
//
// Nada é gravado: app/api/onde-estou só lê os cabeçalhos do próprio pedido e
// devolve à própria pessoa, sem cache compartilhado. A posição exata
// continua sendo a do GPS, que só vem quando a pessoa toca em "usar minha
// localização" (lib/localizacao.ts).

export type LocalAproximado = { lat: number; lng: number; cidade: string | null; uf: string | null };

/** O retângulo do Brasil, com folga: fora dele, não há ponto para acender. */
const BRASIL = { latMin: -34.5, latMax: 5.8, lngMin: -74.5, lngMax: -28.5 };

const decodificar = (v: string | null): string | null => {
  if (!v) return null;
  try {
    const t = decodeURIComponent(v).trim();
    return t && t.length <= 80 ? t : null;
  } catch {
    return null;
  }
};

/** Lê a posição aproximada nos cabeçalhos da Vercel. Null fora do Brasil ou sem dado. */
export function localPelaConexao(h: Headers): LocalAproximado | null {
  const pais = h.get("x-vercel-ip-country");
  if (pais && pais.toUpperCase() !== "BR") return null;
  const lat = Number(h.get("x-vercel-ip-latitude"));
  const lng = Number(h.get("x-vercel-ip-longitude"));
  if (!h.get("x-vercel-ip-latitude") || !h.get("x-vercel-ip-longitude")) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < BRASIL.latMin || lat > BRASIL.latMax || lng < BRASIL.lngMin || lng > BRASIL.lngMax) return null;
  const uf = (h.get("x-vercel-ip-country-region") ?? "").toUpperCase();
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
    cidade: decodificar(h.get("x-vercel-ip-city")),
    uf: /^[A-Z]{2}$/.test(uf) ? uf : null,
  };
}

/** "Teresina, PI", "Teresina", ou null. */
export function nomeDoLocal(l: Pick<LocalAproximado, "cidade" | "uf"> | null): string | null {
  if (!l?.cidade) return null;
  return l.uf ? `${l.cidade}, ${l.uf}` : l.cidade;
}

// ── NO NAVEGADOR: A ÚLTIMA POSIÇÃO E O AVISO ──
// O topo pede a posição uma vez e o mapa (que chega depois, MapaVivoAdiado)
// pode ainda não existir: a última leitura fica guardada aqui, e quem chegar
// depois a lê; quem já está ouvindo recebe o evento.

export const EVENTO_VISITANTE = "cidadeia:visitante";
let ultimo: LocalAproximado | null = null;

export function guardarVisitante(l: LocalAproximado) {
  ultimo = l;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENTO_VISITANTE, { detail: l }));
}

export function lerVisitante(): LocalAproximado | null {
  return ultimo;
}
