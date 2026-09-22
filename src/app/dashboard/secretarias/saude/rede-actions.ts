"use server";

import { z } from "zod";
import { and, eq, desc, inArray, isNotNull, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { unidadesSaude, ocorrenciasSaude, prefeituras, usuarios, estoqueSaude, atendimentos } from "@/db/schema";
import { CATALOGO_ESTOQUE } from "@/lib/estoque-saude";
import { gerarHashSenha, senhaForte } from "@/lib/senha";
import { validarCpfOuCnpj, normalizarDocumento } from "@/lib/documento";
import { gerarId } from "@/lib/id";
import { lerSessao, temAcessoSecretaria, podeVerUnidade, ehGestor } from "@/lib/sessao";
import { auditar } from "@/lib/auditoria";
import { buscarRedeNoCnes } from "@/lib/cnes";

// ── A REDE PELO CNES, E O QUE ACONTECE DENTRO DE CADA UNIDADE ──

async function exigirAcesso() {
  const sessao = await lerSessao();
  if (!sessao || !temAcessoSecretaria(sessao, "saude")) return null;
  return sessao;
}

export type ResultadoSincronizacao =
  | { ok: true; novas: number; atualizadas: number; desativadas: number; ignoradas: number; total: number }
  | { ok: false; erro: string };

/**
 * Traz a rede do CNES para a conta: cria o que não existe, atualiza o que
 * existe (pelo código CNES), e marca como inativa a unidade CNES que sumiu
 * de lá. Unidades cadastradas à mão não são tocadas.
 */
export async function sincronizarRedeCnes(): Promise<ResultadoSincronizacao> {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.cargo === "unidade") return { ok: false, erro: "Sem permissão." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração a rede é fictícia e não é sincronizada." };

  const [pref] = await db.select({ codigoIbge: prefeituras.codigoIbge }).from(prefeituras).where(eq(prefeituras.id, sessao.prefeituraId)).limit(1);
  if (!pref?.codigoIbge) {
    return { ok: false, erro: "Reconheça o município na Implantação antes: o CNES é consultado pelo código IBGE." };
  }

  const r = await buscarRedeNoCnes(pref.codigoIbge);
  if (!r.ok) return r;

  const existentes = await db
    .select({ id: unidadesSaude.id, codigoCnes: unidadesSaude.codigoCnes, ativo: unidadesSaude.ativo })
    .from(unidadesSaude)
    .where(and(eq(unidadesSaude.prefeituraId, sessao.prefeituraId), isNotNull(unidadesSaude.codigoCnes)));
  const porCodigo = new Map(existentes.map((e) => [e.codigoCnes!, e]));
  const agora = new Date().toISOString();

  let novas = 0;
  let atualizadas = 0;
  const vistos = new Set<string>();
  for (const u of r.unidades) {
    vistos.add(u.codigoCnes);
    const dados = {
      nome: u.nome,
      tipo: u.tipo,
      bairro: u.bairro,
      latitude: u.latitude,
      longitude: u.longitude,
      codigoTipoUnidade: u.codigoTipoUnidade,
      esfera: u.esfera,
      endereco: u.endereco,
      telefone: u.telefone,
      turno: u.turno,
      atendeSus: u.atendeSus,
      hospitalar: u.hospitalar,
      centroCirurgico: u.centroCirurgico,
      centroObstetrico: u.centroObstetrico,
      cnesAtualizadoEm: u.cnesAtualizadoEm,
      sincronizadoEm: agora,
      ativo: true,
    };
    const ex = porCodigo.get(u.codigoCnes);
    if (ex) {
      await db.update(unidadesSaude).set(dados).where(eq(unidadesSaude.id, ex.id));
      atualizadas++;
    } else {
      await db.insert(unidadesSaude).values({ id: gerarId("us"), prefeituraId: sessao.prefeituraId, codigoCnes: u.codigoCnes, origem: "cnes", ...dados });
      novas++;
    }
  }

  const sumiram = existentes.filter((e) => e.ativo && !vistos.has(e.codigoCnes!)).map((e) => e.id);
  if (sumiram.length > 0) {
    await db.update(unidadesSaude).set({ ativo: false, sincronizadoEm: agora }).where(inArray(unidadesSaude.id, sumiram));
  }

  await auditar(sessao, {
    acao: "importar",
    entidade: "unidade_saude",
    resumo: `rede do CNES: ${novas} nova(s), ${atualizadas} atualizada(s), ${sumiram.length} desativada(s)`,
  });
  revalidatePath("/dashboard/secretarias/saude");
  revalidatePath("/dashboard/mapa");
  return { ok: true, novas, atualizadas, desativadas: sumiram.length, ignoradas: r.ignoradas, total: r.unidades.length };
}

// ── OCORRÊNCIAS ──

const TIPOS_OCORRENCIA = ["sem_medico", "sem_profissional", "falta_medicamento", "falta_insumo", "equipamento_quebrado", "fila", "estrutura", "outro"] as const;

const schemaOcorrencia = z.object({
  unidadeId: z.string().min(1),
  tipo: z.enum(TIPOS_OCORRENCIA),
  gravidade: z.enum(["atencao", "urgente"]).default("atencao"),
  descricao: z.string().trim().min(3, "Descreva em poucas palavras.").max(500),
});

export type ResultadoOcorrencia = { ok: true } | { ok: false; erro: string };

export async function registrarOcorrencia(formData: FormData): Promise<ResultadoOcorrencia> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  const parsed = schemaOcorrencia.safeParse({
    unidadeId: formData.get("unidadeId"),
    tipo: formData.get("tipo"),
    gravidade: formData.get("gravidade") || "atencao",
    descricao: formData.get("descricao"),
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  // A gerência de unidade só registra na própria unidade.
  if (!podeVerUnidade(sessao, d.unidadeId)) return { ok: false, erro: "Sem permissão para esta unidade." };

  const [unidade] = await db
    .select({ id: unidadesSaude.id, nome: unidadesSaude.nome })
    .from(unidadesSaude)
    .where(and(eq(unidadesSaude.id, d.unidadeId), eq(unidadesSaude.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!unidade) return { ok: false, erro: "Unidade não encontrada." };

  await db.insert(ocorrenciasSaude).values({
    id: gerarId("oc"),
    prefeituraId: sessao.prefeituraId,
    unidadeId: unidade.id,
    tipo: d.tipo,
    gravidade: d.gravidade,
    descricao: d.descricao,
    registradoPor: sessao.nome,
  });
  await auditar(sessao, { acao: "criar", entidade: "unidade_saude", entidadeId: unidade.id, resumo: `ocorrência em "${unidade.nome}": ${d.tipo} (${d.gravidade}) — ${d.descricao}` });
  revalidatePath(`/dashboard/secretarias/saude/unidades/${unidade.id}`);
  revalidatePath("/dashboard/secretarias/saude");
  return { ok: true };
}

export async function resolverOcorrencia(id: string): Promise<ResultadoOcorrencia> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  const [oc] = await db
    .select({ id: ocorrenciasSaude.id, unidadeId: ocorrenciasSaude.unidadeId, descricao: ocorrenciasSaude.descricao })
    .from(ocorrenciasSaude)
    .where(and(eq(ocorrenciasSaude.id, id), eq(ocorrenciasSaude.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!oc) return { ok: false, erro: "Ocorrência não encontrada." };
  if (!podeVerUnidade(sessao, oc.unidadeId)) return { ok: false, erro: "Sem permissão para esta unidade." };
  await db.update(ocorrenciasSaude).set({ status: "resolvida", resolvidaEm: new Date().toISOString() }).where(eq(ocorrenciasSaude.id, oc.id));
  await auditar(sessao, { acao: "resolver", entidade: "unidade_saude", entidadeId: oc.unidadeId, resumo: `ocorrência resolvida: ${oc.descricao}` });
  revalidatePath(`/dashboard/secretarias/saude/unidades/${oc.unidadeId}`);
  revalidatePath("/dashboard/secretarias/saude");
  return { ok: true };
}

/** Ocorrências abertas de todas as unidades — para o resumo da secretaria. */
export async function buscarOcorrenciasAbertas(prefeituraId: string) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId) return [];
  return db
    .select()
    .from(ocorrenciasSaude)
    .where(and(eq(ocorrenciasSaude.prefeituraId, prefeituraId), eq(ocorrenciasSaude.status, "aberta")))
    .orderBy(desc(ocorrenciasSaude.createdAt));
}

// ── ACESSO PRÓPRIO DA GERÊNCIA DA UNIDADE ──
//
// O dado nasce onde acontece: a gerência do hospital ou da UBS entra com
// CPF e senha e cai direto na ficha da própria unidade — só nela. Quem cria
// o acesso é o secretário de saúde, o prefeito ou o admin.


const schemaAcessoUnidade = z.object({
  unidadeId: z.string().min(1),
  nome: z.string().trim().min(3, "Informe o nome de quem vai usar."),
  documento: z.string().refine((v) => validarCpfOuCnpj(v), "CPF inválido."),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  senha: z.string(),
});

export type ResultadoAcesso = { ok: true } | { ok: false; erro: string };

function podeGerirAcessos(sessao: { cargo: string; secretaria?: string | null }): boolean {
  return ehGestor(sessao) || (sessao.cargo === "secretario" && sessao.secretaria === "saude");
}

export async function criarAcessoUnidade(formData: FormData): Promise<ResultadoAcesso> {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirAcessos(sessao)) return { ok: false, erro: "Sem permissão para criar acessos." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração não é possível criar acessos." };

  const parsed = schemaAcessoUnidade.safeParse({
    unidadeId: formData.get("unidadeId"),
    nome: formData.get("nome"),
    documento: formData.get("documento"),
    email: formData.get("email") || "",
    senha: formData.get("senha"),
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const forte = senhaForte(d.senha);
  if (!forte.ok) return { ok: false, erro: forte.motivo! };

  const [unidade] = await db
    .select({ id: unidadesSaude.id, nome: unidadesSaude.nome })
    .from(unidadesSaude)
    .where(and(eq(unidadesSaude.id, d.unidadeId), eq(unidadesSaude.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!unidade) return { ok: false, erro: "Unidade não encontrada." };

  const documento = normalizarDocumento(d.documento);
  const [existente] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.cpfCnpj, documento)).limit(1);
  if (existente) return { ok: false, erro: "Já existe um usuário com este CPF." };

  await db.insert(usuarios).values({
    id: gerarId("user"),
    prefeituraId: sessao.prefeituraId,
    cpfCnpj: documento,
    senhaHash: await gerarHashSenha(d.senha),
    email: d.email || null,
    nome: d.nome,
    cargo: "unidade",
    unidadeId: unidade.id,
  });
  await auditar(sessao, { acao: "criar", entidade: "usuario", resumo: `"${d.nome}" (gerência de ${unidade.nome})` });
  revalidatePath(`/dashboard/secretarias/saude/unidades/${unidade.id}`);
  return { ok: true };
}

export async function removerAcessoUnidade(usuarioId: string): Promise<ResultadoAcesso> {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirAcessos(sessao)) return { ok: false, erro: "Sem permissão." };
  const [u] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, unidadeId: usuarios.unidadeId })
    .from(usuarios)
    .where(and(eq(usuarios.id, usuarioId), eq(usuarios.prefeituraId, sessao.prefeituraId), eq(usuarios.cargo, "unidade")))
    .limit(1);
  if (!u) return { ok: false, erro: "Acesso não encontrado." };
  await db.delete(usuarios).where(eq(usuarios.id, u.id));
  await auditar(sessao, { acao: "excluir", entidade: "usuario", entidadeId: u.id, resumo: `"${u.nome}" (gerência de unidade)` });
  if (u.unidadeId) revalidatePath(`/dashboard/secretarias/saude/unidades/${u.unidadeId}`);
  return { ok: true };
}

/** Quem tem acesso próprio a esta unidade. */
export async function listarAcessosUnidade(unidadeId: string) {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirAcessos(sessao)) return [];
  return db
    .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, createdAt: usuarios.createdAt })
    .from(usuarios)
    .where(and(eq(usuarios.prefeituraId, sessao.prefeituraId), eq(usuarios.cargo, "unidade"), eq(usuarios.unidadeId, unidadeId)));
}

// ── ESTOQUE ──
// Quem conta, lança: a gerência da unidade (ou a secretaria). Uma linha por
// item por unidade — a última contagem substitui a anterior.


const schemaContagem = z.object({
  unidadeId: z.string().min(1),
  item: z.string().trim().min(2, "Informe o item.").max(120),
  categoria: z.enum(["medicamento", "insumo", "vacina"]).default("medicamento"),
  unidadeMedida: z.string().trim().max(30).default("unidade"),
  saldo: z.coerce.number().min(0, "Saldo não pode ser negativo."),
  consumoMensal: z.coerce.number().min(0, "Consumo não pode ser negativo."),
});

export async function registrarContagem(formData: FormData): Promise<ResultadoOcorrencia> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  const itemBruto = String(formData.get("item") ?? "").trim();
  const doCatalogo = CATALOGO_ESTOQUE.find((c) => c.nome === itemBruto);
  const parsed = schemaContagem.safeParse({
    unidadeId: formData.get("unidadeId"),
    item: itemBruto,
    categoria: doCatalogo?.categoria ?? formData.get("categoria") ?? "medicamento",
    unidadeMedida: doCatalogo?.unidade ?? formData.get("unidadeMedida") ?? "unidade",
    saldo: formData.get("saldo"),
    consumoMensal: formData.get("consumoMensal"),
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  if (!podeVerUnidade(sessao, d.unidadeId)) return { ok: false, erro: "Sem permissão para esta unidade." };

  const [unidade] = await db
    .select({ id: unidadesSaude.id, nome: unidadesSaude.nome })
    .from(unidadesSaude)
    .where(and(eq(unidadesSaude.id, d.unidadeId), eq(unidadesSaude.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!unidade) return { ok: false, erro: "Unidade não encontrada." };

  const agora = new Date().toISOString();
  await db
    .insert(estoqueSaude)
    .values({
      id: gerarId("est"),
      prefeituraId: sessao.prefeituraId,
      unidadeId: unidade.id,
      item: d.item,
      categoria: d.categoria,
      unidadeMedida: d.unidadeMedida,
      saldo: d.saldo,
      consumoMensal: d.consumoMensal,
      atualizadoPor: sessao.nome,
      atualizadoEm: agora,
    })
    .onConflictDoUpdate({
      target: [estoqueSaude.unidadeId, estoqueSaude.item],
      set: { saldo: d.saldo, consumoMensal: d.consumoMensal, categoria: d.categoria, unidadeMedida: d.unidadeMedida, atualizadoPor: sessao.nome, atualizadoEm: agora },
    });
  await auditar(sessao, { acao: "alterar", entidade: "unidade_saude", entidadeId: unidade.id, resumo: `estoque em "${unidade.nome}": ${d.item} — saldo ${d.saldo}, consumo ${d.consumoMensal}/mês` });
  revalidatePath(`/dashboard/secretarias/saude/unidades/${unidade.id}`);
  revalidatePath("/dashboard/secretarias/saude");
  revalidatePath("/dashboard/secretarias/saude/reposicao");
  return { ok: true };
}

export async function removerItemEstoque(id: string): Promise<ResultadoOcorrencia> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  const [l] = await db
    .select({ id: estoqueSaude.id, unidadeId: estoqueSaude.unidadeId, item: estoqueSaude.item })
    .from(estoqueSaude)
    .where(and(eq(estoqueSaude.id, id), eq(estoqueSaude.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!l) return { ok: false, erro: "Item não encontrado." };
  if (!podeVerUnidade(sessao, l.unidadeId)) return { ok: false, erro: "Sem permissão para esta unidade." };
  await db.delete(estoqueSaude).where(eq(estoqueSaude.id, l.id));
  await auditar(sessao, { acao: "excluir", entidade: "unidade_saude", entidadeId: l.unidadeId, resumo: `item de estoque removido: ${l.item}` });
  revalidatePath(`/dashboard/secretarias/saude/unidades/${l.unidadeId}`);
  revalidatePath("/dashboard/secretarias/saude");
  return { ok: true };
}

/** Estoque de toda a rede — para o resumo e o pedido de reposição. */
export async function buscarEstoqueDaRede(prefeituraId: string) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId || sessao.cargo === "unidade") return [];
  return db.select().from(estoqueSaude).where(eq(estoqueSaude.prefeituraId, prefeituraId));
}

// ── O QUE O CIDADÃO DISSE SOBRE A UNIDADE ──
// Manifestações da ouvidoria (Essencial) dos últimos 30 dias, para cruzar
// com as fichas. Sem o Essencial, a lista é vazia — e a leitura diz isso.

export async function buscarManifestacoesRecentes(prefeituraId: string) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId) return [];
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
  try {
    return await db
      .select({ tipo: atendimentos.tipo, assunto: atendimentos.assunto, mensagem: atendimentos.mensagem, createdAt: atendimentos.createdAt })
      .from(atendimentos)
      .where(and(eq(atendimentos.prefeituraId, prefeituraId), gte(atendimentos.createdAt, desde)));
  } catch {
    return [];
  }
}
