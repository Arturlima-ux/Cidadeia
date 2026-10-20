import type { DeteccaoAutomatica } from "@/lib/deteccao-automatica";

// ── O SIOPE: O QUE A PREFEITURA DECLAROU SOBRE A EDUCAÇÃO ──
//
// O SIOPE (FNDE) é onde o município declara, a cada bimestre, a receita e a
// despesa da educação. Dali saem os percentuais OFICIAIS: os 25% em
// manutenção e desenvolvimento do ensino (Constituição, art. 212) e os 70%
// do FUNDEB na remuneração dos profissionais (Lei 14.113/2020, art. 26). É o
// número que o Tribunal de Contas e o FNDE olham, calculado pelo próprio
// sistema com a declaração do contador: aqui nada é estimado.
//
// E o prazo: 30 dias depois de cada bimestre (Lei 14.113/2020, art. 38,
// § 1º). Perder o prazo suspende as transferências voluntárias e novas
// operações de crédito até a declaração chegar. Em outubro de 2026, só 23 dos
// 224 municípios do Piauí tinham declarado o 4º bimestre. É o tipo de coisa
// que a prefeitura só descobre quando o convênio trava.
//
// Formato conferido ao vivo em outubro de 2026 (API Olinda/OData do FNDE):
//   - o município vem com 6 dígitos (o código IBGE sem o verificador);
//   - Dados_Gerais_Siope traz uma linha por município que declarou o
//     bimestre, com DAT_DECL;
//   - Indicadores_Siope traz uma linha por indicador, identificado por
//     COD_EXIB ("1.1" = 25% em MDE, "1.2" = 70% do FUNDEB...). O COD_INDI
//     muda entre estado e município, o COD_EXIB não. VAL_INDI vem em texto.
//   - No meio do ano o percentual é parcial e pode até sair negativo (as
//     deduções entram antes da despesa): só o 6º bimestre fecha o exercício.

export const codigoSiope = (codigoIbge: string) => codigoIbge.slice(0, 6);

export type IndicadorCru = {
  TIPO?: string;
  NUM_ANO?: number;
  NUM_PERI?: number;
  COD_MUNI?: number | null;
  NOM_MUNI?: string | null;
  COD_EXIB?: string | null;
  NOM_INDI?: string | null;
  VAL_INDI?: string | number | null;
};

export type DeclaracaoCru = { COD_MUNI?: number | null; NOM_MUNI?: string | null; DAT_DECL?: string | null };

/** Os percentuais e valores que interessam, de um bimestre. */
export type Indicadores = {
  ano: number;
  bimestre: number;
  /** % da receita de impostos em MDE (mínimo 25%). */
  mde: number | null;
  /** % do FUNDEB na remuneração dos profissionais (mínimo 70%). */
  fundeb70: number | null;
  /** % do FUNDEB recebido e não aplicado no exercício (máximo 10%). */
  fundebNaoAplicado: number | null;
  /** Valor que deveria ter ido para MDE e o que foi (R$). */
  exigidoMde: number | null;
  aplicadoMde: number | null;
};

const QUAIS: { campo: keyof Omit<Indicadores, "ano" | "bimestre">; exib: string; nome: RegExp }[] = [
  { campo: "mde", exib: "1.1", nome: /25\s*%/ },
  { campo: "fundeb70", exib: "1.2", nome: /70\s*%/ },
  { campo: "fundebNaoAplicado", exib: "1.4", nome: /n[ãa]o aplicad/i },
  { campo: "exigidoMde", exib: "8.1", nome: /exigido/i },
  { campo: "aplicadoMde", exib: "8.2", nome: /aplicado/i },
];

const numero = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Lê as linhas de indicadores de UM município num bimestre. Null se não há nenhum dos que interessam. */
export function lerIndicadores(linhas: IndicadorCru[], ano: number, bimestre: number): Indicadores | null {
  const saida: Indicadores = { ano, bimestre, mde: null, fundeb70: null, fundebNaoAplicado: null, exigidoMde: null, aplicadoMde: null };
  let achou = false;
  for (const q of QUAIS) {
    // O código de exibição confirma pelo nome: se o FNDE renumerar, melhor faltar do que trocar.
    const l = linhas.find((x) => x.COD_EXIB === q.exib && q.nome.test(x.NOM_INDI ?? ""));
    const v = l ? numero(l.VAL_INDI) : null;
    if (v !== null) {
      saida[q.campo] = v;
      achou = true;
    }
  }
  return achou ? saida : null;
}

// ── PRAZOS ──
const DIA = 86_400_000;
/** 30 dias depois do último dia do bimestre (Lei 14.113/2020, art. 38, § 1º). */
export function prazoDoBimestre(ano: number, bimestre: number): string {
  const fim = Date.UTC(ano, bimestre * 2, 0);
  return new Date(fim + 30 * DIA).toISOString().slice(0, 10);
}

/**
 * Os bimestres cujo prazo já venceu e que importam agora: os do ano corrente
 * e o fechamento do ano anterior (6º). Em janeiro, antes de vencer o 6º, os
 * do ano anterior ainda são os mais recentes.
 */
export function bimestresParaConferir(hoje: Date): { ano: number; bimestre: number }[] {
  const ano = hoje.getUTCFullYear();
  const hojeIso = hoje.toISOString().slice(0, 10);
  const lista: { ano: number; bimestre: number }[] = [];
  for (const a of [ano - 1, ano]) {
    for (let b = 1; b <= 6; b++) {
      if (prazoDoBimestre(a, b) >= hojeIso) continue;
      if (a === ano - 1 && b < 6 && hoje.getUTCMonth() > 0) continue;
      lista.push({ ano: a, bimestre: b });
    }
  }
  return lista;
}

export type DeclaracaoBimestre = {
  ano: number;
  bimestre: number;
  prazo: string;
  declaradoEm: string | null;
  /** Quantos municípios do estado declararam. Zero = a consulta não serve para concluir nada. */
  noEstado: number;
};

export type FotografiaSiope = {
  codigo: string;
  uf: string;
  /** Municípios do estado (IBGE). */
  totalNoEstado: number;
  declaracoes: DeclaracaoBimestre[];
  /** O bimestre mais recente declarado no ano corrente (parcial). */
  parcial: Indicadores | null;
  /** O 6º bimestre do ano anterior: o exercício fechado. */
  fechamento: Indicadores | null;
  /** Como ficou o estado no fechamento do ano anterior. */
  estado: { ano: number; comDado: number; abaixo25: number; abaixo70: number } | null;
};

/** Resume as linhas do estado (só municípios) em quantos ficaram abaixo de cada mínimo. */
export function resumirEstado(linhas: IndicadorCru[], ano: number): FotografiaSiope["estado"] {
  const porMunicipio = new Map<number, IndicadorCru[]>();
  for (const l of linhas) {
    if (l.TIPO !== "Municipal" || typeof l.COD_MUNI !== "number") continue;
    porMunicipio.set(l.COD_MUNI, [...(porMunicipio.get(l.COD_MUNI) ?? []), l]);
  }
  if (!porMunicipio.size) return null;
  let abaixo25 = 0;
  let abaixo70 = 0;
  for (const ls of porMunicipio.values()) {
    const i = lerIndicadores(ls, ano, 6);
    if (i?.mde !== null && i?.mde !== undefined && i.mde < 25) abaixo25++;
    if (i?.fundeb70 !== null && i?.fundeb70 !== undefined && i.fundeb70 < 70) abaixo70++;
  }
  return { ano, comDado: porMunicipio.size, abaixo25, abaixo70 };
}

// ── ALERTAS ──
const br = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const lista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`);

export function achadosDoSiope(f: FotografiaSiope): DeteccaoAutomatica[] {
  const achados: DeteccaoAutomatica[] = [];

  // 1. Declaração em atraso. Só conta bimestre em que o estado tem declarações:
  //    se ninguém aparece, o problema é da consulta, não da prefeitura.
  const faltando = f.declaracoes.filter((d) => !d.declaradoEm && d.noEstado > 0);
  if (faltando.length) {
    // O mais antigo dá a dimensão do atraso; o mais recente dá a identidade do
    // alerta (um bimestre novo perdido vira alerta novo, e e-mail).
    const primeiro = faltando[0];
    const ultimo = faltando[faltando.length - 1];
    const porAno = new Map<number, number[]>();
    for (const d of faltando) porAno.set(d.ano, [...(porAno.get(d.ano) ?? []), d.bimestre]);
    const quais = [...porAno].map(([ano, bs]) => `${lista(bs.map((b) => `${b}º`))} ${bs.length > 1 ? "bimestres" : "bimestre"} de ${ano}`);
    achados.push({
      categoria: "prazo",
      prioridade: "urgente",
      secretaria: "educacao",
      titulo: `SIOPE em atraso: ${lista(quais)} sem declaração`,
      descricao:
        `A declaração ao SIOPE (FNDE) vence 30 dias depois de cada bimestre; ${faltando.length > 1 ? "a mais antiga em aberto, " : "a "}do ${primeiro.bimestre}º bimestre de ${primeiro.ano}, venceu em ${br(primeiro.prazo)}. ` +
        `Enquanto não for transmitida, ficam suspensas as transferências voluntárias e novas operações de crédito (Lei 14.113/2020, art. 38, § 1º). ` +
        `No ${f.uf}, ${primeiro.noEstado} de ${f.totalNoEstado} municípios já declararam esse bimestre. Quem transmite é o contador ou o responsável pela educação no município.`,
      chave: `siope:atraso:${ultimo.ano}-${ultimo.bimestre}`,
    });
  }

  // 2. O exercício fechado: os mínimos, pelo número oficial.
  const fe = f.fechamento;
  if (fe) {
    const estado = f.estado && f.estado.ano === fe.ano ? f.estado : null;
    if (fe.mde !== null && fe.mde < 25) {
      const falta = fe.exigidoMde !== null && fe.aplicadoMde !== null && fe.exigidoMde > fe.aplicadoMde ? fe.exigidoMde - fe.aplicadoMde : null;
      achados.push({
        categoria: "financeiro",
        prioridade: "urgente",
        secretaria: "educacao",
        titulo: `Educação abaixo de 25% em ${fe.ano}, pelo SIOPE`,
        descricao:
          `Pela declaração do 6º bimestre ao SIOPE, o município aplicou ${pct(fe.mde)} da receita de impostos em manutenção e desenvolvimento do ensino em ${fe.ano}` +
          `${falta ? ` (faltaram ${reais(falta)})` : ""}, abaixo dos 25% da Constituição (art. 212). ` +
          `O mínimo é condição para transferências voluntárias (LRF, art. 25, § 1º, IV, b) e pesa no parecer das contas. ` +
          `Vale conferir a declaração com o contador e, se o número estiver certo, compensar no exercício seguinte.` +
          (estado ? ` No ${f.uf}, ${estado.abaixo25} de ${estado.comDado} municípios ficaram abaixo de 25% em ${estado.ano}.` : ""),
        chave: `siope:mde:${fe.ano}`,
      });
    }
    if (fe.fundeb70 !== null && fe.fundeb70 < 70) {
      achados.push({
        categoria: "financeiro",
        prioridade: "urgente",
        secretaria: "educacao",
        titulo: `FUNDEB abaixo de 70% na remuneração em ${fe.ano}, pelo SIOPE`,
        descricao:
          `Pela declaração do 6º bimestre ao SIOPE, ${pct(fe.fundeb70)} do FUNDEB de ${fe.ano} foram para a remuneração dos profissionais da educação; ` +
          `o mínimo é 70% (Lei 14.113/2020, art. 26). O conselho do FUNDEB e o Tribunal de Contas olham este número.` +
          (estado ? ` No ${f.uf}, ${estado.abaixo70} de ${estado.comDado} municípios ficaram abaixo de 70% em ${estado.ano}.` : ""),
        chave: `siope:fundeb70:${fe.ano}`,
      });
    }
    if (fe.fundebNaoAplicado !== null && fe.fundebNaoAplicado > 10) {
      achados.push({
        categoria: "financeiro",
        prioridade: "medio",
        secretaria: "educacao",
        titulo: `${pct(fe.fundebNaoAplicado)} do FUNDEB de ${fe.ano} ficaram sem aplicar`,
        descricao:
          `Pelo SIOPE, ${pct(fe.fundebNaoAplicado)} do FUNDEB recebido em ${fe.ano} não foram aplicados no ano. ` +
          `A lei permite deixar até 10% para o primeiro quadrimestre do ano seguinte, com crédito adicional (Lei 14.113/2020, art. 25, § 3º); o que passar disso é descumprimento.`,
        chave: `siope:naoaplicado:${fe.ano}`,
      });
    }
  }
  return achados;
}
