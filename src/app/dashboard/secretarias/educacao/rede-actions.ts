"use server";

import { z } from "zod";
import { and, eq, desc, gte, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { escolas, ocorrenciasEscola, prefeituras, usuarios, atendimentos } from "@/db/schema";
import { gerarHashSenha, senhaForte } from "@/lib/senha";
import { validarCpfOuCnpj, normalizarDocumento } from "@/lib/documento";
import { gerarId } from "@/lib/id";
import { lerSessao, temAcessoSecretaria, podeVerEscola, ehGestor } from "@/lib/sessao";
import { auditar } from "@/lib/auditoria";
import {
  decodificarArquivo,
  lerArquivoDeEscolas,
  doMunicipio,
  entraNaRede,
  censoMaisRecenteDisponivel,
} from "@/lib/censo-escolar";
import { TIPOS_OCORRENCIA_ESCOLA } from "@/lib/ocorrencias-escola";
import { DIAS_LETIVOS_LDB } from "@/lib/ocorrencias-escola";

// ── A REDE PELO CENSO ESCOLAR, E O QUE ACONTECE DENTRO DE CADA ESCOLA ──
//
// Educação não tem CNES. O arquivo oficial do INEP faz o papel: um upload
// e a rede inteira entra com código INEP, dependência, etapas e matrícula
// declarada — que é o número pelo qual o FUNDEB paga.

async function exigirAcesso() {
  const sessao = await lerSessao();
  if (!sessao || !temAcessoSecretaria(sessao, "educacao")) return null;
  return sessao;
}

/** Quem manda na rede inteira: prefeito, admin ou o secretário de educação. */
function podeGerirRede(sessao: { cargo: string; secretaria?: string | null }): boolean {
  return ehGestor(sessao) || (sessao.cargo === "secretario" && sessao.secretaria === "educacao");
}

// ── IMPORTAÇÃO DO ARQUIVO DO INEP ──

export type ResultadoImportacao =
  | { ok: true; novas: number; atualizadas: number; ignoradas: number; total: number; colunasLidas: string[]; ano: number }
  | { ok: false; erro: string };

/** Arquivo do INEP de um estado inteiro passa fácil de 5 MB de texto. */
const TAMANHO_MAXIMO = 25 * 1024 * 1024;

const schemaImportacao = z.object({
  ano: z.coerce.number().int().min(2007).max(2100),
  /** Importar também escolas estaduais/federais/privadas do município, como contexto. */
  todasAsRedes: z.boolean().default(false),
});

/**
 * Lê o arquivo do Catálogo de Escolas (ou dos microdados do Censo), fica
 * só com o que é do município e grava a rede: cria o que não existe,
 * atualiza pelo código INEP o que existe. Escola cadastrada à mão não é
 * tocada — o secretário pode ter posto uma creche que o Censo ainda não viu.
 */
export async function importarRedeDoCenso(formData: FormData): Promise<ResultadoImportacao> {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirRede(sessao)) return { ok: false, erro: "Sem permissão." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração a rede é fictícia e não é importada." };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: "Escolha o arquivo exportado do INEP." };
  if (arquivo.size > TAMANHO_MAXIMO) return { ok: false, erro: "Arquivo grande demais. Exporte só o seu estado ou município." };

  const parsed = schemaImportacao.safeParse({
    ano: formData.get("ano") || censoMaisRecenteDisponivel(),
    todasAsRedes: formData.get("todasAsRedes") === "on",
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { ano, todasAsRedes } = parsed.data;

  const leitura = lerArquivoDeEscolas(decodificarArquivo(await arquivo.arrayBuffer()));
  if (leitura.erro) return { ok: false, erro: leitura.erro };

  const [pref] = await db
    .select({ codigoIbge: prefeituras.codigoIbge, nome: prefeituras.nome })
    .from(prefeituras)
    .where(eq(prefeituras.id, sessao.prefeituraId))
    .limit(1);

  const daMinhaRede = leitura.escolas
    .filter((e) => doMunicipio(e, pref?.codigoIbge ?? null, pref?.nome ?? null))
    .filter(entraNaRede)
    .filter((e) => todasAsRedes || e.dependencia === null || e.dependencia === "municipal");

  const ignoradas = leitura.escolas.length - daMinhaRede.length;
  if (daMinhaRede.length === 0) {
    return {
      ok: false,
      erro:
        pref?.codigoIbge
          ? `O arquivo tem ${leitura.escolas.length} escola(s), mas nenhuma de ${pref.nome}. Confira se exportou o município certo.`
          : "Reconheça o município na Implantação antes: sem o código IBGE não dá para separar as escolas daqui.",
    };
  }

  const existentes = await db
    .select({ id: escolas.id, codigoInep: escolas.codigoInep })
    .from(escolas)
    .where(and(eq(escolas.prefeituraId, sessao.prefeituraId), isNotNull(escolas.codigoInep)));
  const porCodigo = new Map(existentes.map((e) => [e.codigoInep!, e.id]));
  const agora = new Date().toISOString();

  let novas = 0;
  let atualizadas = 0;
  for (const e of daMinhaRede) {
    const dados = {
      nome: e.nome,
      dependencia: e.dependencia,
      localizacao: e.localizacao,
      situacao: e.situacao,
      endereco: e.endereco,
      telefone: e.telefone,
      etapas: e.etapas,
      porte: e.porte,
      matriculasCenso: e.matriculas,
      censoAno: ano,
      latitude: e.latitude,
      longitude: e.longitude,
      origem: "censo" as const,
      sincronizadoEm: agora,
    };
    const existente = e.codigoInep ? porCodigo.get(e.codigoInep) : undefined;
    if (existente) {
      await db.update(escolas).set(dados).where(eq(escolas.id, existente));
      atualizadas++;
    } else {
      await db.insert(escolas).values({
        id: gerarId("escola"),
        prefeituraId: sessao.prefeituraId,
        codigoInep: e.codigoInep,
        ...dados,
      });
      novas++;
    }
  }

  await auditar(sessao, {
    acao: "importar",
    entidade: "escola",
    resumo: `rede do Censo ${ano}: ${novas} nova(s), ${atualizadas} atualizada(s)`,
  });
  revalidatePath("/dashboard/secretarias/educacao");
  return { ok: true, novas, atualizadas, ignoradas, total: daMinhaRede.length, colunasLidas: leitura.colunasLidas, ano };
}

// ── DADOS QUE SÓ A ESCOLA SABE ──

const schemaDadosEscola = z.object({
  escolaId: z.string().min(1),
  matriculasAtuais: z.coerce.number().int().min(0).max(100_000).optional(),
  diasPrevistos: z.coerce.number().int().min(DIAS_LETIVOS_LDB).max(260).optional(),
  bairro: z.string().trim().max(120).optional(),
});

export type ResultadoEscola = { ok: true } | { ok: false; erro: string };

/**
 * A matrícula de hoje e o calendário aprovado. São os dois números que o
 * Censo não tem e que mudam tudo: a matrícula vira comparação com o que
 * foi declarado (dinheiro do FUNDEB), o calendário vira a conta dos 200
 * dias letivos.
 */
export async function atualizarDadosEscola(formData: FormData): Promise<ResultadoEscola> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  const parsed = schemaDadosEscola.safeParse({
    escolaId: formData.get("escolaId"),
    matriculasAtuais: formData.get("matriculasAtuais") || undefined,
    diasPrevistos: formData.get("diasPrevistos") || undefined,
    bairro: formData.get("bairro") || undefined,
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  if (!podeVerEscola(sessao, d.escolaId)) return { ok: false, erro: "Sem permissão para esta escola." };

  const [escola] = await db
    .select({ id: escolas.id, nome: escolas.nome })
    .from(escolas)
    .where(and(eq(escolas.id, d.escolaId), eq(escolas.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!escola) return { ok: false, erro: "Escola não encontrada." };

  await db
    .update(escolas)
    .set({
      ...(d.matriculasAtuais !== undefined ? { matriculasAtuais: d.matriculasAtuais } : {}),
      ...(d.diasPrevistos !== undefined ? { diasPrevistos: d.diasPrevistos } : {}),
      ...(d.bairro !== undefined ? { bairro: d.bairro } : {}),
    })
    .where(eq(escolas.id, escola.id));

  await auditar(sessao, {
    acao: "alterar",
    entidade: "escola",
    entidadeId: escola.id,
    resumo: `dados de "${escola.nome}" atualizados${d.matriculasAtuais !== undefined ? ` — ${d.matriculasAtuais} alunos hoje` : ""}`,
  });
  revalidatePath(`/dashboard/secretarias/educacao/escolas/${escola.id}`);
  revalidatePath("/dashboard/secretarias/educacao");
  return { ok: true };
}

// ── OCORRÊNCIAS ──

const TIPOS = TIPOS_OCORRENCIA_ESCOLA.map((t) => t.chave) as [string, ...string[]];

const schemaOcorrencia = z.object({
  escolaId: z.string().min(1),
  tipo: z.enum(TIPOS),
  gravidade: z.enum(["atencao", "urgente"]).default("atencao"),
  descricao: z.string().trim().min(3, "Descreva em poucas palavras.").max(500),
  aulasPerdidas: z.coerce.number().int().min(0).max(200).optional(),
  alunosAfetados: z.coerce.number().int().min(0).max(100_000).optional(),
});

export async function registrarOcorrenciaEscola(formData: FormData): Promise<ResultadoEscola> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  const parsed = schemaOcorrencia.safeParse({
    escolaId: formData.get("escolaId"),
    tipo: formData.get("tipo"),
    gravidade: formData.get("gravidade") || "atencao",
    descricao: formData.get("descricao"),
    aulasPerdidas: formData.get("aulasPerdidas") || undefined,
    alunosAfetados: formData.get("alunosAfetados") || undefined,
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  // A direção da escola só registra na própria escola.
  if (!podeVerEscola(sessao, d.escolaId)) return { ok: false, erro: "Sem permissão para esta escola." };

  const [escola] = await db
    .select({ id: escolas.id, nome: escolas.nome })
    .from(escolas)
    .where(and(eq(escolas.id, d.escolaId), eq(escolas.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!escola) return { ok: false, erro: "Escola não encontrada." };

  await db.insert(ocorrenciasEscola).values({
    id: gerarId("ocesc"),
    prefeituraId: sessao.prefeituraId,
    escolaId: escola.id,
    tipo: d.tipo as (typeof TIPOS_OCORRENCIA_ESCOLA)[number]["chave"],
    gravidade: d.gravidade,
    descricao: d.descricao,
    aulasPerdidas: d.aulasPerdidas ?? null,
    alunosAfetados: d.alunosAfetados ?? null,
    registradoPor: sessao.nome,
  });
  await auditar(sessao, {
    acao: "criar",
    entidade: "escola",
    entidadeId: escola.id,
    resumo: `ocorrência em "${escola.nome}": ${d.tipo} (${d.gravidade}) — ${d.descricao}`,
  });
  revalidatePath(`/dashboard/secretarias/educacao/escolas/${escola.id}`);
  revalidatePath("/dashboard/secretarias/educacao");
  return { ok: true };
}

export async function resolverOcorrenciaEscola(id: string): Promise<ResultadoEscola> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  const [oc] = await db
    .select({ id: ocorrenciasEscola.id, escolaId: ocorrenciasEscola.escolaId, descricao: ocorrenciasEscola.descricao })
    .from(ocorrenciasEscola)
    .where(and(eq(ocorrenciasEscola.id, id), eq(ocorrenciasEscola.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!oc) return { ok: false, erro: "Ocorrência não encontrada." };
  if (!podeVerEscola(sessao, oc.escolaId)) return { ok: false, erro: "Sem permissão para esta escola." };
  await db
    .update(ocorrenciasEscola)
    .set({ status: "resolvida", resolvidaEm: new Date().toISOString() })
    .where(eq(ocorrenciasEscola.id, oc.id));
  await auditar(sessao, { acao: "resolver", entidade: "escola", entidadeId: oc.escolaId, resumo: `ocorrência resolvida: ${oc.descricao}` });
  revalidatePath(`/dashboard/secretarias/educacao/escolas/${oc.escolaId}`);
  revalidatePath("/dashboard/secretarias/educacao");
  return { ok: true };
}

/** Ocorrências abertas de todas as escolas — para o resumo da secretaria. */
export async function buscarOcorrenciasAbertasEscolas(prefeituraId: string) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId) return [];
  return db
    .select()
    .from(ocorrenciasEscola)
    .where(and(eq(ocorrenciasEscola.prefeituraId, prefeituraId), eq(ocorrenciasEscola.status, "aberta")))
    .orderBy(desc(ocorrenciasEscola.createdAt));
}

/**
 * Tudo o que aconteceu na rede no ano letivo corrente, aberto ou resolvido.
 * Dia de aula perdido não volta quando a ocorrência é resolvida — a conta
 * dos 200 dias precisa do histórico, não só do que está pendente.
 */
export async function buscarOcorrenciasDoAno(prefeituraId: string) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId) return [];
  const inicioDoAno = `${new Date().getUTCFullYear()}-01-01`;
  return db
    .select({
      escolaId: ocorrenciasEscola.escolaId,
      tipo: ocorrenciasEscola.tipo,
      aulasPerdidas: ocorrenciasEscola.aulasPerdidas,
    })
    .from(ocorrenciasEscola)
    .where(and(eq(ocorrenciasEscola.prefeituraId, prefeituraId), gte(ocorrenciasEscola.createdAt, inicioDoAno)));
}

/** O histórico completo de uma escola — para a ficha. */
export async function buscarOcorrenciasDaEscola(escolaId: string) {
  const sessao = await exigirAcesso();
  if (!sessao || !podeVerEscola(sessao, escolaId)) return [];
  return db
    .select()
    .from(ocorrenciasEscola)
    .where(and(eq(ocorrenciasEscola.escolaId, escolaId), eq(ocorrenciasEscola.prefeituraId, sessao.prefeituraId)))
    .orderBy(desc(ocorrenciasEscola.createdAt))
    .limit(60);
}

// ── ACESSO PRÓPRIO DA DIREÇÃO DA ESCOLA ──
//
// O dado nasce onde acontece. Pedir para o secretário digitar o que
// aconteceu em 22 escolas é a maneira errada — e é por isso que sistema de
// educação em prefeitura costuma estar vazio. A diretora entra com CPF e
// senha e cai direto na ficha da própria escola, só nela.

const schemaAcessoEscola = z.object({
  escolaId: z.string().min(1),
  nome: z.string().trim().min(3, "Informe o nome de quem vai usar."),
  documento: z.string().refine((v) => validarCpfOuCnpj(v), "CPF inválido."),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  senha: z.string(),
});

export async function criarAcessoEscola(formData: FormData): Promise<ResultadoEscola> {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirRede(sessao)) return { ok: false, erro: "Sem permissão para criar acessos." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração não é possível criar acessos." };

  const parsed = schemaAcessoEscola.safeParse({
    escolaId: formData.get("escolaId"),
    nome: formData.get("nome"),
    documento: formData.get("documento"),
    email: formData.get("email") || "",
    senha: formData.get("senha"),
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const forte = senhaForte(d.senha);
  if (!forte.ok) return { ok: false, erro: forte.motivo! };

  const [escola] = await db
    .select({ id: escolas.id, nome: escolas.nome })
    .from(escolas)
    .where(and(eq(escolas.id, d.escolaId), eq(escolas.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!escola) return { ok: false, erro: "Escola não encontrada." };

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
    cargo: "escola",
    escolaId: escola.id,
  });
  await auditar(sessao, { acao: "criar", entidade: "usuario", resumo: `"${d.nome}" (direção de ${escola.nome})` });
  revalidatePath(`/dashboard/secretarias/educacao/escolas/${escola.id}`);
  return { ok: true };
}

export async function removerAcessoEscola(usuarioId: string): Promise<ResultadoEscola> {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirRede(sessao)) return { ok: false, erro: "Sem permissão." };
  const [u] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, escolaId: usuarios.escolaId })
    .from(usuarios)
    .where(and(eq(usuarios.id, usuarioId), eq(usuarios.prefeituraId, sessao.prefeituraId), eq(usuarios.cargo, "escola")))
    .limit(1);
  if (!u) return { ok: false, erro: "Acesso não encontrado." };
  await db.delete(usuarios).where(eq(usuarios.id, u.id));
  await auditar(sessao, { acao: "excluir", entidade: "usuario", entidadeId: u.id, resumo: `"${u.nome}" (direção de escola)` });
  if (u.escolaId) revalidatePath(`/dashboard/secretarias/educacao/escolas/${u.escolaId}`);
  return { ok: true };
}

/** Quem tem acesso próprio a esta escola. */
export async function listarAcessosEscola(escolaId: string) {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirRede(sessao)) return [];
  return db
    .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, createdAt: usuarios.createdAt })
    .from(usuarios)
    .where(and(eq(usuarios.prefeituraId, sessao.prefeituraId), eq(usuarios.cargo, "escola"), eq(usuarios.escolaId, escolaId)));
}

// ── O QUE O CIDADÃO DISSE SOBRE A ESCOLA ──
// Manifestações da ouvidoria (Essencial) dos últimos 30 dias, para cruzar
// com as fichas. Sem o Essencial, a lista é vazia — e a leitura diz isso.

export async function buscarManifestacoesRecentesEducacao(prefeituraId: string) {
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

/** A rede inteira, com o que o Censo trouxe. */
export async function buscarRedeDeEscolas(prefeituraId: string) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId) return [];
  return db.select().from(escolas).where(eq(escolas.prefeituraId, prefeituraId)).orderBy(escolas.nome);
}
