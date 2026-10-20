// ── O PANORAMA DAS OBRAS FEDERAIS, POR ESTADO ──
//
// Quantas obras com dinheiro federal estão paralisadas, inacabadas e em
// execução em cada estado, pelo ObrasGov. Só contagens: cada prefeitura vê as
// suas no painel (lib/obras-federais.ts) e, ao lado, como está o estado.
//
// Uso: tsx scripts/vigia/panorama-obras.ts src/dados/panorama-obras.json
import { writeFileSync } from "node:fs";

const BASE = "https://api-publica.obrasgov.gestao.gov.br/obras/projeto-investimento";
const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];
const SITUACOES = { paralisadas: "Paralisada", inacabadas: "Inacabada", emExecucao: "Em execução" } as const;

async function contar(uf: string, situacao: string): Promise<number | null> {
  const url = new URL(BASE);
  url.searchParams.set("uf_principal", uf);
  url.searchParams.set("situacao", situacao);
  url.searchParams.set("pagina", "1");
  url.searchParams.set("tamanho_da_pagina", "1");
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
      if (r.ok) {
        const corpo = (await r.json()) as { total_items?: unknown };
        if (typeof corpo.total_items === "number") return corpo.total_items;
      }
    } catch {
      // tenta de novo
    }
    await new Promise((res) => setTimeout(res, 2_000 * (t + 1)));
  }
  return null;
}

async function main() {
  const saida = process.argv[2];
  if (!saida) throw new Error("Uso: tsx scripts/vigia/panorama-obras.ts <saida.json>");
  const porUf: Record<string, Record<keyof typeof SITUACOES, number>> = {};
  const brasil = { paralisadas: 0, inacabadas: 0, emExecucao: 0 };
  let falhas = 0;
  for (const uf of UFS) {
    const linha = { paralisadas: 0, inacabadas: 0, emExecucao: 0 };
    for (const [chave, situacao] of Object.entries(SITUACOES) as [keyof typeof SITUACOES, string][]) {
      const n = await contar(uf, situacao);
      if (n === null) falhas++;
      linha[chave] = n ?? 0;
      brasil[chave] += n ?? 0;
    }
    porUf[uf] = linha;
  }
  // Com muita falha, não publica: um estado com zero falso enganaria a tela.
  if (falhas > 5) throw new Error(`ObrasGov falhou em ${falhas} consultas; panorama não atualizado.`);
  writeFileSync(saida, `${JSON.stringify({ geradoEm: new Date().toISOString().slice(0, 10), fonte: "ObrasGov (Cadastro Integrado de Projetos de Investimento)", brasil, porUf }, null, 1)}\n`);
  console.log(`Panorama de obras: ${brasil.paralisadas} paralisadas, ${brasil.inacabadas} inacabadas no Brasil.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
