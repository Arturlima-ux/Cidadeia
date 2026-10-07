// ── VIGIA SEMANAL DO SITE: O QUE NÃO PODE ACONTECER ──
//
// Lê as partes da auditoria e confere as regras que, se quebrarem, fazem o
// site dizer coisa errada sobre uma prefeitura. Escreve o resumo em
// resumo.md e sai com erro quando alguma regra quebra: o workflow então abre
// um aviso (issue) no GitHub, que chega por e-mail.
//
// Uso: tsx scripts/vigia/verificar.ts <pasta-das-partes>
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type Linha = { cod: string; m: string; uf: string; ok: boolean; pct?: number; causa?: string; aviso?: boolean; texto?: string | null };

const pasta = process.argv[2];
const linhas: Linha[] = [];
for (const d of readdirSync(pasta)) {
  const dir = join(pasta, d);
  for (const f of existsSync(dir) ? readdirSync(dir) : []) {
    if (f.endsWith(".json")) linhas.push(...(JSON.parse(readFileSync(join(dir, f), "utf8")) as Linha[]));
  }
}

const total = linhas.length;
const com = linhas.filter((l) => l.ok);
const causa = (c: string) => linhas.filter((l) => !l.ok && l.causa === c);
const porCodigo = new Map(linhas.map((l) => [l.cod, l]));
const pct = (n: number) => `${((n / Math.max(1, total)) * 100).toFixed(1).replace(".", ",")}%`;

const falhas: string[] = [];
const regra = (ok: boolean, texto: string) => {
  if (!ok) falhas.push(texto);
};

regra(total >= 5500, `A auditoria cobriu só ${total} municípios (esperado 5.571): alguma parte quebrou.`);
regra(com.length / Math.max(1, total) >= 0.985, `Só ${pct(com.length)} dos municípios mostram a despesa com pessoal (mínimo: 98,5%).`);
regra(causa("consulta_falhou").length / Math.max(1, total) <= 0.015, `${causa("consulta_falhou").length} municípios sem resposta do Tesouro (máximo: 1,5%). A API pode ter mudado ou estar bloqueando.`);
regra(causa("nao_publicado").length <= 60, `${causa("nao_publicado").length} municípios dados como "não publicado" (normal: ~20). Pode ser acusação falsa em massa.`);
const fora = com.filter((l) => (l.pct ?? 0) < 5 || (l.pct ?? 0) > 100);
regra(fora.length === 0, `${fora.length} municípios com percentual impossível na tela: ${fora.slice(0, 10).map((l) => `${l.m}/${l.uf} ${l.pct}%`).join(", ")}.`);

// Sentinelas: casos que já deram errado uma vez.
const sentinela = (cod: string, nome: string, ok: (l: Linha) => boolean, esperado: string) => {
  const l = porCodigo.get(cod);
  regra(!!l && ok(l), `${nome}: esperado ${esperado}; veio ${l ? (l.ok ? `${l.pct}%` : l.causa) : "nada"}.`);
};
sentinela("3201001", "Boa Esperança/ES (RGF simplificado)", (l) => l.ok, "número");
sentinela("5300108", "Brasília/DF (Distrito Federal)", (l) => l.ok && /Governo do Distrito Federal/.test(l.texto ?? ""), "número declarado pelo GDF");
sentinela("2605459", "Fernando de Noronha/PE (sem prefeitura)", (l) => !l.ok && l.causa === "sem_prefeitura", "sem_prefeitura");
sentinela("2211001", "Teresina/PI (capital, RGF comum)", (l) => l.ok, "número");
sentinela("1502806", "Curralinho/PA (números que não fecham)", (l) => !(l.ok && (l.pct ?? 0) > 100), "nunca 451%");

const lista = (ls: Linha[]) => ls.map((l) => `${l.m}/${l.uf}`).join(", ") || "nenhum";
const resumo = [
  `## Vigia dos dados públicos — ${new Date().toISOString().slice(0, 10)}`,
  "",
  falhas.length ? `**${falhas.length} regra(s) quebrada(s):**\n\n${falhas.map((f) => `- ${f}`).join("\n")}` : "**Tudo certo.**",
  "",
  "| | Municípios |",
  "|---|---|",
  `| Com despesa com pessoal na tela | ${com.length} (${pct(com.length)}) |`,
  `| … com aviso ao lado (período atrasado ou números anteriores que não fecham) | ${com.filter((l) => l.aviso).length} |`,
  `| Não publicado (confirmado no extrato) | ${causa("nao_publicado").length} |`,
  `| Números declarados que não fecham | ${causa("inconsistente").length} |`,
  `| Entregue, sem dados abertos | ${causa("entregue_sem_dados").length} |`,
  `| Publicado em branco | ${causa("em_branco").length} |`,
  `| Tesouro não respondeu | ${causa("consulta_falhou").length} |`,
  `| Sem prefeitura | ${causa("sem_prefeitura").length} |`,
  "",
  `Não publicado: ${lista(causa("nao_publicado"))}.`,
  "",
  `Tesouro não respondeu: ${lista(causa("consulta_falhou"))}.`,
].join("\n");

writeFileSync("resumo.md", resumo);
console.log(resumo);
process.exit(falhas.length ? 1 : 0);
