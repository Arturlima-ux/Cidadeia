import { createHash } from "node:crypto";
import { montarEmail, type Item } from "@/lib/email-modelo";
import type { DeteccaoAutomatica } from "@/lib/deteccao-automatica";
import { lerVigencia, type ContratoParaVigencia } from "@/lib/vigencia";
import type { PadraoLicitacao } from "@/lib/padroes-licitacoes";
import { contagemVelha, situacaoDoItem, NOME_CATEGORIA, type CategoriaEstoque } from "@/lib/estoque-saude";
import { lerAditivo, BASE_LEGAL_ALTERACAO } from "@/lib/aditivos";
import { ehObraOuEngenharia } from "@/lib/obra-prazo";
import { DIAS_PARA_CONSELHO, diasSemAparecer, emAndamento, situacaoDaFrequencia } from "@/lib/busca-ativa";

// ── A VIGIA DIÁRIA DOS MÓDULOS ──
//
// Até aqui, as regras do CidadeIA (obra parada, licitação vencendo, mínimo de
// saúde e educação, despesa com pessoal, prazo do cidadão) só rodavam quando
// alguém abria a Central. O risco que ninguém abre é justamente o que estoura.
// Agora uma rotina passa toda manhã por cada prefeitura cliente, roda as mesmas
// regras, e o que achar vira alerta no painel, com e-mail quando é novo ou
// quando piorou.
//
// Além das regras da Central, a vigia olha o que só existia dentro de cada
// tela: contrato vencendo sem tempo de licitar, padrões de licitação
// (fornecedor que sempre ganha, dispensa colada no teto), remédio e vacina em
// falta nas unidades, e aluno fora da escola sem comunicação ao Conselho
// Tutelar.
//
// ── UM FATO, UM ALERTA ──
//
// O id do alerta sai da CHAVE do achado, que descreve o fato sem os números
// do dia ("obra:Creche do Centro:parada"). Amanhã, o mesmo fato atualiza o
// mesmo alerta (com "parada há 32 dias" no lugar de 31), sem e-mail novo. O
// e-mail só sai quando o fato é novo, quando volta depois de resolvido, ou
// quando a prioridade sobe.
//
// ── QUEM RESOLVE ──
//
// Quando o fato some (a obra recebeu medição, o contrato foi prorrogado), o
// alerta se fecha sozinho, e isso fica registrado: é a prova de que o aviso
// serviu ("O que o CidadeIA evitou"). Se o gestor fechou o alerta à mão com o
// fato ainda de pé, a vigia respeita e não reabre; só reabre se o fato sumir
// e voltar depois, porque aí é um episódio novo.
//
// Este arquivo é a parte pura (o que avisar, e as decisões). A rotina, com
// banco e e-mail, está em vigia-dos-modulos-servidor.ts.

export const PREFIXO_REGRA = "regra:";
export const prefixoDaPrefeitura = (prefeituraId: string) => `${PREFIXO_REGRA}${prefeituraId}:`;
/** Linha do tempo do alerta (pedido_eventos, pedidoId = id do alerta). */
export const EVENTO_REGRA_ENCERRADA = "regra_encerrada";

export type Prioridade = DeteccaoAutomatica["prioridade"];
const PESO: Record<Prioridade, number> = { urgente: 2, medio: 1, info: 0 };

/** A identidade do fato. Sem chave declarada, o título sem números. */
export function chaveDoAchado(d: DeteccaoAutomatica): string {
  if (d.chave) return d.chave;
  const semNumeros = d.titulo.replace(/[\d.,%]+/g, "#").replace(/\s+/g, " ").trim().toLowerCase();
  return `${d.categoria}:${d.secretaria ?? "gabinete"}:${semNumeros}`;
}

export function idDoAlerta(prefeituraId: string, chave: string): string {
  const hash = createHash("sha256").update(chave).digest("hex").slice(0, 20);
  return `${prefixoDaPrefeitura(prefeituraId)}${hash}`;
}

// ── os achados que só existiam dentro das telas ──

/** Contrato que vence sem tempo de licitar (urgente) ou com o prazo apertado. Vencido é crônico e fica na tela. */
export function achadosDosContratos(
  lista: (ContratoParaVigencia & { id: string; numeroContrato: string | null })[],
  hoje: Date = new Date()
): DeteccaoAutomatica[] {
  const achados: (DeteccaoAutomatica & { peso: number })[] = [];
  for (const c of lista) {
    const v = lerVigencia(c, hoje);
    if (v.situacao !== "sem_tempo_de_licitar" && v.situacao !== "apertado") continue;
    const nome = c.numeroContrato ? `Contrato ${c.numeroContrato}` : "Contrato";
    const objeto = c.objeto.length > 80 ? `${c.objeto.slice(0, 77)}…` : c.objeto;
    achados.push({
      categoria: "prazo",
      prioridade: v.situacao === "sem_tempo_de_licitar" ? "urgente" : "medio",
      secretaria: "licitacoes",
      titulo:
        v.situacao === "sem_tempo_de_licitar"
          ? `${nome} vence sem tempo para nova licitação`
          : `${nome} vence com prazo apertado para licitar`,
      descricao: `${objeto}${c.fornecedorNome ? ` (${c.fornecedorNome})` : ""}. ${v.texto} ${v.acao}`,
      // A data de fim entra na chave: prorrogado, é outro contrato no calendário.
      chave: `contrato:${c.id}:${(c.vigenciaFim ?? "").slice(0, 10)}`,
      peso: v.peso,
    });
  }
  // Numa prefeitura com dezenas de contratos vencendo juntos, os oito mais
  // urgentes bastam para o alerta; a lista inteira está na tela.
  return achados
    .sort((a, b) => a.peso - b.peso)
    .slice(0, 8)
    .map((d) => {
      const { peso, ...resto } = d;
      void peso;
      return resto;
    });
}

/**
 * O contrato que cresceu além do limite do art. 125 SE a diferença for
 * acréscimo (lib/aditivos.ts). Só estava na tela de Licitações; agora a vigia
 * avisa. A leitura não acusa: reajuste entra na diferença e não conta.
 */
export function achadosDosAditivos(
  lista: { id: string; numeroContrato: string | null; objeto: string; fornecedorNome: string | null; categoria: string | null; valorInicial: number | null; valorGlobal: number | null; numeroRetificacao: number | null }[]
): DeteccaoAutomatica[] {
  return lista
    .map((c) => ({ c, l: lerAditivo(c) }))
    .filter(({ l }) => l.situacao === "acima_se_for_acrescimo")
    .sort((a, b) => b.l.peso - a.l.peso)
    .slice(0, 8)
    .map(({ c, l }) => {
      const nome = c.numeroContrato ? `Contrato ${c.numeroContrato}` : "Contrato";
      const objeto = c.objeto.length > 80 ? `${c.objeto.slice(0, 77)}…` : c.objeto;
      return {
        categoria: "financeiro" as const,
        prioridade: "medio" as const,
        secretaria: ehObraOuEngenharia(c.categoria) ? "obras" : "licitacoes",
        titulo: `${nome} cresceu além de ${l.limite}% do valor inicial`,
        descricao: `${objeto}${c.fornecedorNome ? ` (${c.fornecedorNome})` : ""}. ${l.texto} ${l.acao} (${BASE_LEGAL_ALTERACAO})`,
        chave: `aditivo:${c.id}:${l.limite}`,
      };
    });
}

export function achadosDosPadroes(padroes: PadraoLicitacao[]): DeteccaoAutomatica[] {
  return padroes.map((p) => ({
    categoria: "financeiro" as const,
    prioridade: "medio" as const,
    secretaria: "licitacoes",
    titulo:
      p.tipo === "fornecedor" ? "Mesmo fornecedor vencendo em série" : "Dispensa colada no limite legal",
    descricao: `${p.texto} ${p.acao}`,
    chave: `padrao:${p.tipo}:${p.chave}`,
  }));
}

/**
 * Remédio, insumo ou vacina em falta (urgente) ou para acabar em dias.
 * Agrupado: dez itens em falta são um problema de abastecimento, não dez
 * alertas. Contagem com mais de 30 dias não acusa nada: o estoque pode já ter
 * sido reposto, e a tela da unidade é quem pede a recontagem.
 */
export function achadosDoEstoque(
  linhas: { item: string; categoria: CategoriaEstoque; saldo: number; consumoMensal: number; atualizadoEm: string; unidadeNome: string }[],
  hoje: Date = new Date()
): DeteccaoAutomatica[] {
  const confiaveis = linhas.filter((l) => l.consumoMensal > 0 && !contagemVelha(l.atualizadoEm, hoje));
  const falta = confiaveis.filter((l) => situacaoDoItem(l.saldo, l.consumoMensal) === "falta");
  const critico = confiaveis.filter((l) => situacaoDoItem(l.saldo, l.consumoMensal) === "critico");

  const resumo = (ls: typeof linhas) => {
    const unidades = new Set(ls.map((l) => l.unidadeNome));
    const exemplos = [...new Set(ls.map((l) => l.item))].slice(0, 4).join(", ");
    const resto = new Set(ls.map((l) => l.item)).size - Math.min(4, new Set(ls.map((l) => l.item)).size);
    return {
      unidades: unidades.size,
      texto: `${exemplos}${resto > 0 ? ` e mais ${resto}` : ""}`,
      vacina: ls.some((l) => l.categoria === "vacina"),
    };
  };

  const achados: DeteccaoAutomatica[] = [];
  if (falta.length) {
    const r = resumo(falta);
    achados.push({
      categoria: "prazo",
      prioridade: "urgente",
      secretaria: "saude",
      titulo: `${falta.length === 1 ? "1 item em falta" : `${falta.length} itens em falta`} em ${r.unidades === 1 ? "1 unidade de saúde" : `${r.unidades} unidades de saúde`}`,
      descricao:
        `Saldo zerado na última contagem: ${r.texto}.` +
        (r.vacina ? ` Há ${NOME_CATEGORIA.vacina.toLowerCase()} na lista: falta de vacina vira busca ativa de esquema atrasado depois.` : "") +
        " O pedido de reposição sai pronto na tela de Estoque da Saúde.",
      chave: "estoque:falta",
    });
  }
  if (critico.length) {
    const r = resumo(critico);
    achados.push({
      categoria: "prazo",
      prioridade: "medio",
      secretaria: "saude",
      titulo: `${critico.length === 1 ? "1 item acaba" : `${critico.length} itens acabam`} em até uma semana`,
      descricao: `No consumo informado, ${r.texto} não chegam a 7 dias. Ainda dá para repor antes de faltar. O pedido sai pronto na tela de Estoque da Saúde.`,
      chave: "estoque:critico",
    });
  }
  return achados;
}

/**
 * Aluno fora da escola há 15 dias ou mais, com o caso aberto e sem
 * comunicação ao Conselho Tutelar (ECA, art. 56, II). Agrupado e sem nome de
 * aluno: e-mail e alerta não são lugar de dado de criança.
 */
export function achadosDaBuscaAtiva(
  casos: {
    situacao: string;
    ultimaPresenca: string | null;
    conselhoTutelarEm: string | null;
    faltas: number;
    aulasPeriodo: number;
    escolaNome: string;
  }[],
  hoje: Date = new Date()
): DeteccaoAutomatica[] {
  const atrasados = casos.filter((c) => {
    if (!emAndamento(c.situacao) || c.conselhoTutelarEm) return false;
    const dias = diasSemAparecer(c.ultimaPresenca, hoje);
    return dias !== null && dias >= DIAS_PARA_CONSELHO;
  });
  const reprovando = casos.filter(
    (c) => emAndamento(c.situacao) && situacaoDaFrequencia(c.faltas, c.aulasPeriodo) === "reprovacao"
  );

  const achados: DeteccaoAutomatica[] = [];
  if (atrasados.length) {
    const escolas = new Set(atrasados.map((c) => c.escolaNome));
    achados.push({
      categoria: "prazo",
      prioridade: "urgente",
      secretaria: "educacao",
      titulo: `${atrasados.length === 1 ? "1 aluno fora" : `${atrasados.length} alunos fora`} da escola sem comunicação ao Conselho Tutelar`,
      descricao:
        `${DIAS_PARA_CONSELHO} dias ou mais sem aparecer, em ${escolas.size === 1 ? "1 escola" : `${escolas.size} escolas`} ` +
        `(${[...escolas].slice(0, 3).join(", ")}${escolas.size > 3 ? "…" : ""}). O ECA (art. 56, II) manda comunicar ` +
        "o Conselho Tutelar quando os recursos escolares se esgotam; o ofício sai pronto da ficha de cada aluno na Busca Ativa.",
      chave: "busca-ativa:conselho",
    });
  }
  if (reprovando.length) {
    achados.push({
      categoria: "prazo",
      prioridade: "medio",
      secretaria: "educacao",
      titulo: `${reprovando.length === 1 ? "1 aluno" : `${reprovando.length} alunos`} da Busca Ativa abaixo de 75% de frequência`,
      descricao:
        "Abaixo do mínimo da LDB (art. 24, VI), o aluno reprova por falta, mesmo com nota. " +
        "A Busca Ativa mostra quantas faltas ainda cabem em cada caso.",
      chave: "busca-ativa:reprovacao",
    });
  }
  return achados;
}

// ── a decisão: o que gravar, reabrir, fechar e avisar ──

export type AlertaExistente = {
  id: string;
  prioridade: Prioridade;
  resolvido: boolean;
  /** Quando o gestor fechou à mão pela última vez (auditoria), se fechou. */
  fechadoAMaoEm: string | null;
  /** Quando a vigia viu o fato sumir pela última vez, se viu. */
  encerradoEm: string | null;
};

export type AchadoComId = DeteccaoAutomatica & { id: string };

export type Plano = {
  inserir: AchadoComId[];
  /** Fato que sumiu e voltou: o alerta reabre, como novo. */
  reabrir: AchadoComId[];
  /** Mesmo fato, texto do dia (e prioridade, se mudou). */
  atualizar: AchadoComId[];
  /** Subiu de prioridade: avisa de novo. */
  piorou: AchadoComId[];
  /** O fato sumiu e o alerta estava aberto: fecha sozinho. */
  encerrar: string[];
  /** O fato sumiu de um alerta que o gestor já tinha fechado: só registra. */
  registrarSumico: string[];
};

export function planejar(existentes: AlertaExistente[], achados: AchadoComId[]): Plano {
  const porId = new Map(existentes.map((e) => [e.id, e]));
  const plano: Plano = { inserir: [], reabrir: [], atualizar: [], piorou: [], encerrar: [], registrarSumico: [] };
  const vistos = new Set<string>();

  for (const a of achados) {
    if (vistos.has(a.id)) continue;
    vistos.add(a.id);
    const e = porId.get(a.id);
    if (!e) {
      plano.inserir.push(a);
      continue;
    }
    if (!e.resolvido) {
      plano.atualizar.push(a);
      if (PESO[a.prioridade] > PESO[e.prioridade]) plano.piorou.push(a);
      continue;
    }
    // Fechado. Reabre só se a vigia viu o fato sumir DEPOIS do último
    // fechamento à mão (ou se ninguém fechou à mão): é episódio novo.
    const sumiuDepois = e.encerradoEm !== null && (e.fechadoAMaoEm === null || e.encerradoEm > e.fechadoAMaoEm);
    if (sumiuDepois) plano.reabrir.push(a);
    else plano.atualizar.push(a);
  }

  for (const e of existentes) {
    if (vistos.has(e.id)) continue;
    if (!e.resolvido) plano.encerrar.push(e.id);
    else if (e.fechadoAMaoEm !== null && (e.encerradoEm === null || e.encerradoEm < e.fechadoAMaoEm)) {
      plano.registrarSumico.push(e.id);
    }
  }
  return plano;
}

// ── o e-mail ──


const NOME_SECRETARIA: Record<string, string> = {
  saude: "Saúde",
  educacao: "Educação",
  obras: "Obras",
  licitacoes: "Licitações e contratos",
};

const RODAPE: Record<"secretario" | "prefeito" | "admin", string> = {
  secretario: "Você recebe os alertas da sua secretaria; o prefeito só recebe os urgentes.",
  prefeito:
    "Como prefeito, você recebe os alertas do gabinete e, das secretarias, só os urgentes: o resto vai direto ao secretário de cada área.",
  admin: "Como administrador, você recebe os alertas de todas as áreas.",
};

export function emailDaVigia(dados: {
  municipio: string;
  novos: DeteccaoAutomatica[];
  piorados: DeteccaoAutomatica[];
  linkAlertas: string;
  /** Em que papel a pessoa recebe: muda a explicação no rodapé. */
  papel?: "secretario" | "prefeito" | "admin";
}): { assunto: string; html: string } | null {
  // "info" (indicador que ninguém atualiza) não justifica e-mail: fica no painel.
  const novos = dados.novos.filter((d) => d.prioridade !== "info");
  const piorados = dados.piorados.filter((d) => d.prioridade !== "info");
  const todos = [...novos, ...piorados];
  if (!todos.length) return null;

  const urgentes = todos.filter((d) => d.prioridade === "urgente").length;
  const assunto =
    urgentes > 0
      ? `${dados.municipio}: ${urgentes === 1 ? "1 ponto urgente" : `${urgentes} pontos urgentes`} para hoje`
      : `${dados.municipio}: ${todos.length === 1 ? "1 ponto pede atenção" : `${todos.length} pontos pedem atenção`}`;

  const item = (d: DeteccaoAutomatica, piorou: boolean): Item => {
    const area = d.secretaria ? NOME_SECRETARIA[d.secretaria] ?? d.secretaria : "Gabinete";
    return {
      etiqueta: `${d.prioridade === "urgente" ? "Urgente" : "Atenção"} · ${area}${piorou ? " · piorou desde o último aviso" : ""}`,
      titulo: d.titulo,
      detalhe: d.descricao,
      tom: d.prioridade === "urgente" ? "urgente" : "atencao",
    };
  };
  const ordenar = (ls: DeteccaoAutomatica[]) => [...ls].sort((a, b) => PESO[b.prioridade] - PESO[a.prioridade]);
  const ordenados = [...ordenar(novos).map((d) => item(d, false)), ...ordenar(piorados).map((d) => item(d, true))];

  const html = montarEmail({
    remetente: { tipo: "cidadeia" },
    previa: `${todos[0].titulo}${todos.length > 1 ? ` e mais ${todos.length - 1}` : ""}.`,
    etiqueta: { texto: `Vigia diária · ${dados.municipio}`, tom: urgentes ? "urgente" : "atencao" },
    titulo: urgentes > 0
      ? `${urgentes === 1 ? "1 ponto urgente" : `${urgentes} pontos urgentes`} para hoje`
      : `${todos.length === 1 ? "1 ponto pede" : `${todos.length} pontos pedem`} atenção`,
    blocos: [
      { p: `A vigia do CidadeIA passou pelos módulos de ${dados.municipio} hoje de manhã e encontrou o seguinte:` },
      { itens: ordenados },
      { botao: "Ver e resolver no painel", link: dados.linkAlertas },
      { nota: "Só chega e-mail quando aparece algo novo ou quando algo piora. O alerta some do painel sozinho quando o problema deixa de existir." },
    ],
    assinatura: null,
    motivo: RODAPE[dados.papel ?? "admin"],
  });
  return { assunto, html };
}
