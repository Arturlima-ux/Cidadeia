import tabela from "@/dados/municipios.json";
import { gravarFotografia, lerFotografia } from "@/lib/fotografia-servidor";
import { lerSemanas, vizinhosDe, type Doenca, type FotografiaArboviroses, type SemanaCru, type Vizinho } from "@/lib/arboviroses";

// ── O INFODENGUE, DA FIOCRUZ PARA O PAINEL ── (ver arboviroses.ts)

const BASE = "https://info.dengue.mat.br/api/alertcity";
export const EVENTO_ARBOVIROSES = "arboviroses";
export const idDasArboviroses = (prefeituraId: string) => `infodengue:${prefeituraId}`;

const NOMES = new Map(((tabela as unknown as { municipios: [string, string, string, number | null][] }).municipios).map((m) => [m[0], m[1]]));

/** As últimas semanas de uma doença num município. Lança se o serviço não responder. */
export async function semanasDoInfoDengue(codigoIbge: string, doenca: Doenca, hoje: Date = new Date()): Promise<SemanaCru[]> {
  const ano = hoje.getUTCFullYear();
  // No começo do ano as semanas recentes estão no ano anterior.
  const desde = hoje.getUTCMonth() < 3 ? ano - 1 : ano;
  const url = `${BASE}?geocode=${codigoIbge}&disease=${doenca}&format=json&ew_start=1&ew_end=53&ey_start=${desde}&ey_end=${ano}`;
  for (let t = 0; t < 2; t++) {
    try {
      const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000), cache: "no-store" });
      if (r.ok) {
        const corpo = (await r.json()) as unknown;
        if (Array.isArray(corpo)) return corpo as SemanaCru[];
      }
    } catch {
      // tenta de novo
    }
  }
  throw new Error("InfoDengue não respondeu");
}

export async function buscarArboviroses(codigoIbge: string, hoje: Date = new Date()): Promise<FotografiaArboviroses> {
  const [dengue, chik] = await Promise.all([semanasDoInfoDengue(codigoIbge, "dengue", hoje), semanasDoInfoDengue(codigoIbge, "chikungunya", hoje)]);
  // Vizinho que falha não derruba a leitura da cidade.
  const vizinhos = (
    await Promise.all(
      vizinhosDe(codigoIbge).map(async (c): Promise<Vizinho | null> => {
        try {
          const [s] = lerSemanas(await semanasDoInfoDengue(c, "dengue", hoje), 1);
          return s ? { codigo: c, nome: NOMES.get(c) ?? c, nivel: s.nivel, incidencia: s.incidencia } : null;
        } catch {
          return null;
        }
      })
    )
  ).filter((v): v is Vizinho => !!v);
  return { dengue: lerSemanas(dengue), chikungunya: lerSemanas(chik), vizinhos };
}

export const gravarArboviroses = (prefeituraId: string, f: FotografiaArboviroses) => gravarFotografia(idDasArboviroses(prefeituraId), EVENTO_ARBOVIROSES, f);

export async function lerArboviroses(prefeituraId: string): Promise<{ foto: FotografiaArboviroses; conferidoEm: string } | null> {
  const f = await lerFotografia<FotografiaArboviroses>(idDasArboviroses(prefeituraId), EVENTO_ARBOVIROSES);
  return f && Array.isArray(f.valor?.dengue) ? { foto: f.valor, conferidoEm: f.conferidoEm } : null;
}
