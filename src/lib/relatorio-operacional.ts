
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { unidadesSaude, ocorrenciasSaude, estoqueSaude } from "@/db/schema";
import { NOME_TIPO_UNIDADE } from "@/lib/cnes";
import { lerUnidade } from "@/lib/leitura-unidade";
import { montarPedidoReposicao } from "@/lib/estoque-saude";
import { lerEscola } from "@/lib/leitura-escola";
import { DIAS_LETIVOS_LDB } from "@/lib/ocorrencias-escola";
import { montarPedidoMerenda } from "@/lib/merenda";
import { apurarPnae, PERCENTUAL_MINIMO_AF } from "@/lib/pnae";
import { lerCaso, emAndamento, DIAS_PARA_CONSELHO, FREQUENCIA_MINIMA_LDB } from "@/lib/busca-ativa";
import { apurarFundebPorAluno } from "@/lib/resultado-educacao";
import { lerRedeEducacao, aQueMaisPrecisa } from "@/lib/rede-educacao";
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

export async function dadosOperacionaisEducacao(
  prefeituraId: string,
  quem: { cargo: string; secretaria?: string | null }
): Promise<DadosOperacionais> {
  // ── A LEITURA DA REDE MORA EM UM LUGAR SÓ ──
  // Esta função repetia, palavra por palavra, a busca das sete tabelas, os
  // quatro mapas por escola e a chamada de lerEscola() que a tela e o
  // contexto da IA também faziam. Três cópias da mesma leitura foi o que
  // permitiu, duas vezes no mesmo módulo, corrigir uma e esquecer as
  // outras. Ver lib/rede-educacao.ts.
  const rede = await lerRedeEducacao(prefeituraId, quem);
  if (!rede) return { cartoes: [], linhas: [], observacao: undefined };

  const { ativas, lidas: leituras, merenda, compras, repasse, casos, fundeb } = rede;

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

  const linhas: LinhaLista[] = leituras.map(({ escola, leitura, calendario }) => ({
    colunas: [
      escola.nome,
      `${escola.matriculasAtuais ?? TRACO} / ${escola.matriculasCenso ?? TRACO}`,
      calendario.perdidos > 0 ? `${calendario.perdidos}` : TRACO,
      leitura.achados.length > 0 ? curto(`${ROTULO_SITUACAO[leitura.situacao]} — ${leitura.achados[0]!.titulo}`, 64) : ROTULO_SITUACAO[leitura.situacao],
    ],
  }));

  // ── a observação junta o que o prefeito precisa ler em voz alta ──
  const partes: string[] = [];
  const primeira = aQueMaisPrecisa(rede);
  if (primeira) partes.push(`A escola que mais precisa de decisão agora é ${primeira.escola.nome}. ${primeira.leitura.resumo}`);

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
    const nomeDe = new Map(rede.todas.map((e) => [e.id, e.nome]));
    const pedido = montarPedidoMerenda(merenda.map((l) => ({ ...l, escolaNome: nomeDe.get(l.escolaId) ?? "Escola" })));
    const acabou = pedido.filter((i) => i.situacao === "falta");
    if (acabou.length > 0) {
      partes.push(`Merenda: ${acabou.length} item(ns) com saldo zero — ${acabou.slice(0, 3).map((i) => `${i.item} na ${i.escolaNome}`).join("; ")}.`);
    }
  }

  if (pnae.situacao === "abaixo" || pnae.situacao === "perto") {
    // A frase de apurarPnae JÁ traz o valor que falta nestes dois estados.
    // Acrescentar de novo imprimia "Faltam R$ 26.000,00 para os 30% (...).
    // Faltam R$ 26.000,00 em compra da agricultura familiar." no PDF que
    // circula por e-mail e chega à câmara.
    partes.push(pnae.frase);
  }

  const observacao = partes.length > 0 ? partes.join(" ") : ativas.length > 0 ? "Nenhuma escola da rede tem pendência registrada no momento desta geração." : undefined;

  return { cartoes, linhas, observacao };
}
