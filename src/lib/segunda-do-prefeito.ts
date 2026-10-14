import { areaDoAlerta, type Area } from "@/lib/alerta-por-area";

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

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
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

  const h2 = (t: string) => `<h3 style="margin:22px 0 8px;font-size:15px">${t}</h3>`;
  const partes: string[] = [`<p>Bom dia. O resumo da semana de ${esc(quem)}, conferido pela vigia do CidadeIA hoje cedo.</p>`];

  if (urgentes.length) {
    partes.push(h2(papel === "secretario" ? "Precisa de ação" : "Precisa da sua decisão"));
    partes.push(
      `<ul>${urgentes
        .slice(0, 8)
        .map((a) => `<li style="margin-bottom:8px"><strong>${esc(a.titulo)}</strong> <span style="color:#666">· ${area(a.secretaria)}</span>${a.descricao ? `<br><span style="color:#444">${esc(a.descricao)}</span>` : ""}</li>`)
        .join("")}</ul>`
    );
    if (urgentes.length > 8) partes.push(`<p>E mais ${urgentes.length - 8} no painel.</p>`);
  } else {
    partes.push(h2("Nada urgente"));
    partes.push(`<p>Nenhum alerta urgente em aberto${soArea ? ` em ${NOME_AREA[soArea]}` : ""}.</p>`);
  }

  if (vencimentos.length) {
    partes.push(h2("Vence nos próximos sete dias"));
    partes.push(`<ul>${vencimentos.map((v) => `<li><strong>${quando(v.data, hoje)}</strong>: ${esc(v.texto)}</li>`).join("")}</ul>`);
  }

  if (medios.length) {
    const porArea = new Map<string, number>();
    for (const a of medios) porArea.set(area(a.secretaria), (porArea.get(area(a.secretaria)) ?? 0) + 1);
    partes.push(h2("Em acompanhamento"));
    partes.push(
      `<p>${medios.length === 1 ? "1 alerta pede atenção" : `${medios.length} alertas pedem atenção`}, sem urgência: ${[...porArea]
        .map(([nome, n]) => `${nome} ${n}`)
        .join(" · ")}.</p>`
    );
  }

  if (d.resolvidos.length) {
    const sozinhos = d.resolvidos.filter((r) => r.sozinho).length;
    const equipe = d.resolvidos.length - sozinhos;
    partes.push(h2("Resolvido na semana passada"));
    const frase = [
      sozinhos ? `${sozinhos === 1 ? "1 problema deixou" : `${sozinhos} problemas deixaram`} de existir e o alerta fechou sozinho` : "",
      equipe ? `${equipe === 1 ? "1 alerta foi fechado" : `${equipe} alertas foram fechados`} pela equipe` : "",
    ]
      .filter(Boolean)
      .join("; ");
    partes.push(`<p>${frase}.</p>`);
    partes.push(`<ul>${d.resolvidos.slice(0, 6).map((r) => `<li style="color:#444">${esc(r.titulo)}</li>`).join("")}</ul>`);
  }

  partes.push(`<p style="margin-top:22px"><a href="${d.linkPainel}">Abrir o painel</a></p>`);
  partes.push(
    `<p style="color:#888;font-size:13px">${
      papel === "secretario"
        ? "Toda segunda, quando há o que dizer sobre a sua secretaria. Os alertas do dia a dia continuam chegando na hora."
        : "Toda segunda cedo. Os alertas do dia a dia continuam chegando na hora em que aparecem."
    }</p>`
  );
  return { assunto, html: partes.join("\n") };
}
