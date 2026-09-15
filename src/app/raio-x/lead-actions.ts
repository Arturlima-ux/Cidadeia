"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { limitarUso } from "@/lib/rate-limit";
import { ehCodigoIbge, buscarMunicipioPorCodigo } from "@/lib/populacao-ibge";
import { montarRaioX } from "@/lib/raio-x";
import { resumoDoRaioX } from "@/lib/raio-x-texto";
import { caminhoDoRaioX } from "@/lib/slug-municipio";
import { CARGOS_LEAD } from "@/lib/leads";

// ── O LEAD DO RAIO-X ──
//
// "Receba este Raio-X por e-mail, com a leitura de cada número." Grava o
// lead, tenta enviar para a pessoa, e avisa a equipe com o Raio-X e os
// dados de quem pediu.
//
// ── HONESTIDADE NO RESULTADO ──
// Enquanto o Resend estiver no plano gratuito (entrega só para o dono da
// conta), o e-mail para o lead é recusado. A tela NÃO diz "enviado" nesse
// caso: diz "recebido — chega em até um dia útil", e a equipe encaminha à
// mão a partir do aviso. Com domínio próprio, o mesmo código passa a
// entregar sozinho, e a tela passa a dizer "enviado" — sem mudar nada.

const DESTINO_EQUIPE_PADRAO = "arturmlo2005@gmail.com";

const schema = z.object({
  codigoIbge: z.string().refine(ehCodigoIbge, "Município inválido."),
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  cargo: z.enum(CARGOS_LEAD, { message: "Escolha uma opção." }),
  email: z.string().trim().email("E-mail inválido.").max(160),
});

export type ResultadoLead = { ok: true; enviadoParaVoce: boolean } | { ok: false; erro: string; campo?: string };

function escapar(t: string): string {
  return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

export async function registrarLeadRaioX(entrada: unknown): Promise<ResultadoLead> {
  const parsed = schema.safeParse(entrada);
  if (!parsed.success) {
    const primeiro = parsed.error.issues[0];
    return { ok: false, erro: primeiro?.message ?? "Dados inválidos.", campo: String(primeiro?.path?.[0] ?? "") };
  }
  const dados = parsed.data;

  if (!(await limitarUso(`lead:${dados.email.toLowerCase()}`, 5, 60))) {
    return { ok: false, erro: "Já recebemos pedidos deste e-mail há pouco. Tente de novo em uma hora." };
  }

  const municipio = await buscarMunicipioPorCodigo(dados.codigoIbge);
  if (!municipio) return { ok: false, erro: "Município não encontrado." };

  const id = gerarId("lead");

  // 1) grava — é o registro que vale, mesmo que nenhum e-mail saia
  let gravado = false;
  try {
    await db.insert(leads).values({
      id,
      origem: "raio-x",
      codigoIbge: municipio.codigo,
      municipio: municipio.nome,
      uf: municipio.uf,
      nome: dados.nome,
      cargo: dados.cargo,
      email: dados.email,
    });
    gravado = true;
  } catch (e) {
    console.error("[lead] falha ao gravar:", e);
  }

  // 2) o Raio-X em texto (o mesmo que a página mostra)
  let corpo: string;
  try {
    const r = await montarRaioX(municipio.nome, municipio.uf);
    corpo = r.ok
      ? resumoDoRaioX(r.raioX).map((l) => `<p>${escapar(l)}</p>`).join("\n")
      : `<p>${escapar(r.erro)}</p>`;
  } catch {
    corpo = "<p>O Tesouro Nacional não respondeu no momento do envio. Os números estão na página do município.</p>";
  }
  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";
  const link = `${base}${caminhoDoRaioX(municipio)}`;

  // 3) para a pessoa
  const paraVoce = await enviarEmail({
    para: dados.email,
    assunto: `Raio-X da Prefeitura de ${municipio.nome}/${municipio.uf} — o que o Tesouro já publicou`,
    html: [
      `<p>Olá, ${escapar(dados.nome)}.</p>`,
      `<p>Aqui está o Raio-X de ${escapar(municipio.nome)}/${municipio.uf}, com a leitura de cada número:</p>`,
      corpo,
      `<p>A página fica em <a href="${link}">${link}</a> e é refeita toda semana com o que o Tesouro publicar.</p>`,
      `<p>O que não aparece em base pública — obra parada, prazo de ouvidoria, dispensa virando fracionamento — é o que o CidadeIA acompanha por dentro. Se quiser ver o painel funcionando: <a href="${base}/demo">${base}/demo</a>.</p>`,
      `<p style="color:#888">CidadeIA · dado público do SICONFI e do IBGE. Os percentuais da receita são indício, não cálculo de mínimo constitucional.</p>`,
    ].join("\n"),
  });

  // 4) para a equipe — sempre, com os dados de quem pediu
  await enviarEmail({
    para: process.env.PROPOSTA_DESTINO_EMAIL?.trim() || DESTINO_EQUIPE_PADRAO,
    assunto: `Lead do Raio-X — ${municipio.nome}/${municipio.uf} — ${dados.cargo}`,
    html: [
      `<p><strong>${escapar(dados.nome)}</strong>, ${escapar(dados.cargo)} — ${escapar(dados.email)}</p>`,
      `<p>Município: ${escapar(municipio.nome)}/${municipio.uf} (${new Intl.NumberFormat("pt-BR").format(municipio.populacao)} hab.) — <a href="${link}">página</a></p>`,
      `<p>E-mail para a pessoa: ${paraVoce.enviado ? "enviado" : "<strong>NÃO enviado</strong> (" + escapar(paraVoce.motivo) + ") — encaminhar à mão."}</p>`,
      `<hr/>`,
      corpo,
      gravado ? "" : `<p style="color:#b00">Não gravado no banco (tabela leads ausente?).</p>`,
    ].join("\n"),
  });

  if (paraVoce.enviado && gravado) {
    try {
      await db.update(leads).set({ emailEnviado: true }).where(eq(leads.id, id));
    } catch {
      /* secundário */
    }
  }

  return { ok: true, enviadoParaVoce: paraVoce.enviado };
}
