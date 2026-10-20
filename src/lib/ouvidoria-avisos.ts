import { NOME_TIPO, type TipoAtendimento } from "@/lib/atendimento";
import { PRAZOS } from "@/lib/prazo-atendimento";
import { AREAS, areaDoAlerta, type Area, type Pessoa } from "@/lib/alerta-por-area";
import { h, montarEmail, paragrafosDe, saudacao } from "@/lib/email-modelo";
import { OPCOES_DE_AREA } from "@/lib/areas-da-ouvidoria";

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

export { OPCOES_DE_AREA };

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

// ── OS E-MAILS ── (o modelo visual está em lib/email-modelo.ts)
//
// Ao cidadão, quem fala é a ouvidoria da prefeitura: a marca no topo é a dela,
// e o remetente chega como "Prefeitura de X via CidadeIA". À equipe, o
// CidadeIA. Os e-mails da equipe levam só tipo, assunto e prazo; nome,
// contato e texto do cidadão ficam no painel, atrás de login.

const SETOR = "Ouvidoria";
/** O nome do remetente nos e-mails ao cidadão. */
export const remetenteDaPrefeitura = (municipio: string) => `Prefeitura de ${municipio} via CidadeIA`;
const daPrefeitura = (municipio: string) => ({ tipo: "prefeitura" as const, municipio, setor: SETOR });
const tipoMinusculo = (t: TipoAtendimento) => NOME_TIPO[t].toLowerCase();

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
    assunto: `${d.municipio}: ${tipoMinusculo(d.tipo)} nova no portal (${d.protocolo})`,
    html: montarEmail({
      remetente: { tipo: "cidadeia" },
      previa: `${NOME_TIPO[d.tipo]} sobre "${d.assunto}". Prazo legal até ${d.prazo.data}.`,
      etiqueta: { texto: `Ouvidoria · ${NOME_TIPO[d.tipo]}`, tom: d.tipo === "denuncia" ? "urgente" : "marca" },
      titulo: `Nova manifestação no portal de ${d.municipio}`,
      blocos: [
        { p: "Um cidadão registrou uma manifestação pelo portal da prefeitura. O prazo legal começou a contar hoje." },
        {
          dados: [
            ["Assunto", d.assunto],
            ["Tipo", `${NOME_TIPO[d.tipo]}${d.anonimo ? " (anônima)" : ""}`],
            ["Área", nomeArea ?? "Gabinete"],
            ["Protocolo", d.protocolo],
            ["Responder até", `${d.prazo.data} (${d.prazo.dias} dias)`],
          ],
        },
        { botao: "Ler e responder no painel", link: d.linkPainel },
        { p: "O CidadeIA avisa de novo se o prazo estiver perto de vencer sem resposta." },
        { nota: "Por segurança, o texto da manifestação e os dados de contato do cidadão ficam só no painel, atrás de login: e-mail pode ser encaminhado." },
      ],
      assinatura: null,
      motivo: "Você recebe este aviso porque responde pelas manifestações desta área no painel do CidadeIA.",
    }),
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
}): { assunto: string; html: string; remetente: string } {
  return {
    assunto: `Recebemos sua manifestação, protocolo ${d.protocolo}`,
    remetente: remetenteDaPrefeitura(d.municipio),
    html: montarEmail({
      remetente: daPrefeitura(d.municipio),
      previa: `Protocolo ${d.protocolo}. A resposta chega até ${d.prazo.data}, neste e-mail.`,
      etiqueta: { texto: "Manifestação registrada", tom: "ok" },
      titulo: "Recebemos sua manifestação",
      saudacao: saudacao(d.nome),
      blocos: [
        { p: h`Obrigado por falar com a Prefeitura de ${d.municipio}. Sua ${tipoMinusculo(d.tipo)} sobre “<strong>${d.assunto}</strong>” foi registrada e encaminhada à equipe responsável.` },
        {
          dados: [
            ["Protocolo", d.protocolo],
            ["Chave de consulta", d.chave],
            ["Prazo de resposta", h`até ${d.prazo.data}`],
          ],
        },
        { p: h`Pela ${PRAZOS[d.tipo].lei}, a prefeitura tem ${d.prazo.dias} dias para responder. A resposta chega neste e-mail, e você pode acompanhar o andamento a qualquer momento.` },
        { botao: "Acompanhar minha manifestação", link: d.linkConsulta },
        { destaque: "Guarde o protocolo e a chave de consulta. Com os dois, só você acompanha o andamento.", tom: "neutro" },
      ],
      motivo: "Você recebe este e-mail porque informou este endereço ao registrar uma manifestação no portal da prefeitura.",
    }),
  };
}

export function emailRespostaParaCidadao(d: {
  municipio: string;
  nome: string | null;
  protocolo: string;
  status: "em_analise" | "respondido" | "encerrado";
  resposta: string;
  linkConsulta: string;
}): { assunto: string; html: string; remetente: string } {
  const analise = d.status === "em_analise";
  const titulo = analise
    ? "Sua manifestação está em análise"
    : d.status === "encerrado"
      ? "Sua manifestação foi respondida e encerrada"
      : "Sua manifestação foi respondida";
  return {
    assunto: `${titulo}, protocolo ${d.protocolo}`,
    remetente: remetenteDaPrefeitura(d.municipio),
    html: montarEmail({
      remetente: daPrefeitura(d.municipio),
      previa: analise ? `A prefeitura registrou um andamento no protocolo ${d.protocolo}.` : `A resposta da prefeitura ao protocolo ${d.protocolo} está neste e-mail.`,
      etiqueta: { texto: `Protocolo ${d.protocolo}`, tom: analise ? "atencao" : "ok" },
      titulo,
      saudacao: saudacao(d.nome),
      blocos: [
        { p: analise ? "A prefeitura registrou um andamento na sua manifestação:" : "A prefeitura respondeu à sua manifestação:" },
        { citacao: paragrafosDe(d.resposta), rotulo: analise ? "Andamento" : "Resposta da prefeitura" },
        analise
          ? { botao: "Ver a manifestação completa", link: d.linkConsulta }
          : { destaque: "Conte em um toque: resolveu, resolveu em parte ou não resolveu. Sua avaliação vai direto a quem respondeu e ajuda a melhorar o atendimento.", titulo: "A resposta resolveu?", tom: "marca" },
        !analise && { botao: "Avaliar a resposta", link: d.linkConsulta },
      ],
      motivo: "Você recebe este e-mail porque registrou uma manifestação no portal da prefeitura e informou este endereço.",
    }),
  };
}

/**
 * O cidadão disse que a resposta não resolveu (ou resolveu em parte). Vai a
 * quem recebeu a manifestação. Como os outros e-mails da equipe, não leva o
 * texto do cidadão: o comentário fica no painel, atrás de login.
 */
export function emailAvaliacaoParaEquipe(d: {
  municipio: string;
  protocolo: string;
  tipo: TipoAtendimento;
  assunto: string;
  nota: "parte" | "nao";
  comComentario: boolean;
  linkPainel: string;
}): { assunto: string; html: string } {
  const disse = d.nota === "nao" ? "não resolveu" : "resolveu só em parte";
  return {
    assunto: `${d.municipio}: o cidadão disse que a resposta ${disse} (${d.protocolo})`,
    html: montarEmail({
      remetente: { tipo: "cidadeia" },
      previa: `Protocolo ${d.protocolo}: vale complementar a resposta.`,
      etiqueta: { texto: "Avaliação do cidadão", tom: d.nota === "nao" ? "urgente" : "atencao" },
      titulo: `O cidadão disse que a resposta ${disse}`,
      blocos: [
        {
          dados: [
            ["Assunto", d.assunto],
            ["Tipo", NOME_TIPO[d.tipo]],
            ["Protocolo", d.protocolo],
          ],
        },
        { p: `${d.comComentario ? "Ele deixou um comentário explicando o que faltou." : "Ele não deixou comentário."} Vale complementar a resposta: o cidadão pode avaliar de novo, e a satisfação aparece no portal público.` },
        { botao: "Ver no painel", link: d.linkPainel },
        { nota: "O comentário e os dados de contato do cidadão ficam só no painel, atrás de login." },
      ],
      assinatura: null,
      motivo: "Você recebe este aviso porque respondeu a esta manifestação no painel do CidadeIA.",
    }),
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
}): { assunto: string; html: string; remetente: string } {
  return {
    assunto: `Prazo de resposta prorrogado, protocolo ${d.protocolo}`,
    remetente: remetenteDaPrefeitura(d.municipio),
    html: montarEmail({
      remetente: daPrefeitura(d.municipio),
      previa: `Nova data de resposta: ${d.novoPrazo}. A justificativa está neste e-mail.`,
      etiqueta: { texto: `Protocolo ${d.protocolo}`, tom: "atencao" },
      titulo: "O prazo de resposta foi prorrogado",
      saudacao: saudacao(d.nome),
      blocos: [
        { p: h`A prefeitura precisou de mais tempo para responder à sua manifestação. O prazo foi prorrogado por ${d.diasExtras} dias, até <strong>${d.novoPrazo}</strong>, como permite a ${d.lei}.` },
        { citacao: paragrafosDe(d.justificativa), rotulo: "Justificativa da prefeitura" },
        { botao: "Acompanhar minha manifestação", link: d.linkConsulta },
      ],
      motivo: "Você recebe este e-mail porque registrou uma manifestação no portal da prefeitura e informou este endereço.",
    }),
  };
}
