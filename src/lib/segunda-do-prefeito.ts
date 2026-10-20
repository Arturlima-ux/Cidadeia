import { areaDoAlerta, type Area } from "@/lib/alerta-por-area";
import { montarEmail, type Bloco } from "@/lib/email-modelo";

// ── A SEGUNDA DO PREFEITO ──
//
// Um e-mail por semana, segunda cedo, antes da primeira reunião: o que
// precisa da decisão dele, o que vence nos próximos sete dias e o que foi
// resolvido na semana que passou. É o único e-mail que o prefeito recebe
// mesmo numa semana tranquila, e de propósito: "nada urgente, e a vigia
// conferiu tudo" é exatamente o que ele quer saber, e é o que lembra, toda
// semana, para que serve a assinatura.
//
// O secretário recebe a versão da área dele, e só quando há o que dizer.
//
// Este arquivo é a parte pura (o que entra, e o texto). A rotina, com banco e
// e-mail, está em segunda-do-prefeito-servidor.ts.

export const EVENTO_SEGUNDA = "segunda_enviada";
export const idDaSegunda = (prefeituraId: string, hoje: Date) =>
  `segunda:${prefeituraId}:${hoje.toISOString().slice(0, 10)}`;

export type AlertaDaSemana = {
  titulo: string;
  descricao: string | null;
  prioridade: "urgente" | "medio" | "info";
  secretaria: string | null;
};

export type Vencimento = {
  /** ISO (AAAA-MM-DD). */
  data: string;
  texto: string;
  secretaria: string | null;
};

export type Resolvido = {
  titulo: string;
  secretaria: string | null;
  /** true quando a vigia viu o problema sumir; false quando alguém fechou. */
  sozinho: boolean;
};

export type DadosDaSemana = {
  municipio: string;
  abertos: AlertaDaSemana[];
  vencimentos: Vencimento[];
  resolvidos: Resolvido[];
  linkPainel: string;
  /** A despesa com pessoal entre as cidades parecidas (lib/pares.ts), só com Gestão. */
  comparacao?: string | null;
};

const NOME_AREA: Record<Area, string> = {
  saude: "Saúde",
  educacao: "Educação",
  obras: "Obras",
  licitacoes: "Licitações",
};

const DIA_DA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function quando(dataIso: string, hoje: Date): string {
  const d = new Date(`${dataIso.slice(0, 10)}T12:00:00Z`);
  const hojeIso = hoje.toISOString().slice(0, 10);
  const dias = Math.round((d.getTime() - new Date(`${hojeIso}T12:00:00Z`).getTime()) / 86_400_000);
  const [, m, dia] = dataIso.slice(0, 10).split("-");
  if (dias === 0) return `hoje (${dia}/${m})`;
  if (dias === 1) return `amanhã (${dia}/${m})`;
  return `${DIA_DA_SEMANA[d.getUTCDay()]} (${dia}/${m})`;
}

const area = (s: string | null) => {
  const a = areaDoAlerta(s);
  return a ? NOME_AREA[a] : "Gabinete";
};

/** A parte que cabe a quem recebe: tudo, ou só a área do secretário. */
export function recortar(dados: DadosDaSemana, soArea: Area | null): DadosDaSemana {
  if (!soArea) return dados;
  const daArea = <T extends { secretaria: string | null }>(l: T[]) => l.filter((x) => areaDoAlerta(x.secretaria) === soArea);
  return { ...dados, abertos: daArea(dados.abertos), vencimentos: daArea(dados.vencimentos), resolvidos: daArea(dados.resolvidos) };
}

export function emailDaSegunda(
  dados: DadosDaSemana,
  hoje: Date,
  papel: "prefeito" | "admin" | "secretario",
  soArea: Area | null = null
): { assunto: string; html: string } | null {
  const d = recortar(dados, soArea);
  const urgentes = d.abertos.filter((a) => a.prioridade === "urgente");
  const medios = d.abertos.filter((a) => a.prioridade === "medio");
  const vencimentos = [...d.vencimentos].sort((a, b) => a.data.localeCompare(b.data));
  const vazio = !urgentes.length && !medios.length && !vencimentos.length && !d.resolvidos.length;
  // O secretário só recebe quando há o que dizer; o prefeito, toda semana.
  if (vazio && papel === "secretario") return null;

  const quem = soArea ? `${NOME_AREA[soArea]} de ${d.municipio}` : d.municipio;
  const titulo = papel === "secretario" ? "Segunda da secretaria" : "Segunda do prefeito";
  const assunto = urgentes.length
    ? `${titulo} · ${quem}: ${urgentes.length === 1 ? "1 decisão" : `${urgentes.length} decisões`} para esta semana`
    : vencimentos.length
      ? `${titulo} · ${quem}: ${vencimentos.length === 1 ? "1 prazo" : `${vencimentos.length} prazos`} nesta semana`
      : `${titulo} · ${quem}: semana sem pendência urgente`;

  const blocos: Bloco[] = [{ p: `Bom dia. Este é o resumo da semana de ${quem}, conferido pela vigia do CidadeIA hoje cedo.` }];

  if (urgentes.length) {
    blocos.push({ secao: papel === "secretario" ? "Precisa de ação" : "Precisa da sua decisão", tom: "urgente" });
    blocos.push({
      itens: urgentes.slice(0, 8).map((a) => ({ etiqueta: `Urgente · ${area(a.secretaria)}`, titulo: a.titulo, detalhe: a.descricao, tom: "urgente" as const })),
    });
    if (urgentes.length > 8) blocos.push({ p: `E mais ${urgentes.length - 8} no painel.` });
  } else {
    blocos.push({ destaque: `Nenhum alerta urgente em aberto${soArea ? ` em ${NOME_AREA[soArea]}` : ""}. A vigia conferiu tudo e segue de olho.`, titulo: "Nada urgente", tom: "ok" });
  }

  if (vencimentos.length) {
    blocos.push({ secao: "Vence nos próximos sete dias", tom: "atencao" });
    blocos.push({ itens: vencimentos.map((v) => ({ etiqueta: quando(v.data, hoje), titulo: v.texto, tom: "atencao" as const })) });
  }

  if (medios.length) {
    const porArea = new Map<string, number>();
    for (const a of medios) porArea.set(area(a.secretaria), (porArea.get(area(a.secretaria)) ?? 0) + 1);
    blocos.push({ secao: "Em acompanhamento" });
    blocos.push({
      p: `${medios.length === 1 ? "1 alerta pede atenção" : `${medios.length} alertas pedem atenção`}, sem urgência: ${[...porArea].map(([nome, n]) => `${nome} ${n}`).join(" · ")}.`,
    });
  }

  if (d.resolvidos.length) {
    const sozinhos = d.resolvidos.filter((r) => r.sozinho).length;
    const equipe = d.resolvidos.length - sozinhos;
    blocos.push({ secao: "Resolvido na semana passada", tom: "ok" });
    const frase = [
      sozinhos ? `${sozinhos === 1 ? "1 problema deixou" : `${sozinhos} problemas deixaram`} de existir e o alerta fechou sozinho` : "",
      equipe ? `${equipe === 1 ? "1 alerta foi fechado" : `${equipe} alertas foram fechados`} pela equipe` : "",
    ]
      .filter(Boolean)
      .join("; ");
    blocos.push({ p: `${frase}.` });
    blocos.push({ lista: d.resolvidos.slice(0, 6).map((r) => r.titulo) });
  }

  if (dados.comparacao && !soArea && papel !== "secretario") {
    blocos.push({ secao: "Entre as cidades parecidas" });
    blocos.push({ p: dados.comparacao });
  }

  blocos.push({ botao: "Abrir o painel", link: d.linkPainel });

  const html = montarEmail({
    remetente: { tipo: "cidadeia" },
    previa: urgentes.length
      ? `${urgentes[0].titulo}${urgentes.length > 1 ? ` e mais ${urgentes.length - 1}` : ""}.`
      : vencimentos.length
        ? `${quando(vencimentos[0].data, hoje)}: ${vencimentos[0].texto}`
        : "Semana sem pendência urgente. A vigia conferiu tudo.",
    etiqueta: { texto: `${titulo} · ${hojeCurto(hoje)}`, tom: urgentes.length ? "urgente" : "marca" },
    titulo: urgentes.length
      ? `${urgentes.length === 1 ? "1 decisão" : `${urgentes.length} decisões`} para esta semana`
      : vencimentos.length
        ? `${vencimentos.length === 1 ? "1 prazo" : `${vencimentos.length} prazos`} nesta semana`
        : "Semana sem pendência urgente",
    blocos,
    assinatura: null,
    motivo:
      papel === "secretario"
        ? "Toda segunda, quando há o que dizer sobre a sua secretaria. Os alertas do dia a dia continuam chegando na hora."
        : "Toda segunda cedo. Os alertas do dia a dia continuam chegando na hora em que aparecem.",
  });
  return { assunto, html };
}

function hojeCurto(hoje: Date): string {
  const [, m, d] = hoje.toISOString().slice(0, 10).split("-");
  return `${d}/${m}`;
}
