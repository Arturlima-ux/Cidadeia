// ── PERTO DE VOCÊ ──
//
// Nos sites de prefeitura, o endereço da UPA e o horário do posto ficam
// escondidos atrás de "Secretarias > Saúde > Unidades", quando estão: num
// estudo de usabilidade, um em cada três moradores não conseguiu achar.
// Aqui o morador toca em "usar minha localização" (ou escolhe o bairro) e vê
// o posto, a escola e as obras mais perto dele, com a distância, o telefone
// e o caminho. A localização fica no celular: nada é enviado.

export type Ponto = { lat: number; lng: number };

export type LugarPerto = {
  id: string;
  grupo: "saude" | "escola" | "obra";
  nome: string;
  /** "UBS", "UPA 24h", "Escola", "Obra em andamento" */
  rotulo: string;
  bairro: string | null;
  endereco: string | null;
  telefone: string | null;
  horario: string | null;
  lat: number | null;
  lng: number | null;
  /** Prioridade dentro do grupo: UPA e hospital antes da farmácia. */
  peso: number;
};

/** Distância em linha reta, em metros (fórmula de haversine). */
export function distanciaMetros(a: Ponto, b: Ponto): number {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * "450 m · 6 min a pé" ou "3,2 km · 8 min de carro". A linha reta é menor que
 * o caminho de verdade; o fator 1,3 é a média usual de rua em cidade, e o
 * texto diz "cerca de" para não prometer o que o mapa vai desmentir.
 */
export function descreverDistancia(metros: number): string {
  const caminho = metros * 1.3;
  const km = (metros / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  if (caminho < 1500) {
    const min = Math.max(1, Math.round(caminho / 80)); // 4,8 km/h
    return `${metros < 1000 ? `${Math.round(metros / 10) * 10} m` : `${km} km`} · cerca de ${min} min a pé`;
  }
  const min = Math.max(2, Math.round(caminho / 500)); // 30 km/h na cidade
  return `${km} km · cerca de ${min} min de carro`;
}

export type LugarComDistancia = LugarPerto & { metros: number | null };

/** Os mais próximos de cada grupo. Sem coordenada, o lugar não entra na conta de distância. */
export function maisPerto(lugares: LugarPerto[], ponto: Ponto, porGrupo = 3): Record<LugarPerto["grupo"], LugarComDistancia[]> {
  const saida: Record<LugarPerto["grupo"], LugarComDistancia[]> = { saude: [], escola: [], obra: [] };
  const comDistancia = lugares
    .filter((l) => l.lat !== null && l.lng !== null)
    .map((l) => ({ ...l, metros: distanciaMetros(ponto, { lat: l.lat!, lng: l.lng! }) }))
    .sort((a, b) => a.metros - b.metros);
  for (const l of comDistancia) if (saida[l.grupo].length < porGrupo) saida[l.grupo].push(l);
  return saida;
}

const chaveBairro = (b: string) =>
  b
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** A lista de bairros que aparecem nos dados, sem repetição de grafia. */
export function bairrosDosLugares(lugares: LugarPerto[]): string[] {
  const vistos = new Map<string, string>();
  for (const l of lugares) {
    if (!l.bairro?.trim()) continue;
    const k = chaveBairro(l.bairro);
    if (!vistos.has(k)) vistos.set(k, l.bairro.trim());
  }
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function noBairro(lugares: LugarPerto[], bairro: string): Record<LugarPerto["grupo"], LugarComDistancia[]> {
  const k = chaveBairro(bairro);
  const saida: Record<LugarPerto["grupo"], LugarComDistancia[]> = { saude: [], escola: [], obra: [] };
  for (const l of [...lugares].sort((a, b) => b.peso - a.peso)) {
    if (l.bairro && chaveBairro(l.bairro) === k) saida[l.grupo].push({ ...l, metros: null });
  }
  return saida;
}

/** O caminho até o lugar no mapa do celular. */
export function linkDoCaminho(l: LugarPerto, municipio: string): string {
  return l.lat !== null && l.lng !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([l.nome, l.endereco, municipio].filter(Boolean).join(", "))}`;
}
