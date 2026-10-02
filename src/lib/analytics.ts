import { createHmac } from "node:crypto";

// ── MEDIR SEM RASTREAR ──
//
// O pedido original era Google Analytics e Meta Pixel. Os dois contradizem o
// produto: o acordo de tratamento de dados que vai ao jurídico da prefeitura
// declara onde o dado fica e que ele não vai para terceiros, e a LGPD exige
// consentimento para cookie não essencial. Uma GovTech que vende conformidade
// carregando o Pixel da Meta é a primeira incoerência que um procurador acha.
//
// Então a medição é de PRIMEIRA PARTE: fica no banco do próprio produto, sem
// cookie, sem script de terceiro, sem banner de consentimento — porque não há
// o que consentir quando não se guarda dado pessoal.
//
// ── O PROBLEMA DIFÍCIL: CONTAR PESSOA SEM SABER QUEM É ──
//
// Contar visitas é fácil. Contar VISITANTES exige reconhecer que dois pedidos
// vieram da mesma pessoa — e é aí que todo analytics vira rastreamento.
//
// A saída conhecida é uma impressão digital que EXPIRA. O identificador sai de
// HMAC(segredo, dia) sobre IP e navegador. Três consequências:
//
//   1. não guardamos IP nem navegador, só o resumo;
//   2. o resumo muda sozinho à meia-noite, então ninguém é seguido de um dia
//      para o outro — nem por nós;
//   3. sem o segredo, o resumo não volta ao IP.
//
// O item 3 é o que separa isto de "anonimização" de fachada. Hash de IP puro
// NÃO é anônimo: IPv4 tem 4 bilhões de valores e qualquer um os percorre em
// minutos. É o segredo que torna irreversível, e é por isso que ele é segredo
// e não uma constante no código.

export type TipoEvento =
  /** Página aberta. O evento de base. */
  | "visita"
  /** Alguém consultou o Raio-X de um município. */
  | "raio_x"
  /** Entrou na demonstração. */
  | "demo"
  /** Abriu o montador de proposta. */
  | "proposta_aberta"
  /** Enviou o pedido de proposta. É o evento que vale dinheiro. */
  | "proposta_enviada"
  /** Baixou um documento do kit de contratação. */
  | "kit_baixado"
  /** Abriu a página de um módulo. */
  | "modulo";

export const TIPOS_EVENTO: TipoEvento[] = [
  "visita",
  "raio_x",
  "demo",
  "proposta_aberta",
  "proposta_enviada",
  "kit_baixado",
  "modulo",
];

export type Evento = {
  tipo: TipoEvento;
  caminho: string;
  uf: string | null;
  codigoIbge: string | null;
  municipio: string | null;
  /** Rótulo livre: chave do módulo, documento do kit. Nunca dado de pessoa. */
  detalhe: string | null;
  visitante: string;
  /** Host de origem, sem caminho nem parâmetros. */
  origem: string | null;
  dispositivo: "movel" | "computador";
  criadoEm: string;
};

/**
 * O identificador do dia.
 *
 * Trunca o IP antes de resumir: o último octeto do IPv4 (e os 80 bits finais
 * do IPv6) identificam a MÁQUINA dentro da rede, e para contar visitante basta
 * a rede. Truncar reduz o que entra no resumo mesmo que o segredo vaze.
 */
export function identificadorDoDia(
  ip: string,
  navegador: string,
  dia: string,
  segredo: string
): string {
  const rede = truncarIp(ip);
  return createHmac("sha256", `${segredo}:${dia}`)
    .update(`${rede}|${navegador}`)
    .digest("hex")
    .slice(0, 32);
}

/** 189.34.12.77 → 189.34.12.0 · 2001:db8:85a3::1 → 2001:db8:85a3:: */
export function truncarIp(ip: string): string {
  const limpo = ip.trim();
  if (limpo.includes(":")) {
    const partes = limpo.split(":");
    return partes.slice(0, 4).join(":") + "::";
  }
  const octetos = limpo.split(".");
  if (octetos.length !== 4) return limpo;
  return `${octetos[0]}.${octetos[1]}.${octetos[2]}.0`;
}

/**
 * Celular ou computador, pela string do navegador.
 *
 * É a única coisa que guardamos dela, e é guardada já reduzida a uma de duas
 * palavras — versão de sistema e modelo de aparelho são o que torna uma
 * impressão digital única, e não servem para decisão nenhuma aqui.
 */
export function dispositivoDe(navegador: string): "movel" | "computador" {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navegador) ? "movel" : "computador";
}

/**
 * Só o host da origem.
 *
 * O caminho completo de onde a pessoa veio pode conter busca, identificador de
 * campanha e às vezes dado de sessão de outro site. Para saber se o tráfego
 * veio de busca, de rede social ou de link direto, o host basta.
 */
export function origemDe(referer: string | null | undefined): string | null {
  if (!referer) return null;
  try {
    const u = new URL(referer);
    return u.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

// ── O FUNIL ──
//
// A pergunta que o Google Analytics responde mal e o banco do produto responde
// com precisão: dos municípios consultados, quantos viraram proposta.
//
// Não é curiosidade. Define onde investir: se muitos consultam e poucos pedem
// proposta, o problema é a página de Soluções; se poucos consultam, é
// divulgação.

export type EtapaFunil = {
  chave: TipoEvento;
  rotulo: string;
  /** O que esta etapa significa, para a tela não exigir interpretação. */
  significado: string;
  eventos: number;
  visitantes: number;
  /** Fração de quem chegou na etapa ANTERIOR. Null na primeira. */
  conversao: number | null;
};

/** A ordem em que a jornada acontece. */
export const ORDEM_DO_FUNIL: { chave: TipoEvento; rotulo: string; significado: string }[] = [
  { chave: "visita", rotulo: "Visitou o site", significado: "Abriu qualquer página pública." },
  {
    chave: "raio_x",
    rotulo: "Consultou um município",
    significado: "Viu os números do próprio município no Raio-X. É o primeiro sinal de intenção.",
  },
  {
    chave: "demo",
    rotulo: "Entrou na demonstração",
    significado: "Abriu o painel real com a prefeitura fictícia.",
  },
  {
    chave: "proposta_aberta",
    rotulo: "Abriu a proposta",
    significado: "Chegou ao montador de proposta e começou a escolher módulos.",
  },
  {
    chave: "proposta_enviada",
    rotulo: "Pediu proposta",
    significado: "Enviou o pedido. É o evento que vale dinheiro.",
  },
];

export type ContagemPorTipo = { tipo: TipoEvento; eventos: number; visitantes: number };

export function montarFunil(contagens: ContagemPorTipo[]): EtapaFunil[] {
  const por = new Map(contagens.map((c) => [c.tipo, c]));
  let anterior: number | null = null;

  return ORDEM_DO_FUNIL.map((e) => {
    const c = por.get(e.chave);
    const visitantes = c?.visitantes ?? 0;
    // A conversão é sobre VISITANTES, não sobre eventos: quem recarrega a
    // página três vezes não é três pessoas, e contar eventos faria uma etapa
    // parecer ter mais gente que a anterior.
    const conversao = anterior === null ? null : anterior === 0 ? 0 : (visitantes / anterior) * 100;
    anterior = visitantes;
    return {
      chave: e.chave,
      rotulo: e.rotulo,
      significado: e.significado,
      eventos: c?.eventos ?? 0,
      visitantes,
      conversao,
    };
  });
}

/**
 * Onde o funil mais perde gente.
 *
 * Devolve a etapa com a menor conversão, que é onde um ajuste rende mais.
 * Null quando ainda não há base: com cinco visitantes, "perdeu 50%" é ruído
 * com cara de diagnóstico.
 */
export const MINIMO_PARA_DIAGNOSTICO = 30;

export function maiorPerda(funil: EtapaFunil[]): EtapaFunil | null {
  const primeira = funil[0];
  if (!primeira || primeira.visitantes < MINIMO_PARA_DIAGNOSTICO) return null;
  const comConversao = funil.filter((e) => e.conversao !== null);
  if (comConversao.length === 0) return null;
  return comConversao.reduce((pior, e) => (e.conversao! < pior.conversao! ? e : pior));
}

/** Municípios mais consultados, do mais para o menos. */
export function municipiosMaisConsultados(
  eventos: { tipo: TipoEvento; municipio: string | null; uf: string | null; visitante: string }[],
  limite = 10
): { municipio: string; uf: string; visitantes: number }[] {
  const por = new Map<string, { municipio: string; uf: string; visitantes: Set<string> }>();
  for (const e of eventos) {
    if (e.tipo !== "raio_x" || !e.municipio || !e.uf) continue;
    const chave = `${e.uf}/${e.municipio}`;
    const atual = por.get(chave) ?? { municipio: e.municipio, uf: e.uf, visitantes: new Set() };
    atual.visitantes.add(e.visitante);
    por.set(chave, atual);
  }
  return [...por.values()]
    .map((x) => ({ municipio: x.municipio, uf: x.uf, visitantes: x.visitantes.size }))
    .sort((a, b) => b.visitantes - a.visitantes)
    .slice(0, limite);
}
