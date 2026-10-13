"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { leads, pedidoEventos } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { limitarUso } from "@/lib/rate-limit";
import { municipioPorCodigo } from "@/lib/municipios";
import { CARGOS_LEAD } from "@/lib/leads";
import { destinoDaEquipe } from "@/lib/contato-comercial";
import { EVENTO_AVISO_CANCELADO, ORIGEM_AVISO, chaveDoAviso, inscritoDaChave } from "@/lib/aviso-da-cidade";

// ── INSCREVER E CANCELAR O AVISO DA CIDADE ──
// Ver lib/aviso-da-cidade.ts. O primeiro aviso, com o retrato de hoje, sai
// na rotina diária da manhã seguinte; aqui vai só a confirmação.

const schema = z.object({
  codigoIbge: z.string().regex(/^\d{7}$/, "Município inválido."),
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  cargo: z.enum(CARGOS_LEAD, { message: "Escolha uma opção." }),
  email: z.string().trim().email("E-mail inválido.").max(160),
});

export type ResultadoAviso = { ok: true; jaInscrito: boolean } | { ok: false; erro: string; campo?: string };

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
const base = () => process.env.APP_URL ?? "https://cidadeia.vercel.app";

/** Grava a inscrição (sem duplicar) e manda a confirmação. Exportada para o Raio-X. */
export async function inscreverAvisoDaCidade(entrada: unknown): Promise<ResultadoAviso> {
  const parsed = schema.safeParse(entrada);
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, erro: p?.message ?? "Dados inválidos.", campo: String(p?.path?.[0] ?? "") };
  }
  const d = parsed.data;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
  if (!(await limitarUso(`aviso:${ip}`, 6, 60)) || !(await limitarUso(`aviso:${d.email.toLowerCase()}`, 6, 60))) {
    return { ok: false, erro: "Muitas inscrições seguidas. Tente de novo em uma hora." };
  }
  const m = municipioPorCodigo(d.codigoIbge);
  if (!m) return { ok: false, erro: "Município não encontrado.", campo: "codigoIbge" };

  // Já inscrito e ativo nesta cidade: não duplica, só confirma.
  const existentes = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.origem, ORIGEM_AVISO), eq(leads.codigoIbge, m.codigo), eq(leads.email, d.email.toLowerCase())));
  if (existentes.length) {
    const cancelados = await db
      .select({ id: pedidoEventos.pedidoId })
      .from(pedidoEventos)
      .where(and(inArray(pedidoEventos.pedidoId, existentes.map((x) => x.id)), eq(pedidoEventos.tipo, EVENTO_AVISO_CANCELADO)));
    if (existentes.some((x) => !cancelados.some((c) => c.id === x.id))) return { ok: true, jaInscrito: true };
  }

  const id = gerarId("lead");
  await db.insert(leads).values({
    id,
    origem: ORIGEM_AVISO,
    codigoIbge: m.codigo,
    municipio: m.nome,
    uf: m.uf,
    nome: d.nome,
    cargo: d.cargo,
    email: d.email.toLowerCase(),
  });

  const chave = chaveDoAviso(id);
  const confirmacao = await enviarEmail({
    para: d.email,
    responderPara: destinoDaEquipe(),
    assunto: `Aviso de ${m.nome}/${m.uf} ativado`,
    html: [
      `<p>Olá, ${esc(d.nome.split(" ")[0])}.</p>`,
      `<p>Pronto: você vai receber um e-mail quando um relatório fiscal de ${esc(m.nome)}/${m.uf} (RREO ou RGF) estiver a 7 dias do prazo sem entrega, vencer sem entrega ou for entregue no Tesouro Nacional.</p>`,
      `<p>O primeiro aviso, com a situação de hoje, chega amanhã de manhã.</p>`,
      chave ? `<p style="color:#888;font-size:13px"><a href="${base()}/aviso/cancelar/${chave}" style="color:#888">Parar de receber estes avisos</a>.</p>` : "",
    ].join("\n"),
  });
  if (confirmacao.enviado) await db.update(leads).set({ emailEnviado: true }).where(eq(leads.id, id));

  await enviarEmail({
    para: destinoDaEquipe(),
    assunto: `Aviso da cidade: ${m.nome}/${m.uf} — ${d.cargo}`,
    html: `<p><strong>${esc(d.nome)}</strong>, ${esc(d.cargo)} — ${esc(d.email)}</p><p>Inscreveu-se no aviso gratuito de ${esc(m.nome)}/${m.uf}. Está em <a href="${base()}/admin/interessados">Interessados</a>.</p>`,
  });
  return { ok: true, jaInscrito: false };
}

/** O botão da página "parar de receber". Só com a chave assinada. */
export async function cancelarAvisoDaCidade(chave: string): Promise<{ ok: boolean }> {
  const id = inscritoDaChave(chave);
  if (!id) return { ok: false };
  const [l] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, id), eq(leads.origem, ORIGEM_AVISO))).limit(1);
  if (!l) return { ok: false };
  await db.insert(pedidoEventos).values({
    id: gerarId("pev"),
    pedidoId: id,
    tipo: EVENTO_AVISO_CANCELADO,
    descricao: "Pediu para parar de receber o aviso da cidade",
    autor: "o próprio inscrito",
  });
  return { ok: true };
}
