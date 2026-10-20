"use server";

import { auditar } from "@/lib/auditoria";
import { z } from "zod";
import { db } from "@/db";
import { atendimentos, configPublica, pedidoEventos, prefeituras } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { EVENTO_PRORROGACAO, areaDaManifestacao, podeVerManifestacao } from "@/lib/ouvidoria-avisos";
import { limitarUso } from "@/lib/rate-limit";
import { buscar, type ItemDaCidade } from "@/lib/pergunte-a-cidade";
import { indiceDaPrefeitura } from "@/lib/rascunho-resposta-servidor";
import { rascunhoDeResposta, SISTEMA_RASCUNHO } from "@/lib/rascunho-resposta";
import { provedorIA } from "@/lib/provedor-ia";
import type { TipoAtendimento } from "@/lib/atendimento";
import { avisarProrrogacao, avisarResposta } from "@/lib/ouvidoria-avisos-servidor";
import { and, desc, eq } from "drizzle-orm";
import { lerSessao , ehGestor } from "@/lib/sessao";
import { slugLivre } from "@/lib/endereco-publico";
import { revalidatePath } from "next/cache";

async function exigirAcesso() {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  return sessao;
}

export async function buscarAtendimentos(prefeituraId: string) {
  const sessao = await lerSessao();
  if (!sessao || sessao.prefeituraId !== prefeituraId) return [];
  const lista = await db
    .select()
    .from(atendimentos)
    .where(eq(atendimentos.prefeituraId, prefeituraId))
    .orderBy(desc(atendimentos.createdAt));
  // O secretário lê só o que é da área dele, e nunca denúncia: ela pode ser
  // sobre a própria secretaria (lib/ouvidoria-avisos.ts).
  return lista.filter((a) => podeVerManifestacao(sessao, a));
}

/** A manifestação, se quem pede pode mexer nela. */
async function manifestacaoAcessivel(sessao: { prefeituraId: string; cargo: string; secretaria?: string | null }, id: string) {
  const [m] = await db
    .select({ tipo: atendimentos.tipo, secretaria: atendimentos.secretaria })
    .from(atendimentos)
    .where(and(eq(atendimentos.id, id), eq(atendimentos.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  return m && podeVerManifestacao(sessao, m) ? m : null;
}

export async function buscarConfigPublica(prefeituraId: string) {
  const sessao = await lerSessao();
  if (!sessao || sessao.prefeituraId !== prefeituraId) return null;
  const [linha] = await db
    .select()
    .from(configPublica)
    .where(eq(configPublica.prefeituraId, prefeituraId))
    .limit(1);
  return linha ?? null;
}

export type ResultadoAcao = { ok: true; aviso?: string } | { ok: false; erro: string };

const schemaResposta = z.object({
  id: z.string().min(1),
  resposta: z.string().min(10, "Escreva uma resposta com pelo menos 10 caracteres.").max(5000),
  status: z.enum(["em_analise", "respondido", "encerrado"]),
});

export async function responderAtendimento(formData: FormData): Promise<ResultadoAcao> {
  let sessao;
  try {
    sessao = await exigirAcesso();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  const parsed = schemaResposta.safeParse({
    id: formData.get("id"),
    resposta: formData.get("resposta"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (!(await manifestacaoAcessivel(sessao, parsed.data.id))) {
    return { ok: false, erro: "Manifestação não encontrada." };
  }

  // O filtro por prefeitura impede responder manifestação de outro município.
  await db
    .update(atendimentos)
    .set({
      resposta: parsed.data.resposta.trim(),
      status: parsed.data.status,
      respondidoEm: new Date().toISOString(),
    })
    .where(
      and(
        eq(atendimentos.id, parsed.data.id),
        eq(atendimentos.prefeituraId, sessao.prefeituraId)
      )
    );

  await auditar(sessao, { acao: "responder", entidade: "atendimento", entidadeId: parsed.data.id, resumo: `status ${parsed.data.status}` });
  const avisado = await avisarResposta(parsed.data.id);
  revalidatePath("/dashboard/atendimento");
  return {
    ok: true,
    aviso: avisado
      ? "Salvo. O cidadão recebeu a resposta por e-mail."
      : "Salvo. O cidadão não deixou e-mail (ou o envio falhou): ele vê a resposta ao consultar o protocolo. Se deixou telefone, vale ligar.",
  };
}

/**
 * Registra a prorrogação formal do prazo de resposta.
 *
 * A LAI (art. 11, § 2º) e a Lei 13.460 (art. 16) só admitem o prazo extra
 * mediante justificativa expressa comunicada ao cidadão. O sistema não pode
 * conceder isso sozinho — daí ser um ato do servidor, registrado, e não uma
 * tolerância automática do painel quando o prazo aperta.
 */
export async function prorrogarPrazo(id: string, justificativa: string): Promise<ResultadoAcao> {
  let sessao;
  try {
    sessao = await exigirAcesso();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
  // A lei não admite prorrogação sem justificativa expressa: sem ela, o
  // painel não registra.
  const texto = justificativa.trim();
  if (texto.length < 20) {
    return { ok: false, erro: "Escreva a justificativa (pelo menos 20 caracteres). Ela vai para o cidadão." };
  }
  if (texto.length > 2000) return { ok: false, erro: "Justificativa longa demais (até 2.000 caracteres)." };
  if (!(await manifestacaoAcessivel(sessao, id))) return { ok: false, erro: "Manifestação não encontrada." };

  await db
    .update(atendimentos)
    .set({ prazoProrrogado: true })
    .where(and(eq(atendimentos.id, id), eq(atendimentos.prefeituraId, sessao.prefeituraId)));

  // A justificativa fica registrada na linha do tempo da manifestação: é a
  // prova de que a prorrogação foi motivada, se o Tribunal perguntar.
  await db.insert(pedidoEventos).values({
    id: gerarId("pev"),
    pedidoId: id,
    tipo: EVENTO_PRORROGACAO,
    descricao: texto,
    autor: sessao.nome ?? "servidor",
  });
  await auditar(sessao, { acao: "alterar", entidade: "atendimento", entidadeId: id, resumo: `prazo prorrogado: ${texto.slice(0, 200)}` });
  const avisado = await avisarProrrogacao(id, texto);
  revalidatePath("/dashboard/atendimento");
  return {
    ok: true,
    aviso: avisado
      ? "Prazo prorrogado. O cidadão recebeu a justificativa por e-mail."
      : "Prazo prorrogado. O cidadão não deixou e-mail: comunique a justificativa pelo telefone, como a lei exige.",
  };
}

const schemaConfig = z.object({
  portalAtivo: z.boolean(),
  whatsappNumero: z.string().optional(),
  mostrarFinanceiro: z.boolean(),
  mostrarObras: z.boolean(),
  mostrarLicitacoes: z.boolean(),
});

export async function salvarConfigPublica(formData: FormData): Promise<ResultadoAcao> {
  let sessao;
  try {
    sessao = await exigirAcesso();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
  if (!ehGestor(sessao)) {
    return { ok: false, erro: "Apenas o prefeito ou administrador configura o portal." };
  }

  const parsed = schemaConfig.safeParse({
    portalAtivo: formData.get("portalAtivo") === "on",
    whatsappNumero: formData.get("whatsappNumero") || undefined,
    mostrarFinanceiro: formData.get("mostrarFinanceiro") === "on",
    mostrarObras: formData.get("mostrarObras") === "on",
    mostrarLicitacoes: formData.get("mostrarLicitacoes") === "on",
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const numeroLimpo = parsed.data.whatsappNumero?.replace(/\D/g, "") || null;
  if (numeroLimpo && (numeroLimpo.length < 12 || numeroLimpo.length > 15)) {
    return {
      ok: false,
      erro: "O WhatsApp precisa incluir código do país e DDD (ex: 55 85 99999-8888).",
    };
  }

  const [prefeitura] = await db
    .select({ municipio: prefeituras.municipio, estado: prefeituras.estado })
    .from(prefeituras)
    .where(eq(prefeituras.id, sessao.prefeituraId))
    .limit(1);
  if (!prefeitura) return { ok: false, erro: "Prefeitura não encontrada." };

  const existente = await buscarConfigPublica(sessao.prefeituraId);

  // O slug é gerado uma vez e nunca muda: ele já pode ter sido divulgado em
  // material impresso, site da prefeitura ou redes sociais.
  const slug = existente?.slug ?? (await slugLivre(prefeitura.municipio, prefeitura.estado));

  await db
    .insert(configPublica)
    .values({
      prefeituraId: sessao.prefeituraId,
      slug: slug!,
      portalAtivo: parsed.data.portalAtivo,
      whatsappNumero: numeroLimpo,
      mostrarFinanceiro: parsed.data.mostrarFinanceiro,
      mostrarObras: parsed.data.mostrarObras,
      mostrarLicitacoes: parsed.data.mostrarLicitacoes,
      atualizadoEm: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: configPublica.prefeituraId,
      set: {
        portalAtivo: parsed.data.portalAtivo,
        whatsappNumero: numeroLimpo,
        mostrarFinanceiro: parsed.data.mostrarFinanceiro,
        mostrarObras: parsed.data.mostrarObras,
        mostrarLicitacoes: parsed.data.mostrarLicitacoes,
        atualizadoEm: new Date().toISOString(),
      },
    });

  await auditar(sessao, { acao: "alterar", entidade: "portal", resumo: `portal ${parsed.data.portalAtivo ? "ligado" : "desligado"}; financeiro ${parsed.data.mostrarFinanceiro ? "visível" : "oculto"}, obras ${parsed.data.mostrarObras ? "visíveis" : "ocultas"}, licitações ${parsed.data.mostrarLicitacoes ? "visíveis" : "ocultas"}` });
  revalidatePath("/dashboard/atendimento");
  if (slug) revalidatePath(`/transparencia/${slug}`);
  return { ok: true };
}

export type ResultadoRascunho = { ok: true; texto: string; origem: "modelo" | "regras" } | { ok: false; erro: string };

/**
 * O rascunho da resposta (lib/rascunho-resposta.ts): o que o portal já sabe
 * sobre o assunto, no tom certo. Só preenche a caixa; quem envia é o servidor.
 */
export async function sugerirResposta(id: string): Promise<ResultadoRascunho> {
  let sessao;
  try {
    sessao = await exigirAcesso();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
  if (!(await manifestacaoAcessivel(sessao, id))) return { ok: false, erro: "Manifestação não encontrada." };
  if (!(await limitarUso(`rascunho:${sessao.usuarioId}`, 30, 60))) return { ok: false, erro: "Muitos rascunhos seguidos. Tente daqui a pouco." };

  const [a] = await db
    .select({ tipo: atendimentos.tipo, nome: atendimentos.nome, anonimo: atendimentos.anonimo, assunto: atendimentos.assunto, mensagem: atendimentos.mensagem, secretaria: atendimentos.secretaria, municipio: prefeituras.municipio })
    .from(atendimentos)
    .innerJoin(prefeituras, eq(prefeituras.id, atendimentos.prefeituraId))
    .where(and(eq(atendimentos.id, id), eq(atendimentos.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!a) return { ok: false, erro: "Manifestação não encontrada." };

  let encontrados: ItemDaCidade[] = [];
  try {
    const indice = (await indiceDaPrefeitura(sessao.prefeituraId)).filter((i) => !i.id.startsWith("acao:"));
    encontrados = buscar(indice, a.assunto, 2);
    if (!encontrados.length) encontrados = buscar(indice, `${a.assunto} ${a.mensagem.slice(0, 240)}`, 2);
  } catch (e) {
    console.error("[rascunho] índice do portal:", e);
  }

  const base = rascunhoDeResposta({
    tipo: a.tipo as TipoAtendimento,
    nome: a.anonimo ? null : a.nome,
    assunto: a.assunto,
    municipio: a.municipio,
    area: areaDaManifestacao(a.secretaria),
    encontrados,
  });

  const provedor = provedorIA();
  if (provedor.nome === "nenhum") return { ok: true, texto: base, origem: "regras" };
  try {
    const r = await provedor.conversar({
      sistema: SISTEMA_RASCUNHO,
      mensagens: [{ papel: "user", texto: `Manifestação do cidadão (contexto, não copie): ${a.assunto}\n${a.mensagem.slice(0, 1500)}\n\nRascunho para revisar:\n${base}` }],
      maxTokens: 900,
      esforco: "low",
    });
    // O texto da IA só vale se manteve os colchetes do rascunho.
    const colchetes = (t: string) => (t.match(/\[[^\]]+\]/g) ?? []).length;
    if (r.ok && r.texto.trim() && colchetes(r.texto) >= colchetes(base)) return { ok: true, texto: r.texto.trim(), origem: "modelo" };
  } catch (e) {
    console.error("[rascunho] IA:", e);
  }
  return { ok: true, texto: base, origem: "regras" };
}
