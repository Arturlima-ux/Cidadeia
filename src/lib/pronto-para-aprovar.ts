// ── PRONTO PARA APROVAR (nov/2026) ──
//
// Pedido do fundador: o sistema não entrega aviso, entrega o trabalho feito.
// Esta é a fila única do que o CidadeIA já deixou pronto em cada módulo e só
// espera alguém conferir: a notificação à empreiteira da obra atrasada, os
// documentos da renovação do contrato que está vencendo, o pedido de
// reposição das unidades de saúde e o pedido da merenda das escolas.
//
// Cada item leva à tela onde o trabalho é conferido. A aprovação continua lá,
// e não aqui com um clique às cegas: aprova-se o texto que foi LIDO (ver
// app/dashboard/secretarias/licitacoes/renovacao-actions.ts).
//
// Nada aqui é estimativa. O placar conta o que está na fila e o que foi
// aprovado de fato, pela trilha de auditoria.
//
// Parte pura. A leitura do banco está em pronto-para-aprovar-servidor.ts.

export type AreaPronto = "obras" | "licitacoes" | "saude" | "educacao";

export const NOME_AREA_PRONTO: Record<AreaPronto, string> = {
  obras: "Obras",
  licitacoes: "Licitações",
  saude: "Saúde",
  educacao: "Educação",
};

export type ItemPronto = {
  /** Único na fila: área + id do que foi montado. */
  id: string;
  area: AreaPronto;
  /** O que o sistema montou ("Notificação à contratada"). */
  trabalho: string;
  /** Sobre o quê (a obra, o objeto do contrato, "12 itens em 3 unidades"). */
  assunto: string;
  /** Por que está na fila, em uma frase factual. */
  motivo: string;
  href: string;
  /** O verbo do botão. */
  acao: string;
  urgente: boolean;
  /** Já aprovado uma vez, mas o dado mudou depois: pede nova conferência. */
  mudou: boolean;
  /** Desempate dentro da mesma urgência: menor vem antes. */
  peso: number;
};

/** Urgentes primeiro; dentro delas, o que mudou depois da aprovação; depois o peso. */
export function ordenarFila(itens: ItemPronto[]): ItemPronto[] {
  return [...itens].sort(
    (a, b) =>
      Number(b.urgente) - Number(a.urgente) ||
      Number(b.mudou) - Number(a.mudou) ||
      a.peso - b.peso ||
      a.assunto.localeCompare(b.assunto, "pt-BR")
  );
}

export function plural(n: number, um: string, muitos: string): string {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? um : muitos}`;
}

// ── os itens, um por tipo de trabalho ──

export function itemDaNotificacao(o: {
  obraId: string;
  obraNome: string;
  motivo: "prazo_encerrado" | "atraso";
  estado: "rascunho" | "aprovado" | "desatualizado";
}): ItemPronto | null {
  if (o.estado === "aprovado") return null;
  return {
    id: `obra:${o.obraId}`,
    area: "obras",
    trabalho: "Notificação à contratada",
    assunto: o.obraNome,
    motivo:
      o.estado === "desatualizado"
        ? "A obra mudou depois da aprovação: o texto foi refeito"
        : o.motivo === "prazo_encerrado"
          ? "O prazo do contrato acabou sem a obra concluída"
          : "A obra está atrás do prazo pela última medição",
    href: `/dashboard/secretarias/obras/${o.obraId}/notificacao`,
    acao: "Conferir e aprovar",
    urgente: o.motivo === "prazo_encerrado",
    mudou: o.estado === "desatualizado",
    peso: o.motivo === "prazo_encerrado" ? 0 : 1,
  };
}

export function itemDaRenovacao(c: {
  contratoId: string;
  objeto: string;
  numeroContrato: string | null;
  /** A frase da vigência (lib/vigencia.ts), "vence em 18 dias úteis…". */
  vigenciaTexto: string;
  situacao: string;
  peso: number;
  estado: "rascunho" | "aprovado" | "desatualizado" | "substituido";
}): ItemPronto | null {
  if (c.estado === "aprovado" || c.estado === "substituido") return null;
  return {
    id: `contrato:${c.contratoId}`,
    area: "licitacoes",
    trabalho: "Renovação do contrato",
    assunto: c.numeroContrato ? `${c.numeroContrato} · ${c.objeto}` : c.objeto,
    motivo: c.estado === "desatualizado" ? "O contrato mudou depois da aprovação: os documentos foram refeitos" : primeiraFrase(c.vigenciaTexto),
    href: `/dashboard/secretarias/licitacoes/contratos/${c.contratoId}`,
    acao: "Conferir e aprovar",
    urgente: c.situacao === "vencido" || c.situacao === "sem_tempo_de_licitar" || c.situacao === "apertado",
    mudou: c.estado === "desatualizado",
    peso: c.peso,
  };
}

type LinhaDoPedido = { situacao: string; local: string };

/** O pedido de reposição (saúde) ou da merenda (escolas): um item por pedido, não por linha. */
export function itemDoPedido(area: "saude" | "educacao", linhas: LinhaDoPedido[]): ItemPronto | null {
  if (!linhas.length) return null;
  const locais = new Set(linhas.map((l) => l.local)).size;
  const emFalta = linhas.filter((l) => l.situacao === "falta").length;
  const criticos = linhas.filter((l) => l.situacao === "critico").length;
  const saude = area === "saude";
  const partes = [
    emFalta ? plural(emFalta, "item em falta", "itens em falta") : null,
    criticos ? plural(criticos, saude ? "acabando em até 7 dias" : "acabando esta semana", saude ? "acabando em até 7 dias" : "acabando esta semana") : null,
  ].filter(Boolean);
  return {
    id: `pedido:${area}`,
    area,
    trabalho: saude ? "Pedido de reposição" : "Pedido da merenda",
    assunto: `${plural(linhas.length, "item", "itens")} em ${plural(locais, saude ? "unidade" : "escola", saude ? "unidades" : "escolas")}`,
    motivo: partes.length
      ? `${partes.join(" e ")}. Quantidades calculadas pelo consumo`
      : saude
        ? "Itens abaixo de 15 dias de cobertura. Quantidades calculadas pelo consumo"
        : "Itens abaixo de 10 dias de aula. Quantidades calculadas pelo consumo",
    href: saude ? "/dashboard/secretarias/saude/reposicao" : "/dashboard/secretarias/educacao/reposicao",
    acao: "Conferir e baixar",
    urgente: emFalta > 0,
    mudou: false,
    peso: emFalta ? 0 : criticos ? 1 : 2,
  };
}

/**
 * Só a primeira frase da vigência, sem a data crua: a conta inteira do art.
 * 55 está na tela do contrato, a um toque. Na fila, menos texto.
 */
export function primeiraFrase(texto: string): string {
  const fim = texto.search(/\.(\s|$)/);
  const frase = fim >= 0 ? texto.slice(0, fim) : texto;
  return frase.replace(/\s*\(\d{4}-\d{2}-\d{2}\)/, "").trim();
}

// ── o placar ──

export type Placar = {
  naFila: number;
  urgentes: number;
  /** Aprovações registradas na trilha nos últimos 30 dias. */
  aprovados30: number;
};

export function placarDa(fila: ItemPronto[], aprovados30: number): Placar {
  return { naFila: fila.length, urgentes: fila.filter((i) => i.urgente).length, aprovados30 };
}

/** Dentro dos últimos 30 dias, contando de hoje. A data vem do banco (lib/data-do-banco.ts). */
export function nosUltimos30Dias(quando: Date, hoje: Date = new Date()): boolean {
  const t = quando.getTime();
  if (Number.isNaN(t)) return false;
  return hoje.getTime() - t <= 30 * 86_400_000 && t <= hoje.getTime() + 60_000;
}
