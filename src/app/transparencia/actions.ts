"use server";

import { z } from "zod";
import { db } from "@/db";
import { atendimentos, configPublica, prefeituras } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { gerarId } from "@/lib/id";
import { limitarUso } from "@/lib/rate-limit";
import {
  gerarProtocolo,
  gerarChaveConsulta,
  chaveConfere,
  permiteAnonimo,
  NOME_STATUS,
  NOME_TIPO,
  type TipoAtendimento,
} from "@/lib/atendimento";
import { revalidatePath } from "next/cache";

const TIPOS_VALIDOS = [
  "protocolo",
  "denuncia",
  "reclamacao",
  "sugestao",
  "elogio",
  "informacao",
] as const;

const schemaAbertura = z.object({
  slug: z.string().min(1),
  tipo: z.enum(TIPOS_VALIDOS),
  assunto: z.string().min(5, "Descreva o assunto em pelo menos 5 caracteres.").max(200),
  mensagem: z.string().min(20, "Detalhe sua mensagem em pelo menos 20 caracteres.").max(5000),
  nome: z.string().max(120).optional(),
  email: z.string().email("E-mail inválido.").max(160).optional().or(z.literal("")),
  telefone: z.string().max(30).optional(),
  secretaria: z.string().max(40).optional(),
  anonimo: z.boolean().optional(),
  // Honeypot — invisível para humano.
  site: z.string().optional(),
});

export type ResultadoAbertura =
  | { ok: true; protocolo: string; chave: string }
  | { ok: false; erro: string };

/**
 * Abertura de manifestação pelo cidadão — endpoint PÚBLICO, sem login.
 * Por isso carrega três proteções: honeypot, rate limit por município e
 * validação estrita do que entra.
 */
export async function abrirAtendimento(formData: FormData): Promise<ResultadoAbertura> {
  const parsed = schemaAbertura.safeParse({
    slug: formData.get("slug"),
    tipo: formData.get("tipo"),
    assunto: formData.get("assunto"),
    mensagem: formData.get("mensagem"),
    nome: formData.get("nome") || undefined,
    email: formData.get("email") || undefined,
    telefone: formData.get("telefone") || undefined,
    secretaria: formData.get("secretaria") || undefined,
    anonimo: formData.get("anonimo") === "on",
    site: formData.get("site") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  // Bot preencheu o campo escondido — finge sucesso para não dar pista.
  if (d.site) {
    return { ok: true, protocolo: gerarProtocolo(), chave: gerarChaveConsulta() };
  }

  const [config] = await db
    .select({ prefeituraId: configPublica.prefeituraId, ativo: configPublica.portalAtivo })
    .from(configPublica)
    .where(eq(configPublica.slug, d.slug))
    .limit(1);

  if (!config || !config.ativo) {
    return { ok: false, erro: "Este canal de atendimento não está disponível." };
  }

  // Sem login não há usuário para limitar — limita por município, senão um
  // único robô poderia inundar a ouvidoria de uma prefeitura.
  const podeAbrir = await limitarUso(`atendimento:${config.prefeituraId}`, 20, 10);
  if (!podeAbrir) {
    return {
      ok: false,
      erro: "Muitas manifestações registradas agora. Tente novamente em alguns minutos.",
    };
  }

  const anonimo = d.anonimo === true && permiteAnonimo(d.tipo as TipoAtendimento);

  // Tipo que exige resposta precisa de um caminho para respondê-la.
  if (!anonimo && !d.email?.trim() && !d.telefone?.trim()) {
    return {
      ok: false,
      erro: "Informe e-mail ou telefone para que a prefeitura possa responder.",
    };
  }
  if (!permiteAnonimo(d.tipo as TipoAtendimento) && !d.nome?.trim()) {
    return { ok: false, erro: "Este tipo de manifestação exige identificação." };
  }

  const protocolo = gerarProtocolo();
  const chave = gerarChaveConsulta();

  await db.insert(atendimentos).values({
    id: gerarId("atend"),
    prefeituraId: config.prefeituraId,
    protocolo,
    tipo: d.tipo,
    nome: anonimo ? null : d.nome?.trim() || null,
    email: anonimo ? null : d.email?.trim() || null,
    telefone: anonimo ? null : d.telefone?.trim() || null,
    anonimo,
    secretaria: d.secretaria || null,
    assunto: d.assunto.trim(),
    mensagem: d.mensagem.trim(),
    chaveConsulta: chave,
    origem: "site",
  });

  revalidatePath(`/transparencia/${d.slug}`);
  return { ok: true, protocolo, chave };
}

export type ResultadoConsulta =
  | {
      ok: true;
      protocolo: string;
      tipo: string;
      status: string;
      assunto: string;
      mensagem: string;
      resposta: string | null;
      abertoEm: string;
      respondidoEm: string | null;
    }
  | { ok: false; erro: string };

/**
 * Consulta pública de andamento. Exige protocolo E chave — protocolo sozinho
 * não basta, senão qualquer pessoa leria denúncia alheia testando números.
 */
export async function consultarAtendimento(formData: FormData): Promise<ResultadoConsulta> {
  const protocolo = String(formData.get("protocolo") ?? "").trim().toUpperCase();
  const chave = String(formData.get("chave") ?? "").trim().toUpperCase();

  if (!protocolo || !chave) {
    return { ok: false, erro: "Informe o número do protocolo e a chave de consulta." };
  }

  const podeConsultar = await limitarUso(`consulta:${protocolo}`, 10, 10);
  if (!podeConsultar) {
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const [registro] = await db
    .select()
    .from(atendimentos)
    .where(eq(atendimentos.protocolo, protocolo))
    .limit(1);

  // Mesma mensagem para "não existe" e "chave errada" — não confirma a
  // existência de um protocolo para quem não tem a chave.
  const generico = { ok: false as const, erro: "Protocolo ou chave não confere." };
  if (!registro) return generico;
  if (!chaveConfere(chave, registro.chaveConsulta)) return generico;

  return {
    ok: true,
    protocolo: registro.protocolo,
    tipo: NOME_TIPO[registro.tipo as TipoAtendimento] ?? registro.tipo,
    status: NOME_STATUS[registro.status as keyof typeof NOME_STATUS] ?? registro.status,
    assunto: registro.assunto,
    mensagem: registro.mensagem,
    resposta: registro.resposta,
    abertoEm: registro.createdAt,
    respondidoEm: registro.respondidoEm,
  };
}

/** Dados públicos do município para o portal. Sem login, só leitura. */
export async function buscarPortal(slug: string) {
  const [linha] = await db
    .select({
      prefeituraId: configPublica.prefeituraId,
      portalAtivo: configPublica.portalAtivo,
      whatsappNumero: configPublica.whatsappNumero,
      mostrarFinanceiro: configPublica.mostrarFinanceiro,
      mostrarObras: configPublica.mostrarObras,
      mostrarLicitacoes: configPublica.mostrarLicitacoes,
      nome: prefeituras.nome,
      municipio: prefeituras.municipio,
      estado: prefeituras.estado,
      prefeito: prefeituras.prefeito,
      planosContratados: prefeituras.planosContratados,
    })
    .from(configPublica)
    .innerJoin(prefeituras, eq(prefeituras.id, configPublica.prefeituraId))
    .where(and(eq(configPublica.slug, slug), eq(configPublica.portalAtivo, true)))
    .limit(1);

  return linha ?? null;
}
