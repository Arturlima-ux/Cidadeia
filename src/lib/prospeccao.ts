// ── A PROSPECÇÃO, EM REGRAS (novembro de 2026) ──
//
// O começo do funil de vendas, antes do pedido: achar a prefeitura, aquecer,
// abordar com o número público da cidade, qualificar e marcar a reunião. O
// guia de vendas ("Guia de vendas do CidadeIA", documento do fundador) usa
// as mesmas etapas, a mesma cadência e os mesmos canais daqui. Dali em
// diante, a venda segue em /admin/pedidos.
//
// ── SEM MUDAR O BANCO ──
// Como os interessados (lib/oportunidades.ts), cada prospecto é uma sequência
// de registros na linha do tempo que já existe (pedido_eventos), com o id do
// prospecto ("pros_…") no lugar do id do pedido e o tipo começando por
// "pros_". O estado de hoje é a soma dos registros, na ordem. Assim a mesa
// nasce sem migração no banco de produção, e o histórico de cada contato vem
// de graça. Apagar um prospecto apaga os registros dele (LGPD: quem pede
// para não ser procurado sai no mesmo dia).
//
// Aqui só regra pura, testável: tests/prospeccao.test.ts.

export const ETAPAS = ["mapeada", "aquecendo", "abordada", "conversando", "qualificada", "reuniao", "pedido"] as const;
export const SAIDAS = ["pausada", "descartada"] as const;
export type Etapa = (typeof ETAPAS)[number];
export type Saida = (typeof SAIDAS)[number];
export type Situacao = Etapa | Saida;

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  mapeada: "Mapeada",
  aquecendo: "Aquecendo",
  abordada: "Abordada",
  conversando: "Conversando",
  qualificada: "Qualificada",
  reuniao: "Reunião marcada",
  pedido: "Virou pedido",
  pausada: "Pausada",
  descartada: "Descartada",
};

export const CANAIS = ["instagram", "whatsapp", "linkedin", "email", "ligacao"] as const;
export type Canal = (typeof CANAIS)[number];
export const ROTULO_CANAL: Record<Canal, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  email: "E-mail",
  ligacao: "Ligação",
};

/** Os tipos dos registros na linha do tempo (pedido_eventos.tipo). */
export const TIPO = {
  criado: "pros_criado",
  situacao: "pros_situacao",
  proxima: "pros_proxima",
  followup: "pros_followup",
  nota: "pros_nota",
} as const;

export const PREFIXO_ID = "pros_";
export function ehIdDeProspecto(id: string): boolean {
  return /^pros_[A-Za-z0-9_-]{4,64}$/.test(id);
}

export type DadosProspecto = {
  municipio: string;
  uf: string;
  codigoIbge: string | null;
  pessoa: string;
  cargo: string;
  canal: Canal;
  contato: string;
  /** O número do Raio-X que abre a conversa. */
  gancho: string;
};

export type Proxima = { acao: string; data: string };

export type RegistroDaLinha = { tipo: string; descricao: string; autor: string; criadoEm: string };

export type Prospecto = {
  id: string;
  dados: DadosProspecto;
  situacao: Situacao;
  /** Quando entrou na situação de agora (ISO). */
  desde: string;
  /** As etapas por onde já passou, para as taxas do funil. */
  passouPor: Set<Etapa>;
  proxima: Proxima | null;
  followups: number;
  criadoEm: string;
  atualizadoEm: string;
  historico: RegistroDaLinha[];
};

// ── datas: dia de Brasília, "AAAA-MM-DD" ──

const FUSO_MS = -3 * 3600_000;

/** O dia de hoje (ou de um instante) em Brasília, como "AAAA-MM-DD". */
export function diaDeBrasilia(ms: number): string {
  return new Date(ms + FUSO_MS).toISOString().slice(0, 10);
}

/** Soma dias úteis (segunda a sexta) a um dia "AAAA-MM-DD". Feriados não entram. */
export function somarDiasUteis(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  let falta = n;
  while (falta > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const s = d.getUTCDay();
    if (s !== 0 && s !== 6) falta--;
  }
  return d.toISOString().slice(0, 10);
}

export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "2026-11-05" é um dia de calendário válido? */
export function ehDia(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// ── a cadência do guia ──

/** A próxima ação sugerida ao entrar numa situação. null: nenhuma (o pedido segue na outra mesa). */
export function proximaAoEntrar(situacao: Situacao, hoje: string): Proxima | null {
  switch (situacao) {
    case "mapeada":
      return { acao: "Aquecer: seguir a prefeitura e a pessoa e interagir", data: somarDiasUteis(hoje, 1) };
    case "aquecendo":
      return { acao: "Abordar com o número da cidade", data: somarDiasUteis(hoje, 3) };
    case "abordada":
      return { acao: "Follow-up 1: outro número, mesmo canal", data: somarDiasUteis(hoje, 2) };
    case "conversando":
      return { acao: "Responder e propor dois horários", data: somarDiasUteis(hoje, 1) };
    case "qualificada":
      return { acao: "Marcar a reunião de 20 minutos", data: somarDiasUteis(hoje, 1) };
    case "reuniao":
      return { acao: "Confirmar a reunião na véspera", data: somarDiasUteis(hoje, 1) };
    case "pausada":
      return { acao: "Reativar com o próximo RREO ou RGF", data: somarDias(hoje, 30) };
    case "pedido":
    case "descartada":
      return null;
  }
}

/**
 * Depois de um follow-up sem resposta: o seguinte da cadência (+2, +5 e +10
 * dias úteis desde a abordagem viram +3 e +5 entre um e outro), e depois do
 * terceiro, decidir hoje entre pausar e descartar.
 */
export function proximaDepoisDoFollowup(feitos: number, hoje: string): Proxima {
  if (feitos === 1) return { acao: "Follow-up 2: outro canal (e-mail ou ligação)", data: somarDiasUteis(hoje, 3) };
  if (feitos === 2) return { acao: "Follow-up 3: o último, curto e com saída", data: somarDiasUteis(hoje, 5) };
  return { acao: "Sem resposta depois de 3 follow-ups: pausar ou descartar", data: hoje };
}

// ── da linha do tempo ao prospecto ──

function lerJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/** Soma os registros de um prospecto, em ordem. null se não houver o registro de criação. */
export function montarProspecto(id: string, registros: RegistroDaLinha[]): Prospecto | null {
  const ordem = [...registros].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const criado = ordem.find((r) => r.tipo === TIPO.criado);
  if (!criado) return null;
  const inicio = lerJson<DadosProspecto & { situacao?: Situacao }>(criado.descricao);
  if (!inicio) return null;
  const { situacao: situacaoInicial, ...dados } = inicio;
  const p: Prospecto = {
    id,
    dados,
    situacao: situacaoInicial ?? "mapeada",
    desde: criado.criadoEm,
    passouPor: new Set(),
    proxima: null,
    followups: 0,
    criadoEm: criado.criadoEm,
    atualizadoEm: criado.criadoEm,
    historico: ordem,
  };
  const marcar = (s: Situacao) => {
    if ((ETAPAS as readonly string[]).includes(s)) {
      // Entrar numa etapa conta como ter passado pelas anteriores: quem já
      // chega conversando foi abordado (as taxas não passam de 100%).
      const i = ETAPAS.indexOf(s as Etapa);
      for (let k = 0; k <= i; k++) p.passouPor.add(ETAPAS[k]);
    }
  };
  marcar(p.situacao);
  for (const r of ordem) {
    if (r === criado) continue;
    p.atualizadoEm = r.criadoEm;
    if (r.tipo === TIPO.situacao) {
      const v = lerJson<{ situacao: Situacao }>(r.descricao);
      if (v && v.situacao in ROTULO_SITUACAO && v.situacao !== p.situacao) {
        p.situacao = v.situacao;
        p.desde = r.criadoEm;
        p.followups = 0;
        marcar(v.situacao);
      }
    } else if (r.tipo === TIPO.proxima) {
      const v = lerJson<Proxima | null>(r.descricao);
      p.proxima = v && v.acao && ehDia(v.data) ? v : null;
    } else if (r.tipo === TIPO.followup) {
      p.followups += 1;
    }
  }
  return p;
}

/** Agrupa os registros da linha do tempo por prospecto e monta cada um. */
export function montarTodos(registros: (RegistroDaLinha & { pedidoId: string })[]): Prospecto[] {
  const porId = new Map<string, RegistroDaLinha[]>();
  for (const r of registros) {
    if (!r.pedidoId.startsWith(PREFIXO_ID)) continue;
    const lista = porId.get(r.pedidoId) ?? [];
    lista.push(r);
    porId.set(r.pedidoId, lista);
  }
  const out: Prospecto[] = [];
  for (const [id, lista] of porId) {
    const p = montarProspecto(id, lista);
    if (p) out.push(p);
  }
  return out;
}

// ── a mesa: o que fazer hoje e como está o funil ──

const ABERTAS: Situacao[] = ["mapeada", "aquecendo", "abordada", "conversando", "qualificada", "reuniao", "pausada"];

/** Ações vencidas ou de hoje, das mais atrasadas para as de hoje. */
export function paraHoje(lista: Prospecto[], hoje: string): (Prospecto & { proxima: Proxima; atrasada: boolean })[] {
  return lista
    .filter((p): p is Prospecto & { proxima: Proxima } => !!p.proxima && ABERTAS.includes(p.situacao) && p.proxima.data <= hoje)
    .map((p) => ({ ...p, atrasada: p.proxima.data < hoje }))
    .sort((a, b) => a.proxima.data.localeCompare(b.proxima.data) || a.dados.municipio.localeCompare(b.dados.municipio));
}

export type Taxa = { rotulo: string; de: Etapa; para: Etapa; base: number; chegaram: number; valor: number | null };

/** Quantos estão em cada situação agora. */
export function contagem(lista: Prospecto[]): Record<Situacao, number> {
  const c = Object.fromEntries([...ETAPAS, ...SAIDAS].map((s) => [s, 0])) as Record<Situacao, number>;
  for (const p of lista) c[p.situacao] += 1;
  return c;
}

/** As taxas do guia: de quem chegou a uma etapa, quantos chegaram à seguinte. */
export function taxas(lista: Prospecto[]): Taxa[] {
  const chegou = (e: Etapa) => lista.filter((p) => p.passouPor.has(e)).length;
  const pares: [string, Etapa, Etapa][] = [
    ["Resposta", "abordada", "conversando"],
    ["Qualificação", "conversando", "qualificada"],
    ["Agendamento", "qualificada", "reuniao"],
    ["Pedido por reunião", "reuniao", "pedido"],
  ];
  return pares.map(([rotulo, de, para]) => {
    const base = chegou(de);
    const chegaram = chegou(para);
    return { rotulo, de, para, base, chegaram, valor: base ? chegaram / base : null };
  });
}

// ── quem é a pessoa e como chegar nela ──

/** Os cargos de quem decide ou influencia a compra (seção "Quem decide" do guia). */
export const CARGOS_PROSPECTO = [
  "Prefeito(a)",
  "Vice-prefeito(a)",
  "Secretário(a) de Finanças ou Administração",
  "Secretário(a) de outra área",
  "Controlador(a) interno(a)",
  "Contador(a) / assessoria contábil",
  "Servidor(a) da prefeitura",
  "Outro",
] as const;

/**
 * O link que abre o contato no canal: o perfil do Instagram, a conversa do
 * WhatsApp, o e-mail, a ligação. null quando o contato anotado não dá link
 * (um nome de gabinete, um "ver no site da prefeitura").
 */
export function linkDoContato(canal: Canal, contato: string): string | null {
  const c = contato.trim();
  if (!c) return null;
  if (/^https:\/\/[^\s]+$/i.test(c)) return c;
  const digitos = c.replace(/\D/g, "");
  switch (canal) {
    case "instagram": {
      const perfil = c.replace(/^@/, "");
      return /^[A-Za-z0-9._]{1,30}$/.test(perfil) ? `https://instagram.com/${perfil}` : null;
    }
    case "whatsapp":
      if (digitos.length < 10 || digitos.length > 13) return null;
      return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) ? `mailto:${c}` : null;
    case "ligacao":
      return digitos.length >= 8 ? `tel:+55${digitos.length <= 11 ? digitos : digitos.slice(-11)}` : null;
    case "linkedin":
      return null;
  }
}
