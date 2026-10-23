"use server";

import { z } from "zod";
import { db } from "@/db";
import { atendimentos, configPublica, pedidoEventos, prefeituras } from "@/db/schema";
import { EVENTO_AVALIACAO, ehNota, lerAvaliacao, type Avaliacao } from "@/lib/avaliacao-cidadao";
import { and, desc, eq, notInArray } from "drizzle-orm";
import { PREFEITURAS_INTERNAS } from "@/lib/prefeituras-internas";
import { portalVerificado } from "@/lib/endereco-publico";
import { planosContratadosDe } from "@/lib/planos";
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
import { after } from "next/server";
import { areaDaManifestacao } from "@/lib/ouvidoria-avisos";
import { classificarArea, EVENTO_AREA_AUTOMATICA } from "@/lib/classificar-manifestacao";
import { avisarAvaliacaoRuim, avisarManifestacaoNova } from "@/lib/ouvidoria-avisos-servidor";

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
    .select({ prefeituraId: configPublica.prefeituraId, ativo: configPublica.portalAtivo, planos: prefeituras.planosContratados })
    .from(configPublica)
    .innerJoin(prefeituras, eq(prefeituras.id, configPublica.prefeituraId))
    .where(eq(configPublica.slug, d.slug))
    .limit(1);

  // Ouvidoria e protocolo fazem parte do Essencial, que só a equipe liga
  // depois do contrato. Sem isso, uma conta criada por qualquer pessoa em
  // nome de uma prefeitura receberia nome, e-mail e telefone de morador.
  if (!config || !config.ativo || !planosContratadosDe(config.planos).includes("essencial")) {
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

  const id = gerarId("atend");
  // Sem área escolhida, o texto decide (lib/classificar-manifestacao.ts);
  // na dúvida, continua indo para o gabinete.
  const escolhida = areaDaManifestacao(d.secretaria);
  const pelaLeitura = escolhida ? null : classificarArea(d.assunto, d.mensagem, d.tipo);
  await db.insert(atendimentos).values({
    id,
    prefeituraId: config.prefeituraId,
    protocolo,
    tipo: d.tipo,
    nome: anonimo ? null : d.nome?.trim() || null,
    email: anonimo ? null : d.email?.trim() || null,
    telefone: anonimo ? null : d.telefone?.trim() || null,
    anonimo,
    // Só uma área conhecida: é ela que decide quem recebe o aviso.
    secretaria: escolhida ?? pelaLeitura,
    assunto: d.assunto.trim(),
    mensagem: d.mensagem.trim(),
    chaveConsulta: chave,
    origem: "site",
  });

  if (pelaLeitura) {
    await db.insert(pedidoEventos).values({
      id: gerarId("pev"),
      pedidoId: id,
      tipo: EVENTO_AREA_AUTOMATICA,
      descricao: pelaLeitura,
      autor: "classificação automática",
    });
  }

  // Depois da resposta ao cidadão: o aviso à equipe e a confirmação no
  // e-mail dele não podem atrasar nem derrubar o protocolo.
  after(() => avisarManifestacaoNova(id));

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
      /** A avaliação que o próprio cidadão já deu, se deu. */
      avaliacao: Avaliacao | null;
      /** Só se avalia o que a prefeitura já respondeu. */
      podeAvaliar: boolean;
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

  const [evento] = await db
    .select({ pedidoId: pedidoEventos.pedidoId, descricao: pedidoEventos.descricao })
    .from(pedidoEventos)
    .where(and(eq(pedidoEventos.pedidoId, registro.id), eq(pedidoEventos.tipo, EVENTO_AVALIACAO)))
    .orderBy(desc(pedidoEventos.criadoEm))
    .limit(1);

  return {
    ok: true,
    avaliacao: evento ? lerAvaliacao(evento.descricao) : null,
    podeAvaliar: registro.status === "respondido" || registro.status === "encerrado",
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

export type ResultadoAvaliacao = { ok: true } | { ok: false; erro: string };

/**
 * "A resposta resolveu?" (lib/avaliacao-cidadao.ts). Exige protocolo e chave,
 * como a consulta: só quem fez o pedido avalia. Pode mudar de ideia; vale a
 * última. "Não resolveu" ou "em parte" avisa quem respondeu.
 */
export async function avaliarAtendimento(formData: FormData): Promise<ResultadoAvaliacao> {
  const protocolo = String(formData.get("protocolo") ?? "").trim().toUpperCase();
  const chave = String(formData.get("chave") ?? "").trim().toUpperCase();
  const nota = String(formData.get("nota") ?? "");
  const comentario = String(formData.get("comentario") ?? "").trim().slice(0, 500);
  if (!protocolo || !chave || !ehNota(nota)) return { ok: false, erro: "Escolha uma das opções." };

  if (!(await limitarUso(`avaliacao:${protocolo}`, 6, 10))) {
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const [registro] = await db.select().from(atendimentos).where(eq(atendimentos.protocolo, protocolo)).limit(1);
  if (!registro || !chaveConfere(chave, registro.chaveConsulta)) return { ok: false, erro: "Protocolo ou chave não confere." };
  if (registro.status !== "respondido" && registro.status !== "encerrado") {
    return { ok: false, erro: "Dá para avaliar depois que a prefeitura responder." };
  }

  await db.insert(pedidoEventos).values({
    id: gerarId("pev"),
    pedidoId: registro.id,
    tipo: EVENTO_AVALIACAO,
    descricao: JSON.stringify({ nota, comentario: comentario || null }),
    autor: "cidadão",
  });

  if (nota !== "sim") after(() => avisarAvaliacaoRuim(registro.id, nota, !!comentario));
  return { ok: true };
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
      codigoIbge: prefeituras.codigoIbge,
    })
    .from(configPublica)
    .innerJoin(prefeituras, eq(prefeituras.id, configPublica.prefeituraId))
    .where(and(eq(configPublica.slug, slug), eq(configPublica.portalAtivo, true), notInArray(configPublica.prefeituraId, PREFEITURAS_INTERNAS)))
    .limit(1);

  // ── SÓ PREFEITURA VERIFICADA TEM ENDEREÇO PÚBLICO ──
  // O cadastro é aberto: qualquer pessoa cria uma conta com o nome de uma
  // prefeitura. Sem esta regra, ela ganhava na hora um portal com aquele
  // nome, o "prefeito" que digitou e um WhatsApp seu — um portal falso com o
  // endereço do CidadeIA (revisão de outubro de 2026). Módulo contratado só
  // existe depois que a equipe confere o contrato e o empenho, então é ele
  // que prova o vínculo. Antes disso, o endereço não existe.
  if (!linha || !portalVerificado(linha.planosContratados)) return null;
  return linha;
}
