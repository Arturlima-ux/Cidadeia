import tabela from "@/dados/municipios.json";
import reserva from "@/dados/rgf-reserva.json";
import { descompactar, type LinhaReserva } from "@/lib/rgf-reserva";

// ── ENTRE CIDADES PARECIDAS ──
//
// "48% da RCL com pessoal" não diz ao prefeito se ele está bem. Diz quando
// vem ao lado do vizinho: as cidades do mesmo estado e do mesmo tamanho
// vivem do mesmo FPM, pagam o mesmo piso, enfrentam o mesmo Tribunal de
// Contas. Se 30 delas gastam menos com a mesma realidade, há onde mexer; se
// ele é das que menos gastam, a folga é real.
//
// Nada aqui consulta a rede. A vigia semanal (scripts/vigia/) já lê o RGF dos
// 5.570 municípios toda segunda e grava o último de cada um em
// dados/rgf-reserva.json; a população vem do IBGE (dados/municipios.json).
// A comparação é com o que está publicado no Tesouro, não com o que cada
// prefeitura diz de si.

type Linha = [codigo: string, nome: string, uf: string, populacao: number | null];
const MUNICIPIOS = (tabela as unknown as { municipios: Linha[] }).municipios;
const RESERVA = reserva as unknown as { geradoEm: string | null; m: Record<string, LinhaReserva> };

/** As faixas de população que o IBGE usa nos seus recortes. */
export const FAIXAS = [
  { ate: 5_000, nome: "de até 5 mil habitantes" },
  { ate: 10_000, nome: "de 5 a 10 mil habitantes" },
  { ate: 20_000, nome: "de 10 a 20 mil habitantes" },
  { ate: 50_000, nome: "de 20 a 50 mil habitantes" },
  { ate: 100_000, nome: "de 50 a 100 mil habitantes" },
  { ate: 500_000, nome: "de 100 a 500 mil habitantes" },
  { ate: Infinity, nome: "de mais de 500 mil habitantes" },
] as const;

export function faixaDe(populacao: number): number {
  return FAIXAS.findIndex((f) => populacao <= f.ate);
}

/** Com menos cidades que isto no estado, a comparação passa a ser com o país. */
export const MINIMO_DE_PARES = 8;

/** O RGF tem que ser recente para entrar na conta: comparar o último quadrimestre com um de dois anos atrás engana. */
const EXERCICIOS_ACEITOS = 2;

export type Par = { codigo: string; nome: string; uf: string; percentual: number };

export type Comparacao = {
  /** "do PI" ou "do Brasil". */
  recorte: "uf" | "brasil";
  uf: string;
  faixa: string;
  /** Quantas cidades parecidas têm RGF recente (sem contar a própria). */
  pares: number;
  percentual: number;
  mediana: number;
  /** 1 = a que menos gasta com pessoal entre todas (contando a própria). */
  posicao: number;
  de: number;
  /** Quantas das parecidas passaram dos 51,3% (limite prudencial). */
  acimaDoPrudencial: number;
  /** As três que menos gastam: o exemplo a procurar. */
  melhores: Par[];
  /** Data da leitura do Tesouro em que a comparação se apoia. */
  conferidoEm: string | null;
};

function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Os percentuais de pessoal de todos os municípios com RGF recente. Pura sobre os dados passados. */
export function percentuaisDoTesouro(
  dados: { m: Record<string, LinhaReserva> },
  municipios: Linha[],
  exercicioAtual: number
): Map<string, Par & { faixa: number }> {
  const saida = new Map<string, Par & { faixa: number }>();
  for (const [codigo, nome, uf, populacao] of municipios) {
    const linha = dados.m[codigo];
    if (!linha || !populacao) continue;
    const d = descompactar(linha);
    if (d.periodo.exercicio < exercicioAtual - (EXERCICIOS_ACEITOS - 1) || d.rclAjustada <= 0) continue;
    const percentual = (d.despesaTotal / d.rclAjustada) * 100;
    if (!Number.isFinite(percentual) || percentual <= 0 || percentual > 100) continue;
    saida.set(codigo, { codigo, nome, uf, percentual, faixa: faixaDe(populacao) });
  }
  return saida;
}

/**
 * A prefeitura entre as cidades do mesmo estado e do mesmo porte. `percentual`
 * é o número dela (o do painel, que pode ser mais novo que o da vigia).
 * Devolve null quando não há com quem comparar.
 */
export function compararComPares(
  codigoIbge: string,
  percentual: number,
  opcoes: {
    hoje?: Date;
    dados?: { geradoEm: string | null; m: Record<string, LinhaReserva> };
    municipios?: Linha[];
  } = {}
): Comparacao | null {
  const dados = opcoes.dados ?? RESERVA;
  const municipios = opcoes.municipios ?? MUNICIPIOS;
  const hoje = opcoes.hoje ?? new Date();
  const eu = municipios.find((m) => m[0] === codigoIbge);
  if (!eu || !eu[3] || !Number.isFinite(percentual)) return null;
  const faixa = faixaDe(eu[3]);
  const todos = percentuaisDoTesouro(dados, municipios, hoje.getUTCFullYear());

  const mesmaFaixa = [...todos.values()].filter((p) => p.faixa === faixa && p.codigo !== codigoIbge);
  const doEstado = mesmaFaixa.filter((p) => p.uf === eu[2]);
  const recorte = doEstado.length >= MINIMO_DE_PARES ? "uf" : "brasil";
  const grupo = recorte === "uf" ? doEstado : mesmaFaixa;
  if (grupo.length < MINIMO_DE_PARES) return null;

  const valores = grupo.map((p) => p.percentual);
  const melhores = [...grupo].sort((a, b) => a.percentual - b.percentual).slice(0, 3).map((p) => ({ codigo: p.codigo, nome: p.nome, uf: p.uf, percentual: p.percentual }));
  return {
    recorte,
    uf: eu[2],
    faixa: FAIXAS[faixa].nome,
    pares: grupo.length,
    percentual,
    mediana: mediana(valores),
    posicao: valores.filter((v) => v < percentual).length + 1,
    de: grupo.length + 1,
    acimaDoPrudencial: valores.filter((v) => v >= 51.3).length,
    melhores,
    conferidoEm: dados.geradoEm,
  };
}

const pct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

/** Uma frase, para o e-mail da segunda e para a Central. */
export function fraseDaComparacao(c: Comparacao): string {
  const onde = c.recorte === "uf" ? `das ${c.de} cidades do ${c.uf} ${c.faixa}` : `das ${c.de} cidades do Brasil ${c.faixa}`;
  const lado =
    c.percentual <= c.mediana
      ? `abaixo da metade do grupo (${pct(c.mediana)})`
      : `acima da metade do grupo (${pct(c.mediana)})`;
  return `Despesa com pessoal em ${pct(c.percentual)}: ${c.posicao}ª menor ${onde}, ${lado}.`;
}
