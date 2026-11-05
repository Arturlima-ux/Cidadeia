import { codigosNaOrdemDoMapa } from "@/lib/mapa-municipios-codigos";
import { decodificarPontos } from "@/lib/mapa-municipios";

// ── A SEDE DO MUNICÍPIO NO MAPA EM RELEVO ──
// Os pontos do mapa (lib/mapa-municipios) estão em coordenadas de desenho, na
// conta de lib/localizacao.ts (paraMapa). Aqui a conta é desfeita para a
// latitude e longitude que a cena 3D do topo espera (BrasilRelevo.tsx).
export type Sede = { lat: number; lng: number };

export function sedeNoMapa(codigo: string): Sede | null {
  const i = codigosNaOrdemDoMapa().indexOf(codigo);
  if (i < 0) return null;
  const p = decodificarPontos();
  const x = p[i * 2], y = p[i * 2 + 1];
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { lng: (x - 1780.593) / 24.0686, lat: (137.0145 - y) / 24.8884 };
}
