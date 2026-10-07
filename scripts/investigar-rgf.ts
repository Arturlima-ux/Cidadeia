// Investigação temporária dos casos estranhos da auditoria completa.
import { readFileSync, writeFileSync } from "node:fs";
const BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";
type Caso = { cod: string; m: string; uf: string; ok: boolean; periodo: string | null; pct: number | null; causa: string | null };
async function itens(caminho: string, p: Record<string, string>) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${BASE}/${caminho}?${new URLSearchParams(p)}`);
      const j = await r.json();
      return (j.items ?? []) as Record<string, unknown>[];
    } catch { await new Promise((ok) => setTimeout(ok, 2000)); }
  }
  return null;
}
async function principal() {
  const casos: Caso[] = JSON.parse(readFileSync("scripts/investigar.json", "utf8"));
  const saida: unknown[] = [];
  for (const c of casos) {
    const r: Record<string, unknown> = { ...c };
    if (c.ok && c.periodo) {
      const [ex, pp] = c.periodo.split(" ");
      for (const tipo of ["RGF", "RGF Simplificado"]) {
        const l = await itens("rgf", { an_exercicio: ex, in_periodicidade: pp[0], nr_periodo: pp.slice(1), co_tipo_demonstrativo: tipo, no_anexo: "RGF-Anexo 01", co_poder: "E", co_esfera: "M", id_ente: c.cod });
        if (l && l.length) {
          r.tipo = tipo;
          r.linhas = l.filter((i) => /^(DespesaComPessoalTotal|ReceitaCorrenteLiquida|LimiteMaximo)/.test(String(i.cod_conta)) && /^(Valor|%)/i.test(String(i.coluna)))
            .map((i) => [i.cod_conta, i.coluna, i.valor, i.instituicao]);
          r.bruta = l.filter((i) => i.cod_conta === "DespesaComPessoalBruta" && String(i.coluna).startsWith("TOTAL")).map((i) => i.valor);
          break;
        }
      }
    } else {
      r.e2025 = (await itens("extrato_entregas", { id_ente: c.cod, an_referencia: "2025" }))?.filter((i) => !/MSC/.test(String(i.entregavel))).map((i) => `${i.instituicao} | ${i.entregavel} p${i.periodo}${i.periodicidade} ${i.status_relatorio}`);
      r.e2026 = (await itens("extrato_entregas", { id_ente: c.cod, an_referencia: "2026" }))?.filter((i) => !/MSC/.test(String(i.entregavel))).map((i) => `${i.instituicao} | ${i.entregavel} p${i.periodo}${i.periodicidade} ${i.status_relatorio}`);
      if (c.uf === "DF") {
        for (const esfera of ["E", "D"]) {
          const l = await itens("rgf", { an_exercicio: "2026", in_periodicidade: "Q", nr_periodo: "2", co_tipo_demonstrativo: "RGF", no_anexo: "RGF-Anexo 01", co_poder: "E", co_esfera: esfera, id_ente: "53" });
          r[`df_esfera_${esfera}`] = l?.filter((i) => /^(DespesaComPessoalTotal|ReceitaCorrenteLiquidaAjustada)$/.test(String(i.cod_conta))).map((i) => [i.cod_conta, i.coluna, i.valor, i.instituicao]) ?? null;
        }
      }
    }
    saida.push(r);
    await new Promise((ok) => setTimeout(ok, 400));
  }
  writeFileSync("investigacao.json", JSON.stringify(saida, null, 1));
}
void principal();
