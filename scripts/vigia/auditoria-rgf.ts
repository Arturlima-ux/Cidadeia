// ── VIGIA SEMANAL DO SITE: AUDITORIA DO RGF ──
//
// Roda no GitHub Actions (.github/workflows/vigia-dados-publicos.yml), fora do
// site, com o MESMO código que a home usa: buscarRgfMaisRecente + fatoDoPessoal.
// Cada parte cobre um oitavo dos 5.571 municípios, uma cidade por vez.
//
// Uso: tsx scripts/vigia/auditoria-rgf.ts <parte> <total-de-partes> <saida.json>
import { writeFileSync } from "node:fs";
import { todosOsMunicipios } from "@/lib/municipios";
import { buscarRgfMaisRecente } from "@/lib/siconfi-rgf";
import { fatoDoPessoal } from "@/lib/fatos-do-municipio";

const [parte, partes, saida] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
const lista = todosOsMunicipios().filter((_, i) => i % partes === parte);
const linhas: unknown[] = [];

async function principal() {
  const agora = new Date();
  for (const m of lista) {
    const t = Date.now();
    let r = await buscarRgfMaisRecente(m.codigo, agora.getUTCFullYear(), agora.getUTCMonth() + 1);
    // Segunda chance espaçada, como um visitante que recarrega a página.
    if (!r.ok && r.causa === "consulta_falhou") {
      await new Promise((ok) => setTimeout(ok, 5000));
      r = await buscarRgfMaisRecente(m.codigo, agora.getUTCFullYear(), agora.getUTCMonth() + 1);
    }
    const base = { cod: m.codigo, m: m.nome, uf: m.uf, ms: Date.now() - t };
    const fato = fatoDoPessoal(r, new Date().toISOString());
    linhas.push(
      r.ok
        ? {
            ...base,
            ok: true,
            periodo: `${r.dados.periodo.exercicio} ${r.dados.periodo.periodicidade}${r.dados.periodo.periodo}`,
            pct: +((r.dados.despesaTotal / r.dados.rclAjustada) * 100).toFixed(2),
            aviso: !!r.contexto,
            texto: fato.leitura,
          }
        : { ...base, ok: false, causa: r.causa, texto: fato.ausencia }
    );
    if (linhas.length % 100 === 0) writeFileSync(saida, JSON.stringify(linhas));
    await new Promise((ok) => setTimeout(ok, 300));
  }
  writeFileSync(saida, JSON.stringify(linhas));
}

void principal();
