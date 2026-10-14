import { NOME_TIPO, type TipoAtendimento } from "@/lib/atendimento";
import { PRAZOS } from "@/lib/prazo-atendimento";
import { AREAS, areaDoAlerta, type Area, type Pessoa } from "@/lib/alerta-por-area";

// ── A OUVIDORIA QUE AVISA ──
//
// O protocolo chegava em silêncio: o cidadão registrava, anotava um número e
// mais ninguém ficava sabendo até alguém abrir o painel. É assim que o prazo
// legal (20 dias na LAI, 30 na Lei 13.460) vence sem que ninguém tenha lido.
// Agora:
//
//   - quem resolve recebe um e-mail quando a manifestação chega;
//   - o cidadão recebe a confirmação, com o protocolo, a chave e o prazo;
//   - o cidadão recebe a resposta no e-mail, sem precisar voltar ao portal;
//   - a prorrogação sai com a justificativa por escrito, que é o que a LAI
//     (art. 11, § 2º) e a Lei 13.460 (art. 16) exigem.
//
// ── QUEM RECEBE A MANIFESTAÇÃO NOVA ──
//
// O secretário da área escolhida pelo cidadão e o administrador. Denúncia
// nunca vai ao secretário da área: ela pode ser sobre a própria secretaria,
// e quem decide o encaminhamento é o gabinete. Sem secretário com e-mail na
// área, vai ao prefeito: manifestação sem destinatário é prazo perdido.
//
// O e-mail da equipe leva só o tipo, o assunto e o prazo. Nome, contato e o
// texto do cidadão ficam no painel, atrás de login: e-mail se encaminha.

export const OPCOES_DE_AREA: { valor: Area; nome: string }[] = [
  { valor: "saude", nome: "Saúde" },
  { valor: "educacao", nome: "Educação" },
  { valor: "obras", nome: "Obras e serviços urbanos" },
  { valor: "licitacoes", nome: "Compras e contratos" },
];

export const EVENTO_PRORROGACAO = "prazo_prorrogado";

/** Só aceita uma área conhecida; o resto vira "sem área" (gabinete). */
export function areaDaManifestacao(valor: string | null | undefined): Area | null {
  return valor && (AREAS as readonly string[]).includes(valor) ? (valor as Area) : null;
}

/** Quem vê a manifestação no painel: o gabinete, todas; o secretário, as da área dele, sem denúncia. */
export function podeVerManifestacao(
  sessao: { cargo: string; secretaria?: string | null },
  m: { tipo: string; secretaria: string | null }
): boolean {
  if (sessao.cargo === "prefeito" || sessao.cargo === "admin") return true;
  if (sessao.cargo !== "secretario" || !sessao.secretaria) return false;
  if (m.tipo === "denuncia") return false;
  return areaDoAlerta(m.secretaria) === sessao.secretaria;
}

export function destinatariosDaManifestacao(m: { tipo: string; secretaria: string | null }, pessoas: Pessoa[]): string[] {
  const com = pessoas.filter((p): p is Pessoa & { email: string } => !!p.email);
  const area = m.tipo === "denuncia" ? null : areaDoAlerta(m.secretaria);
  const secretarios = area ? com.filter((p) => p.cargo === "secretario" && p.secretaria === area) : [];
  const admins = com.filter((p) => p.cargo === "admin");
  const prefeitos = com.filter((p) => p.cargo === "prefeito");
  const lista = [...secretarios, ...admins];
  // Sem ninguém da área, a denúncia, ou o gabinete sem administrador: prefeito.
  if (!secretarios.length) lista.push(...prefeitos);
  return [...new Set(lista.map((p) => p.email))];
}

/** Data limite de resposta, no formato dd/mm/aaaa. */
export function prazoDeResposta(tipo: TipoAtendimento, abertoEm: Date, prorrogado = false): { dias: number; data: string } {
  const p = PRAZOS[tipo];
  const dias = p.dias + (prorrogado ? p.prorrogacao ?? 0 : 0);
  const d = new Date(abertoEm.getTime() + dias * 86_400_000);
  return { dias, data: d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) };
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
const paragrafos = (t: string) =>
  t
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

export function emailChegouParaEquipe(d: {
  municipio: string;
  protocolo: string;
  tipo: TipoAtendimento;
  assunto: string;
  area: Area | null;
  anonimo: boolean;
  prazo: { dias: number; data: string };
  linkPainel: string;
}): { assunto: string; html: string } {
  const nomeArea = OPCOES_DE_AREA.find((o) => o.valor === d.area)?.nome;
  return {
    assunto: `${d.municipio}: ${NOME_TIPO[d.tipo].toLowerCase()} nova no portal (${d.protocolo})`,
    html: [
      `<p><strong>Chegou uma manifestação pelo portal de ${esc(d.municipio)}.</strong></p>`,
      `<p>${esc(NOME_TIPO[d.tipo])}${nomeArea ? ` · ${esc(nomeArea)}` : ""}${d.anonimo ? " · anônima" : ""}<br>`,
      `Assunto: <strong>${esc(d.assunto)}</strong><br>`,
      `Protocolo ${esc(d.protocolo)}</p>`,
      `<p>Prazo legal de resposta: <strong>${d.prazo.dias} dias, até ${d.prazo.data}</strong>. O CidadeIA avisa de novo se ele estiver perto de vencer.</p>`,
      `<p><a href="${d.linkPainel}">Ler e responder no painel</a></p>`,
      `<p style="color:#888;font-size:13px">O texto e os dados de contato do cidadão ficam só no painel, atrás de login.</p>`,
    ].join("\n"),
  };
}

export function emailRecebidoParaCidadao(d: {
  municipio: string;
  nome: string | null;
  protocolo: string;
  chave: string;
  tipo: TipoAtendimento;
  assunto: string;
  prazo: { dias: number; data: string };
  linkConsulta: string;
}): { assunto: string; html: string } {
  const ola = d.nome ? `Olá, ${esc(d.nome.split(" ")[0])}.` : "Olá.";
  return {
    assunto: `Prefeitura de ${d.municipio}: recebemos sua manifestação (${d.protocolo})`,
    html: [
      `<p>${ola}</p>`,
      `<p>A Prefeitura de ${esc(d.municipio)} recebeu sua manifestação: <strong>${esc(d.assunto)}</strong> (${esc(NOME_TIPO[d.tipo].toLowerCase())}).</p>`,
      `<p>Protocolo: <strong>${esc(d.protocolo)}</strong><br>Chave de consulta: <strong>${esc(d.chave)}</strong></p>`,
      `<p>O prazo legal de resposta é de ${d.prazo.dias} dias, até <strong>${d.prazo.data}</strong> (${esc(PRAZOS[d.tipo].lei)}). A resposta chega neste e-mail.</p>`,
      `<p><a href="${d.linkConsulta}">Acompanhar a manifestação</a></p>`,
      `<p style="color:#888;font-size:13px">Guarde o protocolo e a chave: com os dois, só você consulta o andamento.</p>`,
    ].join("\n"),
  };
}

export function emailRespostaParaCidadao(d: {
  municipio: string;
  nome: string | null;
  protocolo: string;
  status: "em_analise" | "respondido" | "encerrado";
  resposta: string;
  linkConsulta: string;
}): { assunto: string; html: string } {
  const ola = d.nome ? `Olá, ${esc(d.nome.split(" ")[0])}.` : "Olá.";
  const titulo =
    d.status === "em_analise"
      ? "sua manifestação está em análise"
      : d.status === "encerrado"
        ? "sua manifestação foi respondida e encerrada"
        : "sua manifestação foi respondida";
  return {
    assunto: `Prefeitura de ${d.municipio}: ${titulo} (${d.protocolo})`,
    html: [
      `<p>${ola}</p>`,
      `<p>A Prefeitura de ${esc(d.municipio)} ${d.status === "em_analise" ? "registrou um andamento na" : "respondeu à"} manifestação de protocolo <strong>${esc(d.protocolo)}</strong>:</p>`,
      `<div style="border-left:3px solid #ccc;padding-left:12px;margin:12px 0">${paragrafos(d.resposta)}</div>`,
      `<p><a href="${d.linkConsulta}">Ver a manifestação completa</a></p>`,
    ].join("\n"),
  };
}

export function emailProrrogacaoParaCidadao(d: {
  municipio: string;
  nome: string | null;
  protocolo: string;
  diasExtras: number;
  novoPrazo: string;
  justificativa: string;
  lei: string;
  linkConsulta: string;
}): { assunto: string; html: string } {
  const ola = d.nome ? `Olá, ${esc(d.nome.split(" ")[0])}.` : "Olá.";
  return {
    assunto: `Prefeitura de ${d.municipio}: prazo de resposta prorrogado (${d.protocolo})`,
    html: [
      `<p>${ola}</p>`,
      `<p>O prazo de resposta da sua manifestação (protocolo <strong>${esc(d.protocolo)}</strong>) foi prorrogado por ${d.diasExtras} dias, até <strong>${d.novoPrazo}</strong>, como permite a ${esc(d.lei)}.</p>`,
      `<p>Justificativa da prefeitura:</p>`,
      `<div style="border-left:3px solid #ccc;padding-left:12px;margin:12px 0">${paragrafos(d.justificativa)}</div>`,
      `<p><a href="${d.linkConsulta}">Acompanhar a manifestação</a></p>`,
    ].join("\n"),
  };
}
