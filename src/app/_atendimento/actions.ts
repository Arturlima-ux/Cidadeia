"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/db";
import { leads, pedidoEventos } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { limitarUso } from "@/lib/rate-limit";
import { ehCodigoIbge, buscarMunicipioPorCodigo } from "@/lib/populacao-ibge";
import { CARGOS_LIGACAO, HORARIOS_LIGACAO, destinoDaEquipe, telefoneValido } from "@/lib/contato-comercial";
import { TIPOS_EVENTO_LEAD } from "@/lib/oportunidades";
import { caminhoDoRaioX } from "@/lib/slug-municipio";

// ── PEÇA UMA LIGAÇÃO ──
// Grava o interessado (leads, origem "ligacao") e o telefone na linha do
// tempo dele, e avisa a equipe na hora. Sem e-mail para a pessoa: ela pediu
// uma ligação, e a ligação é a resposta.

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  cargo: z.enum(CARGOS_LIGACAO, { message: "Escolha o seu cargo." }),
  telefone: z.string().trim().max(30),
  horario: z.enum(HORARIOS_LIGACAO).default("Qualquer horário"),
  codigoIbge: z.string().optional().nullable(),
  municipioTexto: z.string().trim().max(120).optional().nullable(),
  origem: z.string().trim().max(60).optional().nullable(),
});

export type ResultadoLigacao = { ok: true } | { ok: false; erro: string; campo?: string };

const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

export async function pedirLigacao(entrada: unknown): Promise<ResultadoLigacao> {
  const parsed = schema.safeParse(entrada);
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    return { ok: false, erro: p?.message ?? "Dados inválidos.", campo: String(p?.path?.[0] ?? "") };
  }
  const d = parsed.data;
  const telefone = telefoneValido(d.telefone);
  if (!telefone) return { ok: false, erro: "Telefone com DDD, por favor. Ex.: (86) 99999-0000.", campo: "telefone" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
  if (!(await limitarUso(`ligacao:${ip}`, 4, 60))) {
    return { ok: false, erro: "Já recebemos pedidos de ligação daqui há pouco. A equipe vai ligar." };
  }

  const municipio = d.codigoIbge && ehCodigoIbge(d.codigoIbge) ? await buscarMunicipioPorCodigo(d.codigoIbge) : null;
  const id = gerarId("lead");
  try {
    await db.insert(leads).values({
      id,
      origem: "ligacao",
      codigoIbge: municipio?.codigo ?? null,
      municipio: municipio?.nome ?? d.municipioTexto ?? null,
      uf: municipio?.uf ?? null,
      nome: d.nome,
      cargo: d.cargo,
      email: "",
    });
    await db.insert(pedidoEventos).values({
      id: gerarId("pev"),
      pedidoId: id,
      tipo: TIPOS_EVENTO_LEAD.telefone,
      descricao: JSON.stringify({ telefone, horario: d.horario, pagina: d.origem ?? null }),
      autor: "site",
    });
  } catch (e) {
    console.error("[ligacao] falha ao gravar:", e);
  }

  const base = process.env.APP_URL ?? "https://cidadeia.vercel.app";
  const linkTel = `tel:+55${telefone.replace(/\D/g, "")}`;
  const aviso = await enviarEmail({
    para: destinoDaEquipe(),
    assunto: `LIGAR: ${d.nome}, ${d.cargo}${municipio ? ` — ${municipio.nome}/${municipio.uf}` : d.municipioTexto ? ` — ${d.municipioTexto}` : ""}`,
    html: [
      `<p><strong>Pedido de ligação pelo site.</strong> Quem pede ligação espera ser atendido no mesmo dia.</p>`,
      `<p><strong>${escapar(d.nome)}</strong>, ${escapar(d.cargo)}<br/>`,
      `Telefone: <a href="${linkTel}">${telefone}</a> · ${escapar(d.horario)}<br/>`,
      municipio
        ? `Município: ${escapar(municipio.nome)}/${municipio.uf} (${new Intl.NumberFormat("pt-BR").format(municipio.populacao)} hab.) · <a href="${base}${caminhoDoRaioX(municipio)}">Raio-X</a>`
        : d.municipioTexto
        ? `Município informado: ${escapar(d.municipioTexto)}`
        : "Município não informado",
      `</p>`,
      d.origem ? `<p style="color:#888">Página: ${escapar(d.origem)}</p>` : "",
      `<p><a href="${base}/admin/interessados">Ver todos os interessados</a></p>`,
    ].join("\n"),
  });
  if (!aviso.enviado) console.error("[ligacao] aviso à equipe não saiu:", aviso.motivo, aviso.detalhe);

  return { ok: true };
}
