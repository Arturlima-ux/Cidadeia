import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pedidoEventos, pedidosProposta } from "@/db/schema";
import { h, montarEmail } from "@/lib/email-modelo";
import { enviarEmail } from "@/lib/email";
import { destinoDaEquipe } from "@/lib/contato-comercial";
import { registrarPasso } from "@/lib/cobranca-servidor";

// ── A PREFEITURA ABRIU A PROPOSTA: É A HORA DE LIGAR ──
//
// A proposta segue em PDF anexo, e um anexo não avisa quando é aberto. Por
// isso o e-mail da proposta passa a ter três links rastreáveis (a proposta
// online, o kit e o acompanhamento), todos por /proposta/ver/<chave>. Quando
// alguém da prefeitura clica, a linha do tempo do pedido registra, e a equipe
// recebe na hora: "Picos/PI abriu a proposta agora". É o momento em que a
// proposta está na mesa de alguém.
//
// A chave é o id do pedido assinado com o segredo do sistema: ninguém chega
// à proposta de outra prefeitura mudando um número no endereço, e não é
// preciso coluna nova no banco.
//
// ── O ROBÔ DO E-MAIL NÃO CONTA ──
//
// Outlook e Gmail de órgão público costumam "clicar" em todo link para
// conferir se é seguro, segundos depois da entrega. Contar isso faria a
// equipe ligar para quem nem viu o e-mail. Ficam de fora: navegador com cara
// de robô e qualquer abertura nos primeiros dois minutos depois do envio.

export const TIPO_ABERTURA = "proposta_aberta_pelo_cliente";
export const DESTINOS_RASTREADOS = ["proposta", "kit", "acompanhar"] as const;
export type DestinoRastreado = (typeof DESTINOS_RASTREADOS)[number];

const ROTULO_DESTINO: Record<DestinoRastreado, string> = {
  proposta: "abriu a proposta",
  kit: "abriu o kit de contratação",
  acompanhar: "foi acompanhar o pedido",
};

function segredo(): string | null {
  return process.env.AUTH_SECRET?.trim() || null;
}

function assinatura(pedidoId: string, chave: string): string {
  return createHmac("sha256", chave).update(`proposta:${pedidoId}`).digest("base64url").slice(0, 22);
}

/** A chave do endereço rastreável de um pedido, ou null sem segredo configurado. */
export function chaveDaProposta(pedidoId: string, chave = segredo()): string | null {
  return chave ? `${pedidoId}.${assinatura(pedidoId, chave)}` : null;
}

/** O id do pedido, se a chave for legítima. */
export function pedidoDaChave(valor: string, chave = segredo()): string | null {
  if (!chave) return null;
  const m = /^(prop_[A-Za-z0-9_-]{4,64})\.([A-Za-z0-9_-]{22})$/.exec(valor);
  if (!m) return null;
  const esperado = Buffer.from(assinatura(m[1], chave));
  const recebido = Buffer.from(m[2]);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido) ? m[1] : null;
}

/** O link rastreável para um dos três destinos, ou o link comum quando não dá para assinar. */
export function linkRastreavel(base: string, pedidoId: string, destino: DestinoRastreado, protocoloDoPedido: string): string {
  const chave = chaveDaProposta(pedidoId);
  if (!chave) {
    if (destino === "kit") return `${base}/kit`;
    if (destino === "acompanhar") return `${base}/proposta/acompanhar?protocolo=${protocoloDoPedido}`;
    return `${base}/proposta/acompanhar?protocolo=${protocoloDoPedido}`;
  }
  return `${base}/proposta/ver/${chave}${destino === "proposta" ? "" : `?ir=${destino}`}`;
}

const ROBO = /bot|crawl|spider|preview|scan|safelink|proofpoint|mimecast|barracuda|python|curl|wget|go-http|java\/|headless|okhttp|axios|node-fetch/i;

export function pareceRobo(navegador: string | null): boolean {
  return !navegador || ROBO.test(navegador);
}

/** Abertura nos primeiros 2 minutos depois do envio: é o filtro do e-mail, não gente. */
export function cedoDemais(enviadaEm: string | null, agora: number): boolean {
  return !!enviadaEm && agora - Date.parse(enviadaEm) < 120_000;
}

/**
 * Registra a abertura na linha do tempo do pedido e avisa a equipe, no
 * máximo uma vez a cada 12 horas por pedido (quem abre o PDF, depois o kit,
 * depois volta ao PDF não vira três e-mails).
 */
export async function registrarAbertura(pedidoId: string, destino: DestinoRastreado, navegador: string | null, agora = Date.now()) {
  if (pareceRobo(navegador)) return;
  const [pedido] = await db.select().from(pedidosProposta).where(eq(pedidosProposta.id, pedidoId)).limit(1);
  if (!pedido) return;

  const anteriores = await db
    .select({ tipo: pedidoEventos.tipo, criadoEm: pedidoEventos.criadoEm })
    .from(pedidoEventos)
    .where(and(eq(pedidoEventos.pedidoId, pedidoId), inArray(pedidoEventos.tipo, ["proposta_enviada", "proposta_reenviada", TIPO_ABERTURA])))
    .orderBy(desc(pedidoEventos.criadoEm));
  const ultimoEnvio = anteriores.find((e) => e.tipo !== TIPO_ABERTURA)?.criadoEm ?? null;
  if (cedoDemais(ultimoEnvio, agora)) return;
  const ultimaAbertura = anteriores.find((e) => e.tipo === TIPO_ABERTURA)?.criadoEm ?? null;
  const primeiraVez = !ultimaAbertura;

  await registrarPasso(pedidoId, TIPO_ABERTURA, `A prefeitura ${ROTULO_DESTINO[destino]}`, "rastreio do e-mail");

  if (ultimaAbertura && agora - Date.parse(ultimaAbertura) < 12 * 3_600_000) return;
  const cidade = `${pedido.municipio}/${pedido.uf}`;
  const linkTel = pedido.telefone ? `tel:+55${pedido.telefone.replace(/\D/g, "")}` : null;
  const base = process.env.APP_URL ?? "https://cidadeia.vercel.app";
  await enviarEmail({
    para: destinoDaEquipe(),
    assunto: `${primeiraVez ? "ABRIU" : "VOLTOU À"} A PROPOSTA: ${cidade}. Hora de ligar`,
    html: montarEmail({
      remetente: { tipo: "equipe" },
      previa: `${pedido.nome} ${ROTULO_DESTINO[destino]} agora. Uma ligação curta vale mais que qualquer lembrete.`,
      etiqueta: { texto: primeiraVez ? "Abriu a proposta" : "Voltou à proposta", tom: "urgente" },
      titulo: `${cidade} ${ROTULO_DESTINO[destino]} ${primeiraVez ? "pela primeira vez" : "de novo"}`,
      blocos: [
        { p: "A proposta está na mesa de alguém neste momento. Uma ligação curta agora (\"chegou certinho? posso ajudar com o processo?\") vale mais que qualquer lembrete." },
        {
          dados: [
            ["Contato", `${pedido.nome}${pedido.cargo ? `, ${pedido.cargo}` : ""}`],
            ["Telefone", linkTel ? h`<a href="${linkTel}">${pedido.telefone}</a>` : "sem telefone no pedido"],
            ["E-mail", h`<a href="mailto:${pedido.email}">${pedido.email}</a>`],
          ],
        },
        linkTel
          ? { botao: `Ligar agora: ${pedido.telefone}`, link: linkTel, depois: { texto: "Abrir a mesa de pedidos", link: `${base}/admin/pedidos` } }
          : { botao: "Abrir a mesa de pedidos", link: `${base}/admin/pedidos` },
      ],
      assinatura: null,
      motivo: "Aviso interno: no máximo um por pedido a cada 12 horas.",
    }),
  });
}
