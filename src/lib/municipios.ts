// ── TODOS OS MUNICÍPIOS DO BRASIL, SEM REDE ──
//
// A busca de município consultava o IBGE a cada clique. Quando o IBGE não
// respondia, a tela dizia "esse município não existe" — para Barro Duro/PI,
// que existe. Um prefeito de cidade pequena, que ninguém aqui conhece, não
// pode depender de um servidor alheio estar de pé no segundo em que clica.
//
// A tabela inteira (5.571 municípios: código, nome, UF, população estimada)
// vive em src/dados/municipios.json, gerada por scripts/atualizar-municipios.mjs
// a partir do IBGE. A busca é local, instantânea e determinística. Só entra
// em src/lib — nunca num componente cliente — para o arquivo de 200 KB não
// ir para o navegador.
//
// A população é a estimativa do IBGE do ano gravado no JSON. É a mesma que
// define porte no simulador, no contrato e nas regras da LRF: um número só,
// de fonte pública, que ninguém declara.

import tabela from "@/dados/municipios.json";

type Linha = [codigo: string, nome: string, uf: string, populacao: number | null];

const DADOS = tabela as {
  fonte: string;
  anoEstimativa: number;
  geradoEm: string;
  total: number;
  municipios: Linha[];
};

export type Municipio = { codigo: string; nome: string; uf: string; populacao: number | null };

export const ANO_ESTIMATIVA_POPULACAO = DADOS.anoEstimativa;
export const TOTAL_MUNICIPIOS = DADOS.total;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function paraMunicipio([codigo, nome, uf, populacao]: Linha): Municipio {
  return { codigo, nome, uf, populacao };
}

// Índices montados uma vez por processo.
const porCodigo = new Map<string, Linha>();
const porUf = new Map<string, Linha[]>();
for (const linha of DADOS.municipios) {
  porCodigo.set(linha[0], linha);
  const lista = porUf.get(linha[2]) ?? [];
  lista.push(linha);
  porUf.set(linha[2], lista);
}

export function municipioPorCodigo(codigo: string): Municipio | null {
  const l = porCodigo.get(codigo);
  return l ? paraMunicipio(l) : null;
}

export type ResultadoBuscaLocal =
  | { ok: true; municipio: Municipio }
  | { ok: false; motivo: "uf_invalida" }
  | { ok: false; motivo: "nao_encontrado"; sugestoes: string[] };

/**
 * Nome + UF → município. Ignora acento, caixa e pontuação.
 *
 * Sem correspondência exata, aceita um único nome que contenha o digitado
 * ("barro d" → Barro Duro) e, havendo vários, devolve até cinco como
 * sugestão sem escolher — nome de município pequeno é o que mais se erra.
 */
export function procurarMunicipioLocal(nome: string, uf: string): ResultadoBuscaLocal {
  const lista = porUf.get(uf.trim().toUpperCase());
  if (!lista) return { ok: false, motivo: "uf_invalida" };

  const alvo = normalizar(nome);
  if (!alvo) return { ok: false, motivo: "nao_encontrado", sugestoes: [] };

  const exato = lista.find((l) => normalizar(l[1]) === alvo);
  if (exato) return { ok: true, municipio: paraMunicipio(exato) };

  if (alvo.length < 3) return { ok: false, motivo: "nao_encontrado", sugestoes: [] };

  // Quem COMEÇA com o digitado vem antes de quem só contém: "barro d" é
  // Barro Duro, não "Lagoa do Barro do Piauí". Um único começo é aceito;
  // vários (ou nenhum começo e vários contendo) viram sugestão.
  const comecam = lista.filter((l) => normalizar(l[1]).startsWith(alvo));
  if (comecam.length === 1) return { ok: true, municipio: paraMunicipio(comecam[0]) };

  const contem = lista.filter((l) => normalizar(l[1]).includes(alvo));
  if (comecam.length === 0 && contem.length === 1) return { ok: true, municipio: paraMunicipio(contem[0]) };

  const sugestoes = [...comecam, ...contem.filter((l) => !comecam.includes(l))].slice(0, 5).map((l) => l[1]);
  return { ok: false, motivo: "nao_encontrado", sugestoes };
}
