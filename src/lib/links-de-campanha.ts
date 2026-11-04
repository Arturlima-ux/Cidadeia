import { CANAIS, ROTULO_CANAL, ehIdDeProspecto, type Canal } from "@/lib/prospeccao";

// ── DE ONDE VEIO CADA LEAD (novembro de 2026) ──
//
// Com poucas visitas por dia, o que decide onde pôr o esforço é saber qual
// canal traz gente que pede proposta. O "de onde chegaram" da Medição só via
// o site de origem (o host do referer), e o Instagram, o WhatsApp e o e-mail
// quase nunca mandam referer: tudo caía em "acesso direto".
//
// A saída é o link marcado. A mesa de prospecção gera, para cada prospecto, o
// link do Raio-X da cidade com o canal e o número do prospecto
// (?utm_source=whatsapp&utm_content=pros_…). Quando alguém abre, a visita
// guarda "link:whatsapp" como origem e o número do prospecto no detalhe. O
// cartão da mesa mostra que o link foi aberto, e a Medição soma por canal.
//
// O que se guarda é só o que o próprio CidadeIA escreveu no link: um canal da
// lista abaixo e um número de prospecto. Parâmetro de campanha de terceiro
// (utm de anúncio, fbclid, termo de busca) não entra, como antes.

export const PREFIXO_DA_ORIGEM = "link:";

export type Campanha = { canal: Canal; prospecto: string | null };

type Parametros = URLSearchParams | Record<string, string | string[] | undefined>;

function ler(p: Parametros, chave: string): string | null {
  if (p instanceof URLSearchParams) return p.get(chave);
  const v = p[chave];
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

/**
 * O link para mandar a um prospecto (com o número dele) ou para pôr no
 * perfil de um canal (sem número). `base` é o endereço do site.
 */
export function linkMarcado(base: string, caminho: string, canal: Canal, prospecto?: string | null): string {
  const u = new URL(caminho, base);
  u.searchParams.set("utm_source", canal);
  if (prospecto && ehIdDeProspecto(prospecto)) {
    u.searchParams.set("utm_medium", "prospeccao");
    u.searchParams.set("utm_content", prospecto);
  } else {
    u.searchParams.set("utm_medium", "perfil");
  }
  return u.toString();
}

/** O canal e o prospecto de um link marcado pelo CidadeIA, ou null. */
export function lerCampanha(p: Parametros): Campanha | null {
  const canal = ler(p, "utm_source")?.trim().toLowerCase() ?? "";
  if (!(CANAIS as readonly string[]).includes(canal)) return null;
  const conteudo = ler(p, "utm_content")?.trim() ?? "";
  return { canal: canal as Canal, prospecto: ehIdDeProspecto(conteudo) ? conteudo : null };
}

export function origemDaCampanha(c: Campanha): string {
  return `${PREFIXO_DA_ORIGEM}${c.canal}`;
}

/** Como a origem aparece na Medição. */
export function rotuloDaOrigem(origem: string | null): string {
  if (!origem) return "acesso direto ou app sem referer";
  if (origem.startsWith(PREFIXO_DA_ORIGEM)) {
    const canal = origem.slice(PREFIXO_DA_ORIGEM.length) as Canal;
    return `${ROTULO_CANAL[canal] ?? canal}, pelo link marcado`;
  }
  return origem;
}

export type Abertura = { pessoas: number; ultima: string };

/**
 * Quantas pessoas abriram o link de cada prospecto, e quando foi a última.
 * O visitante é um resumo que muda à meia-noite (lib/analytics.ts): a mesma
 * pessoa em dois dias conta duas vezes, e é por isso que o cartão diz
 * "aberturas em dias diferentes" e não "pessoas".
 */
export function aberturasPorProspecto(
  linhas: { detalhe: string | null; visitante: string; criadoEm: string }[]
): Map<string, Abertura> {
  const vistos = new Map<string, { quem: Set<string>; ultima: string }>();
  for (const l of linhas) {
    if (!l.detalhe || !ehIdDeProspecto(l.detalhe)) continue;
    const v = vistos.get(l.detalhe) ?? { quem: new Set<string>(), ultima: l.criadoEm };
    v.quem.add(l.visitante);
    if (l.criadoEm > v.ultima) v.ultima = l.criadoEm;
    vistos.set(l.detalhe, v);
  }
  return new Map([...vistos].map(([id, v]) => [id, { pessoas: v.quem.size, ultima: v.ultima }]));
}

/** `leads`: quem pediu proposta ou deixou contato (nome e e-mail ou telefone). */
export type LinhaPorOrigem = { origem: string | null; visitantes: number; raioX: number; leads: number };

const TIPOS_DE_LEAD = new Set(["proposta_enviada", "contato_deixado"]);

/**
 * Por origem, quantos chegaram, quantos abriram o Raio-X de uma cidade e
 * quantos viraram lead (pediram proposta ou deixaram contato). A origem de cada visitante é a do primeiro
 * evento dele no dia, que é a página onde entrou: os eventos seguintes têm o
 * próprio site como origem e não dizem de onde a pessoa veio. `proprioSite`
 * é esse host, para não aparecer como canal.
 */
export function funilPorOrigem(
  eventos: { tipo: string; visitante: string; origem: string | null; criadoEm: string }[],
  proprioSite: string | null
): LinhaPorOrigem[] {
  const porVisitante = new Map<string, { origem: string | null; quando: string; raioX: boolean; lead: boolean }>();
  for (const e of eventos) {
    const v = porVisitante.get(e.visitante) ?? { origem: null, quando: "\uffff", raioX: false, lead: false };
    const deFora = e.origem && e.origem !== proprioSite ? e.origem : null;
    // A origem é a do primeiro evento; um evento posterior só preenche se o
    // primeiro não tinha nenhuma (a visita da home chega pelo navegador e
    // pode ser gravada depois do Raio-X aberto em seguida).
    if (e.criadoEm < v.quando) {
      v.origem = deFora ?? v.origem;
      v.quando = e.criadoEm;
    } else if (!v.origem && deFora) {
      v.origem = deFora;
    }
    if (e.tipo === "raio_x") v.raioX = true;
    if (TIPOS_DE_LEAD.has(e.tipo)) v.lead = true;
    porVisitante.set(e.visitante, v);
  }
  const porOrigem = new Map<string | null, LinhaPorOrigem>();
  for (const v of porVisitante.values()) {
    const l = porOrigem.get(v.origem) ?? { origem: v.origem, visitantes: 0, raioX: 0, leads: 0 };
    l.visitantes++;
    if (v.raioX) l.raioX++;
    if (v.lead) l.leads++;
    porOrigem.set(v.origem, l);
  }
  return [...porOrigem.values()].sort((a, b) => b.leads - a.leads || b.visitantes - a.visitantes);
}
