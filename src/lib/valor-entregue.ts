import { areaDoAlerta, type Area } from "@/lib/alerta-por-area";
import { avaliarPrazo } from "@/lib/prazo-atendimento";
import { dataDoBanco } from "@/lib/data-do-banco";
import type { StatusAtendimento, TipoAtendimento } from "@/lib/atendimento";

// ── O QUE O CIDADEIA FEZ ──
//
// Na renovação, o prefeito pergunta uma coisa só: "o que eu ganhei com isso?".
// Sem resposta pronta, a assinatura vira uma linha no orçamento que alguém
// corta. Esta é a resposta, montada só com o que aconteceu de fato no
// sistema, sem estimativa e sem "economia potencial":
//
//   - problemas que a vigia apontou e que deixaram de existir depois do aviso
//     (a obra voltou a ter medição, o contrato foi prorrogado, o remédio foi
//     reposto), e em quantos dias;
//   - relatórios do Tesouro avisados antes do prazo e entregues;
//   - manifestações do cidadão respondidas dentro do prazo legal;
//   - o que entrou sozinho dos portais públicos, sem ninguém digitar.
//
// A frase é sempre "apontado e resolvido", nunca "o CidadeIA resolveu": quem
// resolve é a equipe da prefeitura, e é ela que o prefeito precisa ver
// trabalhando. O sistema avisa a tempo.
//
// Parte pura. A leitura do banco está em valor-entregue-servidor.ts.

export type Resolucao = {
  titulo: string;
  secretaria: string | null;
  prioridade: "urgente" | "medio" | "info" | null;
  /** Quando o alerta abriu, se a linha do tempo guardou. */
  desde: string | null;
  /** Quando o problema deixou de existir. */
  em: string;
  /** Alerta da vigia fiscal (Tesouro), e não dos módulos. */
  fiscal: boolean;
};

export type Manifestacao = {
  tipo: TipoAtendimento;
  status: StatusAtendimento;
  abertoEm: string;
  respondidoEm: string | null;
  prorrogado: boolean;
};

export type Importados = {
  contratos: number;
  processos: number;
  unidades: number;
  obras: number;
  periodosFiscais: number;
};

export type Valor = {
  resolvidos: number;
  urgentesResolvidos: number;
  mediaDias: number | null;
  porArea: { area: string; n: number }[];
  fiscais: { avisadosEntregues: number; atrasosRegularizados: number };
  ouvidoria: { recebidas: number; respondidas: number; noPrazo: number; percentualNoPrazo: number | null };
  importados: Importados & { total: number };
  recentes: (Resolucao & { dias: number | null; area: string })[];
  vazio: boolean;
};

const NOME_AREA: Record<Area, string> = { saude: "Saúde", educacao: "Educação", obras: "Obras", licitacoes: "Licitações" };
const nomeArea = (s: string | null, fiscal = false) => {
  const a = areaDoAlerta(s);
  return a ? NOME_AREA[a] : fiscal ? "Tesouro" : "Gabinete";
};

/** Dias inteiros entre duas datas do banco (ou ISO). */
export function diasEntreDatas(de: string, ate: string): number | null {
  const a = dataDoBanco(de);
  const b = dataDoBanco(ate);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

export function montarValor(entrada: {
  resolucoes: Resolucao[];
  manifestacoes: Manifestacao[];
  importados: Importados;
  hoje?: Date;
}): Valor {
  const hoje = entrada.hoje ?? new Date();
  const dosModulos = entrada.resolucoes.filter((r) => !r.fiscal);
  const fiscais = entrada.resolucoes.filter((r) => r.fiscal);

  const comDias = entrada.resolucoes.map((r) => ({
    ...r,
    dias: r.desde ? diasEntreDatas(r.desde, r.em) : null,
    area: nomeArea(r.secretaria, r.fiscal),
  }));
  const medidos = comDias.filter((r) => r.dias !== null).map((r) => r.dias!);
  const mediaDias = medidos.length ? Math.round((medidos.reduce((a, b) => a + b, 0) / medidos.length) * 10) / 10 : null;

  const contagem = new Map<string, number>();
  for (const r of comDias) contagem.set(r.area, (contagem.get(r.area) ?? 0) + 1);

  const respondidas = entrada.manifestacoes
    .map((m) => avaliarPrazo({ tipo: m.tipo, status: m.status, abertoEm: m.abertoEm, respondidoEm: m.respondidoEm, prorrogado: m.prorrogado }, hoje))
    .filter((a) => a.situacao === "respondido");
  const noPrazo = respondidas.filter((a) => a.diasRestantes >= 0).length;

  const imp = entrada.importados;
  const totalImportados = imp.contratos + imp.processos + imp.unidades + imp.obras + imp.periodosFiscais;

  return {
    resolvidos: entrada.resolucoes.length,
    urgentesResolvidos: entrada.resolucoes.filter((r) => r.prioridade === "urgente").length,
    mediaDias,
    porArea: [...contagem].map(([area, n]) => ({ area, n })).sort((a, b) => b.n - a.n),
    fiscais: {
      // O alerta "vence em N dias" que fechou: a entrega apareceu antes do prazo.
      avisadosEntregues: fiscais.filter((r) => / vence /.test(` ${r.titulo} `)).length,
      // O "não consta entregue" que fechou: o atraso foi regularizado.
      atrasosRegularizados: fiscais.filter((r) => /não consta entregue/.test(r.titulo)).length,
    },
    ouvidoria: {
      recebidas: entrada.manifestacoes.length,
      respondidas: respondidas.length,
      noPrazo,
      percentualNoPrazo: respondidas.length ? Math.round((noPrazo / respondidas.length) * 100) : null,
    },
    importados: { ...imp, total: totalImportados },
    recentes: comDias.sort((a, b) => b.em.localeCompare(a.em)).slice(0, 25),
    vazio: dosModulos.length + fiscais.length === 0 && entrada.manifestacoes.length === 0 && totalImportados === 0,
  };
}

export const plural = (n: number, um: string, muitos: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : muitos}`;

/** As frases de destaque, na ordem em que o prefeito lê. Usadas na tela, no PDF e no e-mail. */
export function frasesDoValor(v: Valor): string[] {
  const f: string[] = [];
  if (v.resolvidos) {
    f.push(
      `${plural(v.resolvidos, "problema apontado pelo CidadeIA foi resolvido", "problemas apontados pelo CidadeIA foram resolvidos")} pela equipe` +
        (v.urgentesResolvidos ? `, ${plural(v.urgentesResolvidos, "deles urgente", "deles urgentes")}` : "") +
        (v.mediaDias === null
          ? "."
          : v.mediaDias < 1
            ? ", em média no mesmo dia do aviso."
            : `, em ${v.mediaDias.toLocaleString("pt-BR")} dias em média depois do aviso.`)
    );
  }
  if (v.fiscais.avisadosEntregues) {
    f.push(`${plural(v.fiscais.avisadosEntregues, "relatório do Tesouro foi avisado", "relatórios do Tesouro foram avisados")} antes do prazo e ${v.fiscais.avisadosEntregues === 1 ? "entregue" : "entregues"}.`);
  }
  if (v.fiscais.atrasosRegularizados) {
    f.push(`${plural(v.fiscais.atrasosRegularizados, "atraso no Tesouro foi regularizado", "atrasos no Tesouro foram regularizados")} depois do alerta, o que tira o município do impedimento de receber transferências voluntárias.`);
  }
  if (v.ouvidoria.respondidas) {
    f.push(
      `${plural(v.ouvidoria.respondidas, "manifestação do cidadão respondida", "manifestações do cidadão respondidas")}` +
        (v.ouvidoria.percentualNoPrazo !== null ? `, ${v.ouvidoria.percentualNoPrazo}% dentro do prazo legal.` : ".")
    );
  }
  if (v.importados.total) {
    f.push(`${plural(v.importados.total, "registro entrou sozinho", "registros entraram sozinhos")} dos portais públicos (Tesouro, CNES e PNCP), sem ninguém digitar.`);
  }
  return f;
}
