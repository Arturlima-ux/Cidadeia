import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import {
  unidadesSaude,
  ocorrenciasSaude,
  estoqueSaude,
  apsResultados,
  escolas,
  ocorrenciasEscola,
  estoqueMerenda,
  pnaeCompras,
  pnaeRepasses,
  buscaAtiva,
  educacaoResultados,
  fundebEducacao,
} from "@/db/schema";
import { lerUnidade } from "@/lib/leitura-unidade";
import { montarPedidoReposicao } from "@/lib/estoque-saude";
import { montarDesempenho, resumoDesempenho, quadrimestreDe } from "@/lib/aps";
import { lerEscola } from "@/lib/leitura-escola";
import { aulasPerdidas, lerCalendario, DIAS_LETIVOS_LDB } from "@/lib/ocorrencias-escola";
import { montarPedidoMerenda } from "@/lib/merenda";
import { apurarPnae, PERCENTUAL_MINIMO_AF } from "@/lib/pnae";
import { lerCaso, emAndamento, DIAS_PARA_CONSELHO, FREQUENCIA_MINIMA_LDB } from "@/lib/busca-ativa";
import { apurarFundebPorAluno, indicadorPorChave, rotuloEtapa } from "@/lib/resultado-educacao";

// ── O QUE A IA PRECISA SABER, E NÃO SABIA ──
//
// O contexto que o modelo lia trazia só os cadastros: nome das unidades,
// nome das escolas e o último indicador digitado. Ele respondia sobre o
// município sem saber que a insulina tinha acabado na UBS Alto da Serra,
// que três alunos estavam em busca ativa ou que uma escola já estava
// abaixo dos 200 dias letivos — justo o que o produto passou dois dias
// construindo, e justo o que um prefeito testa primeiro.
//
// ── POR QUE ISTO USA AS MESMAS FUNÇÕES DA TELA ──
// Nada aqui recalcula nada: lerUnidade, lerEscola, apurarPnae, lerCaso e
// as outras são as MESMAS que desenham o painel. Se a tela diz "faltam
// R$ 26.000 para os 30%", é essa a frase que a IA lê. Uma segunda conta,
// paralela, acabaria divergindo da primeira — e aí o modelo contradiz a
// tela na frente do cliente.
//
// ── COMPACTO DE PROPÓSITO ──
// Isto entra num prompt. Cada bloco resume, corta o que está em ordem e só
// nomeia o que precisa de alguém. Rede inteira em dia vira uma linha.

/** Quantas unidades/escolas nomear antes de resumir o resto por contagem. */
const LIMITE_NOMES = 6;

function lista(itens: string[], limite = LIMITE_NOMES): string {
  if (itens.length === 0) return "";
  if (itens.length <= limite) return itens.join("; ");
  return `${itens.slice(0, limite).join("; ")} e mais ${itens.length - limite}`;
}

function moeda(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const inicioDoAno = () => `${new Date().getUTCFullYear()}-01-01`;

/**
 * O que está acontecendo na rede de saúde hoje: ocorrências abertas,
 * estoque acabando, cadastro parado no CNES e o componente de qualidade
 * da APS. Volta string vazia quando não há nada registrado — é diferente
 * de "está tudo bem", e o chamador decide como dizer isso.
 */
export async function resumoOperacionalSaude(prefeituraId: string): Promise<string> {
  let unidades: (typeof unidadesSaude.$inferSelect)[] = [];
  let abertas: (typeof ocorrenciasSaude.$inferSelect)[] = [];
  let estoque: (typeof estoqueSaude.$inferSelect)[] = [];
  let aps: (typeof apsResultados.$inferSelect)[] = [];
  try {
    const q = quadrimestreDe(new Date());
    [unidades, abertas, estoque, aps] = await Promise.all([
      db.select().from(unidadesSaude).where(eq(unidadesSaude.prefeituraId, prefeituraId)),
      db
        .select()
        .from(ocorrenciasSaude)
        .where(and(eq(ocorrenciasSaude.prefeituraId, prefeituraId), eq(ocorrenciasSaude.status, "aberta"))),
      db.select().from(estoqueSaude).where(eq(estoqueSaude.prefeituraId, prefeituraId)),
      db
        .select()
        .from(apsResultados)
        .where(and(eq(apsResultados.prefeituraId, prefeituraId), eq(apsResultados.ano, q.ano), eq(apsResultados.quadrimestre, q.numero))),
    ]);
  } catch (e) {
    // Tabela ausente (banco sem a migration) não pode derrubar a resposta
    // da IA: sem este bloco ela ainda responde, só com menos contexto.
    console.error("[contexto-operacional] saúde:", e);
    return "";
  }

  if (unidades.length === 0) return "";

  const abertasPor = new Map<string, typeof abertas>();
  for (const o of abertas) abertasPor.set(o.unidadeId, [...(abertasPor.get(o.unidadeId) ?? []), o]);
  const estoquePor = new Map<string, typeof estoque>();
  for (const l of estoque) estoquePor.set(l.unidadeId, [...(estoquePor.get(l.unidadeId) ?? []), l]);

  const leituras = unidades
    .filter((u) => u.ativo)
    .map((u) => ({
      u,
      leitura: lerUnidade({
        unidade: { nome: u.nome, ativo: u.ativo, cnesAtualizadoEm: u.cnesAtualizadoEm, origem: u.origem, turno: u.turno, atendeSus: u.atendeSus },
        ocorrenciasAbertas: abertasPor.get(u.id) ?? [],
        estoque: estoquePor.get(u.id) ?? [],
        mencoesOuvidoria: [],
      }),
    }))
    .sort((a, b) => b.leitura.peso - a.leitura.peso);

  const urgentes = leituras.filter((x) => x.leitura.situacao === "urgente");
  const atencao = leituras.filter((x) => x.leitura.situacao === "atencao");

  const nomeDe = new Map(unidades.map((u) => [u.id, u.nome]));
  const pedido = montarPedidoReposicao(estoque.map((l) => ({ ...l, unidadeNome: nomeDe.get(l.unidadeId) ?? "Unidade" })));
  const semNada = pedido.filter((i) => i.situacao === "falta");

  const linhas: string[] = [];
  linhas.push(
    `Rede: ${unidades.filter((u) => u.ativo).length} unidade(s) ativa(s), ${unidades.filter((u) => u.origem === "cnes").length} vinda(s) do CNES.`
  );

  if (urgentes.length === 0 && atencao.length === 0) {
    linhas.push("Nenhuma unidade com pendência registrada.");
  } else {
    if (urgentes.length > 0) {
      linhas.push(
        `Unidades em situação URGENTE (${urgentes.length}): ${lista(urgentes.map((x) => `${x.u.nome} — ${x.leitura.achados[0]?.titulo ?? "pendência"}`))}.`
      );
    }
    if (atencao.length > 0) {
      linhas.push(`Unidades em atenção (${atencao.length}): ${lista(atencao.map((x) => x.u.nome))}.`);
    }
    const primeira = leituras.find((x) => x.leitura.achados.length > 0);
    if (primeira) linhas.push(`A que mais precisa de decisão agora: ${primeira.u.nome} — ${primeira.leitura.resumo}`);
  }

  if (estoque.length > 0) {
    linhas.push(
      pedido.length === 0
        ? "Estoque: nenhum item abaixo de 15 dias de cobertura."
        : `Estoque: ${pedido.length} item(ns) para repor${semNada.length > 0 ? `, ${semNada.length} EM FALTA (saldo zero): ${lista(semNada.map((i) => `${i.item} na ${i.unidadeNome}`), 4)}` : ""}.`
    );
  }

  if (aps.length > 0) {
    const q = quadrimestreDe(new Date());
    const desempenho = montarDesempenho(aps, []);
    linhas.push(`Qualidade da APS: ${resumoDesempenho(desempenho, q)}`);
    const abaixo = desempenho.filter((d) => d.situacao === "abaixo");
    if (abaixo.length > 0) {
      linhas.push(`Indicadores da APS abaixo da meta: ${lista(abaixo.map((d) => `${d.indicador.nome} (${d.resultado}%, meta ${d.meta}%)`), 4)}.`);
    }
  }

  return `\nO QUE ESTÁ ACONTECENDO NA REDE DE SAÚDE (registrado pelas próprias unidades):\n${linhas.map((l) => `- ${l}`).join("\n")}`;
}

/**
 * O que está acontecendo na rede de escolas: ocorrências, dias letivos
 * perdidos contra os 200 da LDB, merenda, os 30% do PNAE, busca ativa e
 * a matrícula declarada contra a real — em reais quando o município
 * informou o valor aluno/ano.
 */
export async function resumoOperacionalEducacao(prefeituraId: string): Promise<string> {
  const ano = new Date().getUTCFullYear();
  let rede: (typeof escolas.$inferSelect)[] = [];
  let ocorrencias: (typeof ocorrenciasEscola.$inferSelect)[] = [];
  let merenda: (typeof estoqueMerenda.$inferSelect)[] = [];
  let compras: (typeof pnaeCompras.$inferSelect)[] = [];
  let repasse: (typeof pnaeRepasses.$inferSelect) | undefined;
  let casos: (typeof buscaAtiva.$inferSelect)[] = [];
  let resultados: (typeof educacaoResultados.$inferSelect)[] = [];
  let fundeb: (typeof fundebEducacao.$inferSelect) | undefined;
  try {
    const [r, o, m, c, rp, b, res, fd] = await Promise.all([
      db.select().from(escolas).where(eq(escolas.prefeituraId, prefeituraId)),
      db.select().from(ocorrenciasEscola).where(and(eq(ocorrenciasEscola.prefeituraId, prefeituraId), gte(ocorrenciasEscola.createdAt, inicioDoAno()))),
      db.select().from(estoqueMerenda).where(eq(estoqueMerenda.prefeituraId, prefeituraId)),
      db.select().from(pnaeCompras).where(and(eq(pnaeCompras.prefeituraId, prefeituraId), eq(pnaeCompras.ano, ano))),
      db.select().from(pnaeRepasses).where(and(eq(pnaeRepasses.prefeituraId, prefeituraId), eq(pnaeRepasses.ano, ano))).limit(1),
      db.select().from(buscaAtiva).where(eq(buscaAtiva.prefeituraId, prefeituraId)),
      db.select().from(educacaoResultados).where(and(eq(educacaoResultados.prefeituraId, prefeituraId), eq(educacaoResultados.ano, ano))),
      db.select().from(fundebEducacao).where(and(eq(fundebEducacao.prefeituraId, prefeituraId), eq(fundebEducacao.ano, ano))).limit(1),
    ]);
    rede = r;
    ocorrencias = o;
    merenda = m;
    compras = c;
    repasse = rp[0];
    casos = b;
    resultados = res;
    fundeb = fd[0];
  } catch (e) {
    console.error("[contexto-operacional] educação:", e);
    return "";
  }

  if (rede.length === 0) return "";

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
    .sort((a, b) => b.leitura.peso - a.leitura.peso);

  const urgentes = leituras.filter((x) => x.leitura.situacao === "urgente");
  const atencao = leituras.filter((x) => x.leitura.situacao === "atencao");

  const linhas: string[] = [];
  linhas.push(`Rede: ${ativas.length} escola(s), ${rede.filter((e) => e.origem === "censo").length} vinda(s) do Censo Escolar.`);

  if (urgentes.length === 0 && atencao.length === 0) {
    linhas.push("Nenhuma escola com pendência registrada.");
  } else {
    if (urgentes.length > 0) {
      linhas.push(
        `Escolas em situação URGENTE (${urgentes.length}): ${lista(urgentes.map((x) => `${x.e.nome} — ${x.leitura.achados[0]?.titulo ?? "pendência"}`))}.`
      );
    }
    if (atencao.length > 0) linhas.push(`Escolas em atenção (${atencao.length}): ${lista(atencao.map((x) => x.e.nome))}.`);
    const primeira = leituras.find((x) => x.leitura.achados.length > 0);
    if (primeira) linhas.push(`A que mais precisa de decisão agora: ${primeira.e.nome} — ${primeira.leitura.resumo}`);
  }

  // ── calendário letivo: obrigação da LDB ──
  const calendarios = ativas.map((e) => ({
    e,
    c: lerCalendario(aulasPerdidas(doAnoPor.get(e.id) ?? []), e.diasPrevistos ?? DIAS_LETIVOS_LDB),
  }));
  const estouradas = calendarios.filter((x) => x.c.situacao === "estourado");
  const perdidos = calendarios.reduce((s, x) => s + x.c.perdidos, 0);
  linhas.push(
    estouradas.length > 0
      ? `Calendário letivo: ${estouradas.length} escola(s) já abaixo dos ${DIAS_LETIVOS_LDB} dias letivos que a LDB (art. 24) exige — ${lista(estouradas.map((x) => `${x.e.nome} (repor ${-x.c.folga} dia(s))`), 4)}. Reposição não cabe em dezembro.`
      : `Calendário letivo: ${perdidos} dia(s) de aula perdidos no ano em toda a rede, todos dentro da folga dos ${DIAS_LETIVOS_LDB} dias.`
  );

  // ── merenda e os 30% ──
  if (merenda.length > 0) {
    const nomeDe = new Map(rede.map((e) => [e.id, e.nome]));
    const pedido = montarPedidoMerenda(merenda.map((l) => ({ ...l, escolaNome: nomeDe.get(l.escolaId) ?? "Escola" })));
    const acabou = pedido.filter((i) => i.situacao === "falta");
    linhas.push(
      pedido.length === 0
        ? "Merenda: nenhum item abaixo de 10 dias de aula de cobertura."
        : `Merenda: ${pedido.length} item(ns) para repor${acabou.length > 0 ? `, ${acabou.length} ACABOU: ${lista(acabou.map((i) => `${i.item} na ${i.escolaNome}`), 4)}` : ""}.`
    );
  }
  const pnae = apurarPnae(compras, repasse?.valor ?? 0);
  if (compras.length > 0 || repasse) {
    linhas.push(`PNAE / agricultura familiar (Lei 11.947/2009, art. 14, mínimo de ${PERCENTUAL_MINIMO_AF}%): ${pnae.frase}`);
  }

  // ── busca ativa ──
  const correndo = casos.filter((c) => emAndamento(c.situacao));
  if (casos.length > 0) {
    const semConselho = correndo.filter((c) => {
      const l = lerCaso(c);
      return c.conselhoTutelarEm === null && l.diasFora !== null && l.diasFora >= DIAS_PARA_CONSELHO;
    });
    const reprovando = correndo.filter((c) => lerCaso(c).situacaoFrequencia === "reprovacao");
    linhas.push(
      `Busca ativa: ${correndo.length} aluno(s) fora da sala${reprovando.length > 0 ? `, ${reprovando.length} já abaixo dos ${FREQUENCIA_MINIMA_LDB}% de frequência da LDB` : ""}.`
    );
    if (semConselho.length > 0) {
      linhas.push(
        `ATENÇÃO LEGAL: ${semConselho.length} aluno(s) há mais de ${DIAS_PARA_CONSELHO} dias fora sem comunicação ao Conselho Tutelar. O ECA (art. 56, II) obriga essa comunicação, e a omissão é do município.`
      );
    }
  }

  // ── matrícula em reais ──
  const apuracao = apurarFundebPorAluno(ativas, fundeb?.valorAlunoAno ?? null);
  if (apuracao.comparaveis > 0) {
    linhas.push(`FUNDEB / matrícula: ${apuracao.frase}`);
  }

  // ── resultado ──
  if (resultados.length > 0) {
    const abaixo = resultados.filter((r) => {
      const ind = indicadorPorChave(r.indicador);
      if (!ind || r.meta === null) return false;
      return ind.sentido === "maior" ? r.valor < r.meta : r.valor > r.meta;
    });
    if (abaixo.length > 0) {
      linhas.push(
        `Resultado ${ano} abaixo da meta: ${lista(
          abaixo.map((r) => `${indicadorPorChave(r.indicador)?.nome ?? r.indicador} ${rotuloEtapa(r.etapa)} = ${r.valor} (meta ${r.meta})`),
          4
        )}.`
      );
    }
  }
  if (apuracao.reaisForaDaConta !== null && apuracao.alunosForaDaConta > 0) {
    linhas.push(`Valor em jogo no FUNDEB: ${moeda(apuracao.reaisForaDaConta)} por ano.`);
  }

  return `\nO QUE ESTÁ ACONTECENDO NA REDE DE ESCOLAS (registrado pelas próprias escolas):\n${linhas.map((l) => `- ${l}`).join("\n")}`;
}
