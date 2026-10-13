// ── A RESERVA SEMANAL DO RGF ──
//
// Lê as partes da auditoria (scripts/vigia/auditoria-rgf.ts) e grava
// src/dados/rgf-reserva.json: o RGF de cada prefeitura que respondeu, numa
// linha curta. É o que o site mostra quando o Tesouro não responde na hora
// (lib/rgf-reserva.ts). O workflow da vigia publica o arquivo junto com o
// panorama, só quando a auditoria passa nas regras.
//
// Uso: tsx scripts/vigia/reserva.ts <pasta-das-partes> <saida.json>
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type Linha = { cod: string; ok: boolean; dados?: unknown[] };

function principal() {
  const [pasta, saida] = [process.argv[2], process.argv[3]];
  const m: Record<string, unknown[]> = {};
  let total = 0;
  for (const d of readdirSync(pasta)) {
    const dir = join(pasta, d);
    for (const f of existsSync(dir) ? readdirSync(dir) : []) {
      if (!f.endsWith(".json")) continue;
      for (const l of JSON.parse(readFileSync(join(dir, f), "utf8")) as Linha[]) {
        total++;
        if (l.ok && Array.isArray(l.dados)) m[l.cod] = l.dados;
      }
    }
  }
  if (total < 5500 || Object.keys(m).length < 5000) {
    console.error(`Reserva incompleta (${Object.keys(m).length} de ${total}); arquivo não atualizado.`);
    process.exit(1);
  }
  const geradoEm = new Date().toISOString().slice(0, 10);
  writeFileSync(saida, JSON.stringify({ geradoEm, m }) + "\n");
  console.log(`Reserva: ${Object.keys(m).length} prefeituras, ${geradoEm}.`);
}

principal();
