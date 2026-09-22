"use server";

import { z } from "zod";
import { and, eq, desc, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { unidadesSaude, ocorrenciasSaude, prefeituras } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
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
  if (!sessao) return { ok: false, erro: "Sem permissão." };
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
