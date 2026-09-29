// ── PLANO DE CONTRATAÇÕES ANUAL ──
//
// ── O QUE A LEI DIZ, LITERALMENTE ──
//
// O art. 12, VII, da Lei 14.133/2021 diz que os órgãos responsáveis pelo
// planejamento "PODERÃO, na forma de regulamento, elaborar plano de
// contratações anual". A palavra é "poderão": no texto literal é faculdade, e
// este módulo não diz "obrigatório" — há doutrina que defende a
// obrigatoriedade a partir do princípio do planejamento, mas doutrina em
// disputa não vira afirmação de tela.
//
// O que o mesmo inciso torna obrigatório é a PUBLICIDADE de quem faz: o plano
// "deverá ser divulgado e mantido à disposição do público em sítio eletrônico
// oficial e será observado pelo ente federativo na realização de licitações e
// na execução dos contratos".
//
// ── POR QUE ELE IMPORTA AQUI, MESMO SENDO FACULTATIVO ──
//
// Fracionamento quase nunca é má-fé. É calendário: o contrato venceu, ninguém
// planejou a substituição, o serviço não podia parar, entrou dispensa
// emergencial, a emergencial virou duas, e a soma passou do limite do art. 75.
//
// O módulo já mostra o fim dessa história (fracionamento) e o começo dela
// (vigência vencendo). O PCA é o antídoto de raiz: é a lista do que vai
// precisar ser contratado e de quando o processo tem de começar.
//
// ── O QUE ESTE MÓDULO NÃO FAZ ──
//
// Não inventa necessidade nem valor. Cada item nasce de um fato que já está no
// banco — um contrato com data de fim, uma compra que se repete todo ano — e
// carrega a origem junto, para o gestor poder conferir e cortar. Um plano com
// item que ninguém reconhece é um plano que ninguém usa.

import { prazoProvavel, diasUteisEntre } from "@/lib/vigencia";
import { termosDoObjeto, semelhanca } from "@/lib/fracionamento";

export const BASE_LEGAL_PCA = "Art. 12, VII, da Lei 14.133/2021";

/**
 * O que o inciso obriga de fato, para a tela citar sem exagerar.
 */
export const PUBLICIDADE_PCA =
  "O plano, uma vez elaborado, deve ser divulgado e mantido à disposição do público em sítio " +
  "eletrônico oficial, e deve ser observado nas licitações e na execução dos contratos " +
  `(${BASE_LEGAL_PCA}).`;

export type OrigemItemPca =
  /** Um contrato com data de fim dentro do ano planejado. */
  | "contrato_vencendo"
  /** Objeto que aparece em exercícios diferentes — compra que se repete. */
  | "compra_recorrente"
  /** Dispensas do mesmo ramo que somadas passam do limite. */
  | "dispensas_agrupadas";

export type ContratoParaPca = {
  id: string;
  objeto: string;
  vigenciaFim: string | null;
  valorGlobal: number | null;
  fornecedorNome: string | null;
};

export type ProcessoParaPca = {
  numero: string;
  objeto: string;
  modalidade: string | null;
  valorEstimado: number | null;
  status: string;
  /** Data em ISO; usada só para saber em que exercício caiu. */
  data: string;
};

export type ItemPca = {
  /** Estável entre gerações, para o gestor poder marcar o que já tratou. */
  chave: string;
  objeto: string;
  origem: OrigemItemPca;
  /** Valor de referência e de ONDE ele veio. Nunca um número inventado. */
  valorReferencia: number | null;
  fundamentoDoValor: string;
  /** Quando a contratação precisa estar pronta. Null quando não há data. */
  precisaEstarPronta: string | null;
  /**
   * Data-limite para começar o processo, recuando do prazo do art. 55.
   * Null quando não há data de necessidade.
   */
  comecarAte: string | null;
  /** A frase que explica por que o item está no plano. */
  justificativa: string;
  /** Ordena: quanto mais cedo precisa, mais acima. */
  peso: number;
};

/** Recua N dias úteis a partir de uma data. */
export function recuarDiasUteis(de: Date, dias: number): Date {
  const cursor = new Date(
    Date.UTC(de.getUTCFullYear(), de.getUTCMonth(), de.getUTCDate(), 12, 0, 0)
  );
  let restantes = dias;
  while (restantes > 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    const d = cursor.getUTCDay();
    if (d !== 0 && d !== 6) restantes--;
  }
  return cursor;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Data-limite para começar, recuando só o prazo legal do edital.
 *
 * ── O QUE ESTA DATA NÃO INCLUI ──
 *
 * O tempo interno: termo de referência, pesquisa de preços, parecer jurídico,
 * reserva orçamentária. A lei não cronometra nada disso, e chutar aqui seria
 * inventar número. Então a data devolvida é o ÚLTIMO instante possível no
 * melhor dos mundos — a tela diz isso, para ninguém tratá-la como confortável.
 */
export function comecarAte(precisaEstarPronta: string, objeto: string): string {
  const prazo = prazoProvavel(objeto);
  return iso(recuarDiasUteis(new Date(`${precisaEstarPronta.slice(0, 10)}T12:00:00Z`), prazo.dias));
}

// ── 1. CONTRATOS QUE VENCEM NO ANO PLANEJADO ──

export function itensDeContratosVencendo(
  contratos: ContratoParaPca[],
  anoPlano: number
): ItemPca[] {
  const itens: ItemPca[] = [];
  for (const c of contratos) {
    if (!c.vigenciaFim) continue;
    const fim = c.vigenciaFim.slice(0, 10);
    if (Number(fim.slice(0, 4)) !== anoPlano) continue;

    const prazo = prazoProvavel(c.objeto);
    itens.push({
      chave: `pca:contrato:${c.id}`,
      objeto: c.objeto,
      origem: "contrato_vencendo",
      valorReferencia: c.valorGlobal,
      fundamentoDoValor:
        c.valorGlobal === null
          ? "Valor global do contrato atual não informado."
          : `Valor global do contrato atual${c.fornecedorNome ? ` com ${c.fornecedorNome}` : ""}.`,
      precisaEstarPronta: fim,
      comecarAte: comecarAte(fim, c.objeto),
      justificativa:
        `O contrato atual encerra em ${fim}. Para não haver interrupção, a nova contratação ` +
        `precisa estar concluída até essa data — e só a publicação do edital consome ` +
        `${prazo.dias} dias úteis (${prazo.base}).`,
      peso: new Date(`${fim}T12:00:00Z`).getTime(),
    });
  }
  return itens;
}

// ── 2. COMPRAS QUE SE REPETEM ──

/**
 * Objetos que aparecem em mais de um exercício.
 *
 * Uma compra que aconteceu em 2024 e em 2025 provavelmente acontecerá em 2026.
 * É a inferência mais fraca das três, e por isso a justificativa diz em que
 * anos aconteceu: o gestor confirma ou corta.
 */
export function itensDeComprasRecorrentes(
  processos: ProcessoParaPca[],
  anoPlano: number
): ItemPca[] {
  const validos = processos.filter((p) => p.status !== "cancelada" && p.data);
  const termos = validos.map((p) => termosDoObjeto(p.objeto));

  const visto = new Set<number>();
  const itens: ItemPca[] = [];

  for (let i = 0; i < validos.length; i++) {
    if (visto.has(i)) continue;
    const grupo = [i];
    for (let j = i + 1; j < validos.length; j++) {
      if (visto.has(j)) continue;
      if (semelhanca(termos[i]!, termos[j]!) >= 0.5) {
        grupo.push(j);
        visto.add(j);
      }
    }
    visto.add(i);

    const anos = new Set(grupo.map((k) => Number(validos[k]!.data.slice(0, 4))));
    // Um exercício só não é recorrência, é uma compra.
    if (anos.size < 2) continue;
    // Já está planejado por um contrato vencendo? Quem chama remove a
    // duplicata; aqui só não se inventa o item duas vezes.
    if (anos.has(anoPlano)) continue;

    const doGrupo = grupo.map((k) => validos[k]!);
    const comValor = doGrupo.filter((p) => p.valorEstimado !== null);
    // A referência é o MAIOR valor já praticado, não a média: planejar pela
    // média deixa o plano curto no ano em que o preço sobe, e plano curto é o
    // que manda o gestor para a dispensa emergencial.
    const maior = comValor.length > 0 ? Math.max(...comValor.map((p) => p.valorEstimado!)) : null;
    const anosOrdenados = [...anos].sort();

    itens.push({
      chave: `pca:recorrente:${[...termos[i]!].sort().join("-").slice(0, 60)}`,
      objeto: doGrupo[0]!.objeto,
      origem: "compra_recorrente",
      valorReferencia: maior,
      fundamentoDoValor:
        maior === null
          ? "Nenhum dos processos anteriores traz valor estimado."
          : `Maior valor já praticado neste objeto (${moeda(maior)}), entre ${comValor.length} ` +
            `${comValor.length === 1 ? "processo" : "processos"}.`,
      precisaEstarPronta: null,
      comecarAte: null,
      justificativa:
        `Objeto contratado em ${anosOrdenados.join(" e ")} (${doGrupo.length} processos: ` +
        `${doGrupo.map((p) => p.numero).join(", ")}). Se a necessidade continuar em ${anoPlano}, ` +
        "entra no plano; se não continuar, é para riscar daqui.",
      // Sem data, vai para o fim da lista: é sugestão, não compromisso.
      peso: Number.MAX_SAFE_INTEGER - doGrupo.length,
    });
  }
  return itens;
}

// ── 3. DISPENSAS QUE DEVERIAM TER SIDO UMA LICITAÇÃO ──

export type GrupoParaPca = {
  termos: string[];
  total: number;
  excedeLimite: boolean;
  processos: { numero: string; objeto: string; valor: number }[];
};

/**
 * Transforma os grupos do detector de fracionamento em itens de plano.
 *
 * É a ligação que fecha o módulo: o fracionamento aponta o que já aconteceu, e
 * o mesmo agrupamento vira a linha do plano que impede que aconteça de novo.
 * Sem isso, o gestor recebe o diagnóstico e nenhum remédio.
 */
export function itensDeDispensasAgrupadas(grupos: GrupoParaPca[], anoPlano: number): ItemPca[] {
  return grupos
    .filter((g) => g.excedeLimite)
    .map((g) => ({
      chave: `pca:agrupado:${g.termos.join("-").slice(0, 60)}`,
      objeto: g.processos[0]?.objeto ?? g.termos.join(" "),
      origem: "dispensas_agrupadas" as const,
      valorReferencia: g.total,
      fundamentoDoValor: `Soma das ${g.processos.length} dispensas do mesmo ramo no exercício anterior.`,
      precisaEstarPronta: null,
      comecarAte: null,
      justificativa:
        `Este objeto foi comprado em ${g.processos.length} dispensas separadas que somaram ` +
        `${moeda(g.total)} — acima do limite de dispensa por valor. Planejado como uma contratação ` +
        `única em ${anoPlano}, deixa de depender de compras avulsas ao longo do ano.`,
      peso: Number.MAX_SAFE_INTEGER - 1_000_000 - g.total,
    }));
}

// ── O PLANO ──

export type Plano = {
  ano: number;
  itens: ItemPca[];
  /** Soma dos valores de referência conhecidos. */
  totalReferencia: number;
  /** Quantos itens entraram sem valor — o plano não finge saber. */
  semValor: number;
};

export function montarPlano(
  anoPlano: number,
  contratos: ContratoParaPca[],
  processos: ProcessoParaPca[],
  grupos: GrupoParaPca[]
): Plano {
  const deContratos = itensDeContratosVencendo(contratos, anoPlano);

  // Um objeto já coberto por contrato vencendo não volta como "recorrente":
  // seria a mesma necessidade listada duas vezes, e um plano que se repete é
  // um plano que o gestor para de ler.
  const termosJaCobertos = deContratos.map((i) => termosDoObjeto(i.objeto));
  const recorrentes = itensDeComprasRecorrentes(processos, anoPlano).filter((i) => {
    const t = termosDoObjeto(i.objeto);
    return !termosJaCobertos.some((c) => semelhanca(c, t) >= 0.5);
  });

  const itens = [...deContratos, ...recorrentes, ...itensDeDispensasAgrupadas(grupos, anoPlano)].sort(
    (a, b) => a.peso - b.peso
  );

  return {
    ano: anoPlano,
    itens,
    totalReferencia: itens.reduce((s, i) => s + (i.valorReferencia ?? 0), 0),
    semValor: itens.filter((i) => i.valorReferencia === null).length,
  };
}

// ── EXPORTAÇÃO ──

/**
 * Célula de CSV.
 *
 * ── POR QUE A QUEBRA DE LINHA SOME ──
 *
 * Os objetos do PNCP são texto livre e longo — um deles, nos dados reais, tem
 * 700 caracteres descrevendo um veículo item por item — e vêm com quebras de
 * linha dentro. Campo entre aspas com "\n" é CSV válido, mas nem todo leitor
 * trata igual, e uma planilha de plano com célula de várias linhas é ilegível
 * para quem vai conferir item a item.
 *
 * Então a quebra vira espaço. Aspas continuam sendo dobradas, que é o
 * escape do formato.
 */
const aspas = (v: string) => `"${v.replace(/\s*[\r\n]+\s*/g, " ").replace(/"/g, '""')}"`;

const ROTULO_ORIGEM: Record<OrigemItemPca, string> = {
  contrato_vencendo: "Contrato vencendo",
  compra_recorrente: "Compra que se repete",
  dispensas_agrupadas: "Dispensas a agrupar",
};

/**
 * CSV para o gestor levar ao setor de compras e à contabilidade.
 *
 * Sai com a origem de cada linha de propósito: um plano em que o gestor não
 * sabe de onde saiu cada item é um plano que ele assina sem ler — e é ele quem
 * responde por ele, não o software.
 */
export function planoParaCsv(plano: Plano): string {
  const cabecalho = [
    "Objeto",
    "Origem",
    "Valor de referência (R$)",
    "Fundamento do valor",
    "Precisa estar pronta em",
    "Começar até",
    "Justificativa",
  ];
  const linhas = plano.itens.map((i) =>
    [
      aspas(i.objeto),
      aspas(ROTULO_ORIGEM[i.origem]),
      i.valorReferencia === null ? '""' : String(i.valorReferencia.toFixed(2)).replace(".", ","),
      aspas(i.fundamentoDoValor),
      aspas(i.precisaEstarPronta ?? ""),
      aspas(i.comecarAte ?? ""),
      aspas(i.justificativa),
    ].join(";")
  );
  return [cabecalho.map(aspas).join(";"), ...linhas].join("\r\n");
}
