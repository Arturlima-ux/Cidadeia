// ── O PANORAMA SEMANAL DAS PREFEITURAS ──
//
// Lê as partes da auditoria (scripts/vigia/auditoria-rgf.ts) e escreve
// src/dados/panorama-rgf.json: só agregados, nacional e por estado. Nenhum
// município aparece por nome: o retrato é do país, e cada cidade se vê no
// próprio Raio-X. O workflow da vigia publica o arquivo toda semana.
//
// Uso: tsx scripts/vigia/panorama.ts <pasta-das-partes> <saida.json>
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type Linha = {
  cod: string;
  uf: string;
  ok: boolean;
  pct?: number;
  causa?: string;
  atrasado?: boolean;
  inconsistente?: boolean;
};

export type Contagem = {
  municipios: number;
  comNumero: number;
  /** Faixas da despesa com pessoal sobre a RCL (limites municipais da LRF). */
  alerta: number;
  prudencial: number;
  acimaDoLimite: number;
  rgfAtrasado: number;
  numerosQueNaoFecham: number;
  semRgf: number;
};

export function contar(linhas: Linha[]): Contagem {
  const ok = linhas.filter((l) => l.ok && typeof l.pct === "number");
  return {
    municipios: linhas.length,
    comNumero: ok.length,
    alerta: ok.filter((l) => l.pct! >= 48.6 && l.pct! < 51.3).length,
    prudencial: ok.filter((l) => l.pct! >= 51.3 && l.pct! <= 54).length,
    acimaDoLimite: ok.filter((l) => l.pct! > 54).length,
    rgfAtrasado: linhas.filter((l) => l.atrasado).length,
    numerosQueNaoFecham: linhas.filter((l) => l.inconsistente || (!l.ok && l.causa === "inconsistente")).length,
    semRgf: linhas.filter((l) => !l.ok && l.causa === "nao_publicado").length,
  };
}

function principal() {
  const [pasta, saida] = [process.argv[2], process.argv[3]];
  const linhas: Linha[] = [];
  for (const d of readdirSync(pasta)) {
    const dir = join(pasta, d);
    for (const f of existsSync(dir) ? readdirSync(dir) : []) {
      if (f.endsWith(".json")) linhas.push(...(JSON.parse(readFileSync(join(dir, f), "utf8")) as Linha[]));
    }
  }
  // O Distrito Federal tem limites de estado: fica fora da régua municipal.
  const municipais = linhas.filter((l) => l.cod !== "5300108" && l.uf !== "DF");
  const ufs = [...new Set(municipais.map((l) => l.uf))].sort();
  const panorama = {
    geradoEm: new Date().toISOString().slice(0, 10),
    fonte: "Tesouro Nacional (Siconfi), RGF mais recente de cada prefeitura",
    brasil: contar(municipais),
    porUf: Object.fromEntries(ufs.map((uf) => [uf, contar(municipais.filter((l) => l.uf === uf))])),
  };
  if (panorama.brasil.municipios < 5500) {
    console.error(`Auditoria incompleta (${panorama.brasil.municipios}); panorama não atualizado.`);
    process.exit(1);
  }
  writeFileSync(saida, JSON.stringify(panorama, null, 1) + "\n");
  console.log(JSON.stringify(panorama.brasil));
}

if (process.argv[1]?.endsWith("panorama.ts")) principal();
