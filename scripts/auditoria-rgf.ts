// Auditoria do RGF em todos os municípios. Roda fora do site (GitHub Actions),
// com o MESMO código que a home usa: buscarRgfMaisRecente + fatoDoPessoal.
// Uso: tsx scripts/auditoria-rgf.ts <parte> <total-de-partes> <saida.json>
import { writeFileSync } from "node:fs";
import { todosOsMunicipios } from "@/lib/municipios";
import { buscarRgfMaisRecente } from "@/lib/siconfi-rgf";
import { fatoDoPessoal } from "@/lib/fatos-do-municipio";

const [parte, partes, saida] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
const lista = todosOsMunicipios().filter((_, i) => i % partes === parte);
const linhas: unknown[] = [];
const inicio = Date.now();

async function principal() {
for (const [n, m] of lista.entries()) {
  const t = Date.now();
  let r = await buscarRgfMaisRecente(m.codigo, 2026, 10);
  // Uma segunda chance espaçada, como um visitante que recarrega a página.
  if (!r.ok && r.causa === "consulta_falhou") {
    await new Promise((ok) => setTimeout(ok, 5000));
    r = await buscarRgfMaisRecente(m.codigo, 2026, 10);
  }
  const base = { cod: m.codigo, m: m.nome, uf: m.uf, pop: m.populacao, ms: Date.now() - t };
  linhas.push(
    r.ok
      ? { ...base, ok: true, periodo: `${r.dados.periodo.exercicio} ${r.dados.periodo.periodicidade}${r.dados.periodo.periodo}`, pct: +((r.dados.despesaTotal / r.dados.rclAjustada) * 100).toFixed(2), reserva: r.dados.rclVeioDeReserva }
      : { ...base, ok: false, causa: r.causa, entregue: r.periodoEntregue ?? null, texto: fatoDoPessoal(r, new Date().toISOString()).ausencia }
  );
  if (n % 50 === 0) {
    writeFileSync(saida, JSON.stringify(linhas));
    console.log(`${n}/${lista.length} em ${Math.round((Date.now() - inicio) / 1000)} s`);
  }
  await new Promise((ok) => setTimeout(ok, 300));
}
writeFileSync(saida, JSON.stringify(linhas));
console.log(`fim: ${lista.length} em ${Math.round((Date.now() - inicio) / 1000)} s`);
}

void principal();
