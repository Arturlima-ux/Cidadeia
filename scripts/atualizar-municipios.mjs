// ── TABELA DE MUNICÍPIOS: GERADA UMA VEZ, USADA SEMPRE ──
//
// O site consultava o IBGE a cada clique para achar um município pelo nome.
// Quando o IBGE demorava, a tela dizia "esse município não existe" — para
// Barro Duro/PI, que existe. Município pequeno pagava pela instabilidade de
// um servidor que não é nosso.
//
// A lista inteira do Brasil cabe num arquivo: 5.571 linhas de código, nome,
// UF e população estimada. Este script baixa do IBGE e grava em
// src/dados/municipios.json. A busca no sistema passa a ser local e
// instantânea, sem rede.
//
// RODAR UMA VEZ POR ANO, quando o IBGE publica a estimativa nova
// (normalmente em agosto/setembro):
//
//   node scripts/atualizar-municipios.mjs
//
// e commitar o JSON. O teste em tests/municipios.test.ts avisa quando a
// estimativa ficou velha.

import { writeFileSync } from "node:fs";

const URL_MUNICIPIOS = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado";
const URL_POPULACAO =
  "https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[all]";

async function baixar(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

const [municipios, populacao] = await Promise.all([baixar(URL_MUNICIPIOS), baixar(URL_POPULACAO)]);

const series = populacao[0].resultados[0].series;
const popPorCodigo = new Map();
let anoEstimativa = null;
for (const s of series) {
  const [ano, valor] = Object.entries(s.serie).sort().at(-1);
  anoEstimativa = ano;
  const n = Number(valor);
  if (Number.isFinite(n) && n > 0) popPorCodigo.set(String(s.localidade.id), n);
}

// Formato compacto: [codigo, nome, uf, populacao]. Nome e UF do IBGE, sem
// alteração — é a grafia oficial que a busca normaliza na hora de comparar.
const linhas = municipios
  .map((m) => [String(m["municipio-id"]), m["municipio-nome"], m["UF-sigla"], popPorCodigo.get(String(m["municipio-id"])) ?? null])
  .sort((a, b) => a[0].localeCompare(b[0]));

const semPopulacao = linhas.filter((l) => l[3] === null);
if (semPopulacao.length > 0) {
  console.warn(`aviso: ${semPopulacao.length} município(s) sem população na estimativa:`, semPopulacao.map((l) => `${l[1]}/${l[2]}`).join(", "));
}

const saida = {
  fonte: "IBGE — localidades/municipios e agregado 6579 (população residente estimada), variável 9324",
  anoEstimativa: Number(anoEstimativa),
  geradoEm: new Date().toISOString().slice(0, 10),
  total: linhas.length,
  municipios: linhas,
};

writeFileSync(new URL("../src/dados/municipios.json", import.meta.url), JSON.stringify(saida));
console.log(`gravado: ${linhas.length} municípios, estimativa ${anoEstimativa}, ${semPopulacao.length} sem população`);
