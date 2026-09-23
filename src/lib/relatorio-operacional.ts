import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import {
  unidadesSaude,
  ocorrenciasSaude,
  estoqueSaude,
  escolas,
  ocorrenciasEscola,
  estoqueMerenda,
  pnaeCompras,
  pnaeRepasses,
  buscaAtiva,
  fundebEducacao,
} from "@/db/schema";
import { NOME_TIPO_UNIDADE } from "@/lib/cnes";
import { lerUnidade } from "@/lib/leitura-unidade";
import { montarPedidoReposicao } from "@/lib/estoque-saude";
import { lerEscola } from "@/lib/leitura-escola";
import { aulasPerdidas, lerCalendario, DIAS_LETIVOS_LDB } from "@/lib/ocorrencias-escola";
import { montarPedidoMerenda } from "@/lib/merenda";
import { apurarPnae, PERCENTUAL_MINIMO_AF } from "@/lib/pnae";
import { lerCaso, emAndamento, DIAS_PARA_CONSELHO, FREQUENCIA_MINIMA_LDB } from "@/lib/busca-ativa";
import { apurarFundebPorAluno } from "@/lib/resultado-educacao";
import type { CardIndicador, LinhaLista } from "@/lib/relatorios/RelatorioSecretaria";

// ── O RELATÓRIO EM PDF CONTA A MESMA HISTÓRIA DA TELA ──
//
// O PDF da Saúde imprimia tempo médio de atendimento, médicos ativos e
// percentual de estoque; o da Educação, frequência, nota média e evasão.
// Todos de antes das fases que este produto passou dois dias construindo.
//
// Quem baixava o relatório recebia um documento que dizia MENOS do que o
// painel mostra — e é esse arquivo que circula por e-mail e chega à
// câmara. Um PDF que contradiz a tela é pior do que PDF nenhum.
//
// Como o contexto da IA (src/lib/contexto-operacional.ts), isto não
// recalcula nada: usa lerUnidade, lerEscola, apurarPnae e as outras, que
// são as mesmas funções que desenham a tela. Uma conta paralela acabaria
// divergindo, e o PDF é justamente onde a divergência não tem conserto.

export type DadosOperacionais = {
  cartoes: CardIndicador[];
  linhas: LinhaLista[];
  observacao: string | undefined;
};

const ROTULO_SITUACAO = { urgente: "Urgente", atencao: "Atenção", normal: "Em ordem" } as const;
const TRACO = "—";

function moeda(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const inicioDoAno = () => `${new Date().getUTCFullYear()}-01-01`;

/** Corta a frase para caber na célula sem estourar a coluna do PDF. */
function curto(texto: string, max = 78): string {
  const limpo = texto.trim();
  return limpo.length <= max ? limpo : `${limpo.slice(0, max - 1)}…`;
}

export async function dadosOperacionaisSaude(prefeituraId: string): Promise<DadosOperacionais> {
  let unidades: (typeof unidadesSaude.$inferSelect)[] = [];
  let abertas: (typeof ocorrenciasSaude.$inferSelect)[] = [];
  let estoque: (typeof estoqueSaude.$inferSelect)[] = [];
  try {
    [unidades, abertas, estoque] = await Promise.all([
      db.select().from(unidadesSaude).where(eq(unidadesSaude.prefeituraId, prefeituraId)),
      db
        .select()
        .from(ocorrenciasSaude)
        .where(and(eq(ocorrenciasSaude.prefeituraId, prefeituraId), eq(ocorrenciasSaude.status, "aberta"))),
      db.select().from(estoqueSaude).where(eq(estoqueSaude.prefeituraId, prefeituraId)),
    ]);
  } catch (e) {
    // Banco sem a migration não pode impedir a geração do PDF: o relatório
    // sai com o que houver, em vez de devolver erro a quem clicou.
    console.error("[relatorio-operacional] saúde:", e);
  }

  const abertasPor = new Map<string, typeof abertas>();
  for (const o of abertas) abertasPor.set(o.unidadeId, [...(abertasPor.get(o.unidadeId) ?? []), o]);
  const estoquePor = new Map<string, typeof estoque>();
  for (const l of estoque) estoquePor.set(l.unidadeId, [...(estoquePor.get(l.unidadeId) ?? []), l]);

  const ativas = unidades.filter((u) => u.ativo);
  const leituras = ativas
    .map((u) => ({
      u,
      leitura: lerUnidade({
        unidade: { nome: u.nome, ativo: u.ativo, cnesAtualizadoEm: u.cnesAtualizadoEm, origem: u.origem, turno: u.turno, atendeSus: u.atendeSus },
        ocorrenciasAbertas: abertasPor.get(u.id) ?? [],
        estoque: estoquePor.get(u.id) ?? [],
        mencoesOuvidoria: [],
      }),
    }))
    .sort((a, b) => b.leitura.peso - a.leitura.peso || a.u.nome.localeCompare(b.u.nome, "pt-BR"));

  const comPendencia = leituras.filter((x) => x.leitura.situacao !== "normal").length;
  const nomeDe = new Map(unidades.map((u) => [u.id, u.nome]));
  const pedido = montarPedidoReposicao(estoque.map((l) => ({ ...l, unidadeNome: nomeDe.get(l.unidadeId) ?? "Unidade" })));
  const emFalta = pedido.filter((i) => i.situacao === "falta").length;

  const cartoes: CardIndicador[] = [
    { valor: `${ativas.length}`, label: "Unidades ativas na rede" },
    { valor: `${comPendencia}`, label: "Com pendência aberta" },
    { valor: `${pedido.length}`, label: "Itens para repor" },
    { valor: `${emFalta}`, label: "Itens em falta (saldo zero)" },
  ];

  const linhas: LinhaLista[] = leituras.map(({ u, leitura }) => ({
    colunas: [
      u.nome,
      NOME_TIPO_UNIDADE[u.tipo] ?? u.tipo,
      ROTULO_SITUACAO[leitura.situacao],
      leitura.achados.length > 0 ? curto(leitura.achados[0]!.titulo) : TRACO,
    ],
  }));

  const primeira = leituras.find((x) => x.leitura.achados.length > 0);
  const observacao = primeira
    ? `A unidade que mais precisa de decisão agora é ${primeira.u.nome}. ${primeira.leitura.resumo}`
    : ativas.length > 0
      ? "Nenhuma unidade da rede tem pendência registrada no momento desta geração."
      : undefined;

  return { cartoes, linhas, observacao };
}

export async function dadosOperacionaisEducacao(prefeituraId: string): Promise<DadosOperacionais> {
  const ano = new Date().getUTCFullYear();
  let rede: (typeof escolas.$inferSelect)[] = [];
  let ocorrencias: (typeof ocorrenciasEscola.$inferSelect)[] = [];
  let merenda: (typeof estoqueMerenda.$inferSelect)[] = [];
  let compras: (typeof pnaeCompras.$inferSelect)[] = [];
  let repasse: (typeof pnaeRepasses.$inferSelect) | undefined;
  let casos: (typeof buscaAtiva.$inferSelect)[] = [];
  let fundeb: (typeof fundebEducacao.$inferSelect) | undefined;
  try {
    const [r, o, m, c, rp, b, fd] = await Promise.all([
      db.select().from(escolas).where(eq(escolas.prefeituraId, prefeituraId)),
      db
        .select()
        .from(ocorrenciasEscola)
        .where(and(eq(ocorrenciasEscola.prefeituraId, prefeituraId), gte(ocorrenciasEscola.createdAt, inicioDoAno()))),
      db.select().from(estoqueMerenda).where(eq(estoqueMerenda.prefeituraId, prefeituraId)),
      db.select().from(pnaeCompras).where(and(eq(pnaeCompras.prefeituraId, prefeituraId), eq(pnaeCompras.ano, ano))),
      db.select().from(pnaeRepasses).where(and(eq(pnaeRepasses.prefeituraId, prefeituraId), eq(pnaeRepasses.ano, ano))).limit(1),
      db.select().from(buscaAtiva).where(eq(buscaAtiva.prefeituraId, prefeituraId)),
      db.select().from(fundebEducacao).where(and(eq(fundebEducacao.prefeituraId, prefeituraId), eq(fundebEducacao.ano, ano))).limit(1),
    ]);
    rede = r;
    ocorrencias = o;
    merenda = m;
    compras = c;
    repasse = rp[0];
    casos = b;
    fundeb = fd[0];
  } catch (e) {
    console.error("[relatorio-operacional] educação:", e);
  }

  const ativas = rede.filter((e) => e.situacao !== "extinta");
  const abertas = ocorrencias.filter((o) => o.status === "aberta");
  const abertasPor = new Map<string, typeof abertas>();
  for (const o of abertas) abertasPor.set(o.escolaId, [...(abertasPor.get(o.escolaId) ?? []), o]);
  const doAnoPor = new Map<string, typeof ocorrencias>();
  for (const o of ocorrencias) doAnoPor.set(o.escolaId, [...(doAnoPor.get(o.escolaId) ?? []), o]);
  const merendaPor = new Map<string, typeof merenda>();
  for (const l of merenda) merendaPor.set(l.escolaId, [...(merendaPor.get(l.escolaId) ?? []), l]);
  const casosPor = new Map<string, typeof casos>();
  for (const c of casos) casosPor.set(c.escolaId, [...(casosPor.get(c.escolaId) ?? []), c]);

  const leituras = ativas
    .map((e) => ({
      e,
      calendario: lerCalendario(aulasPerdidas(doAnoPor.get(e.id) ?? []), e.diasPrevistos ?? DIAS_LETIVOS_LDB),
      leitura: lerEscola({
        escola: {
          nome: e.nome,
          situacao: e.situacao,
          dependencia: e.dependencia,
          origem: e.origem,
          censoAno: e.censoAno,
          matriculasCenso: e.matriculasCenso,
          matriculasAtuais: e.matriculasAtuais,
          diasPrevistos: e.diasPrevistos,
        },
        ocorrenciasAbertas: abertasPor.get(e.id) ?? [],
        ocorrenciasDoAno: doAnoPor.get(e.id) ?? [],
        merenda: merendaPor.get(e.id) ?? [],
        buscaAtiva: casosPor.get(e.id) ?? [],
        mencoesOuvidoria: [],
      }),
    }))
    .sort((a, b) => b.leitura.peso - a.leitura.peso || a.e.nome.localeCompare(b.e.nome, "pt-BR"));

  const comPendencia = leituras.filter((x) => x.leitura.situacao !== "normal").length;
  const perdidos = leituras.reduce((s, x) => s + x.calendario.perdidos, 0);
  const correndo = casos.filter((c) => emAndamento(c.situacao));
  const pnae = apurarPnae(compras, repasse?.valor ?? 0);

  const cartoes: CardIndicador[] = [
    { valor: `${ativas.length}`, label: "Escolas na rede" },
    { valor: `${comPendencia}`, label: "Com pendência aberta" },
    { valor: `${perdidos}`, label: `Dias de aula perdidos (mínimo ${DIAS_LETIVOS_LDB})` },
    {
      valor: pnae.percentual === null ? TRACO : `${pnae.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      label: `Agricultura familiar (mínimo ${PERCENTUAL_MINIMO_AF}%)`,
    },
  ];

  const linhas: LinhaLista[] = leituras.map(({ e, leitura, calendario }) => ({
    colunas: [
      e.nome,
      `${e.matriculasAtuais ?? TRACO} / ${e.matriculasCenso ?? TRACO}`,
      calendario.perdidos > 0 ? `${calendario.perdidos}` : TRACO,
      leitura.achados.length > 0 ? curto(`${ROTULO_SITUACAO[leitura.situacao]} — ${leitura.achados[0]!.titulo}`, 64) : ROTULO_SITUACAO[leitura.situacao],
    ],
  }));

  // ── a observação junta o que o prefeito precisa ler em voz alta ──
  const partes: string[] = [];
  const primeira = leituras.find((x) => x.leitura.achados.length > 0);
  if (primeira) partes.push(`A escola que mais precisa de decisão agora é ${primeira.e.nome}. ${primeira.leitura.resumo}`);

  const apuracao = apurarFundebPorAluno(ativas, fundeb?.valorAlunoAno ?? null);
  if (apuracao.comparaveis > 0 && (apuracao.alunosForaDaConta > 0 || apuracao.alunosDeclaradosAMais > 0)) {
    partes.push(apuracao.frase);
  }

  const semConselho = correndo.filter((c) => {
    const l = lerCaso(c);
    return c.conselhoTutelarEm === null && l.diasFora !== null && l.diasFora >= DIAS_PARA_CONSELHO;
  });
  if (semConselho.length > 0) {
    partes.push(
      `${semConselho.length} aluno(s) está(ão) há mais de ${DIAS_PARA_CONSELHO} dias fora da escola sem comunicação ao Conselho Tutelar, exigida pelo art. 56, II, do ECA.`
    );
  } else if (correndo.length > 0) {
    const reprovando = correndo.filter((c) => lerCaso(c).situacaoFrequencia === "reprovacao").length;
    partes.push(
      `${correndo.length} aluno(s) em busca ativa${reprovando > 0 ? `, ${reprovando} já abaixo dos ${FREQUENCIA_MINIMA_LDB}% de frequência exigidos pela LDB` : ""}.`
    );
  }

  if (merenda.length > 0) {
    const nomeDe = new Map(rede.map((e) => [e.id, e.nome]));
    const pedido = montarPedidoMerenda(merenda.map((l) => ({ ...l, escolaNome: nomeDe.get(l.escolaId) ?? "Escola" })));
    const acabou = pedido.filter((i) => i.situacao === "falta");
    if (acabou.length > 0) {
      partes.push(`Merenda: ${acabou.length} item(ns) com saldo zero — ${acabou.slice(0, 3).map((i) => `${i.item} na ${i.escolaNome}`).join("; ")}.`);
    }
  }

  if (pnae.situacao === "abaixo" || pnae.situacao === "perto") {
    partes.push(`${pnae.frase} Faltam ${moeda(pnae.faltaEmReais)} em compra da agricultura familiar.`);
  }

  const observacao = partes.length > 0 ? partes.join(" ") : ativas.length > 0 ? "Nenhuma escola da rede tem pendência registrada no momento desta geração." : undefined;

  return { cartoes, linhas, observacao };
}
