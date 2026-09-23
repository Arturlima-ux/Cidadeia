"use server";

import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { estoqueMerenda, pnaeCompras, pnaeRepasses, escolas } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { lerSessao, temAcessoSecretaria, podeVerEscola, ehGestor } from "@/lib/sessao";
import { auditar } from "@/lib/auditoria";
import { itemDoCatalogoMerenda } from "@/lib/merenda";
import { MODALIDADES_COMPRA, MOTIVOS_DISPENSA_AF } from "@/lib/pnae";

// ── A MERENDA: O QUE TEM NA COZINHA E O QUE FOI COMPRADO ──
//
// Duas coisas diferentes no mesmo módulo, de propósito. O estoque é o
// operacional que a escola toca todo dia. As compras do PNAE são o que o
// FNDE cobra no fim do ano — e a conta dos 30% da agricultura familiar só
// fecha se alguém lançar compra por compra durante o ano.

async function exigirAcesso() {
  const sessao = await lerSessao();
  if (!sessao || !temAcessoSecretaria(sessao, "educacao")) return null;
  return sessao;
}

function podeGerirRede(sessao: { cargo: string; secretaria?: string | null }): boolean {
  return ehGestor(sessao) || (sessao.cargo === "secretario" && sessao.secretaria === "educacao");
}

export type ResultadoMerenda = { ok: true } | { ok: false; erro: string };

// ── ESTOQUE DA COZINHA ──

const schemaContagem = z.object({
  escolaId: z.string().min(1),
  item: z.string().trim().min(2, "Informe o item.").max(80),
  categoria: z.enum(["hortifruti", "proteina", "graos", "laticinio", "panificacao", "mercearia", "outro"]).default("outro"),
  unidadeMedida: z.string().trim().max(20).default("kg"),
  saldo: z.coerce.number().min(0).max(1_000_000),
  consumoDiario: z.coerce.number().min(0).max(100_000),
});

/**
 * Uma linha por item por escola: a contagem nova substitui a anterior.
 * Histórico de contagem não ajuda ninguém a cozinhar — o que importa é
 * quanto tem hoje e quanto sai por dia de aula.
 */
export async function registrarContagemMerenda(formData: FormData): Promise<ResultadoMerenda> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };

  const nomeItem = String(formData.get("item") ?? "").trim();
  const doCatalogo = itemDoCatalogoMerenda(nomeItem);
  const parsed = schemaContagem.safeParse({
    escolaId: formData.get("escolaId"),
    item: nomeItem,
    categoria: doCatalogo?.categoria ?? formData.get("categoria") ?? "outro",
    unidadeMedida: doCatalogo?.unidade ?? formData.get("unidadeMedida") ?? "kg",
    saldo: formData.get("saldo"),
    consumoDiario: formData.get("consumoDiario"),
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

  const agora = new Date().toISOString();
  const [existente] = await db
    .select({ id: estoqueMerenda.id })
    .from(estoqueMerenda)
    .where(and(eq(estoqueMerenda.escolaId, escola.id), eq(estoqueMerenda.item, d.item)))
    .limit(1);

  if (existente) {
    await db
      .update(estoqueMerenda)
      .set({
        categoria: d.categoria,
        unidadeMedida: d.unidadeMedida,
        saldo: d.saldo,
        consumoDiario: d.consumoDiario,
        atualizadoPor: sessao.nome,
        atualizadoEm: agora,
      })
      .where(eq(estoqueMerenda.id, existente.id));
  } else {
    await db.insert(estoqueMerenda).values({
      id: gerarId("merenda"),
      prefeituraId: sessao.prefeituraId,
      escolaId: escola.id,
      item: d.item,
      categoria: d.categoria,
      unidadeMedida: d.unidadeMedida,
      saldo: d.saldo,
      consumoDiario: d.consumoDiario,
      atualizadoPor: sessao.nome,
      atualizadoEm: agora,
    });
  }

  await auditar(sessao, {
    acao: "alterar",
    entidade: "escola",
    entidadeId: escola.id,
    resumo: `merenda de "${escola.nome}": ${d.item} — saldo ${d.saldo} ${d.unidadeMedida}, ${d.consumoDiario}/dia de aula`,
  });
  revalidatePath(`/dashboard/secretarias/educacao/escolas/${escola.id}`);
  revalidatePath("/dashboard/secretarias/educacao/merenda");
  return { ok: true };
}

export async function removerItemMerenda(id: string): Promise<ResultadoMerenda> {
  const sessao = await exigirAcesso();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  const [l] = await db
    .select({ id: estoqueMerenda.id, escolaId: estoqueMerenda.escolaId, item: estoqueMerenda.item })
    .from(estoqueMerenda)
    .where(and(eq(estoqueMerenda.id, id), eq(estoqueMerenda.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!l) return { ok: false, erro: "Item não encontrado." };
  if (!podeVerEscola(sessao, l.escolaId)) return { ok: false, erro: "Sem permissão para esta escola." };
  await db.delete(estoqueMerenda).where(eq(estoqueMerenda.id, l.id));
  await auditar(sessao, { acao: "excluir", entidade: "escola", entidadeId: l.escolaId, resumo: `item da merenda removido: ${l.item}` });
  revalidatePath(`/dashboard/secretarias/educacao/escolas/${l.escolaId}`);
  revalidatePath("/dashboard/secretarias/educacao/merenda");
  return { ok: true };
}

/** O estoque de uma escola — para a ficha. */
export async function buscarMerendaDaEscola(escolaId: string) {
  const sessao = await exigirAcesso();
  if (!sessao || !podeVerEscola(sessao, escolaId)) return [];
  return db
    .select()
    .from(estoqueMerenda)
    .where(and(eq(estoqueMerenda.escolaId, escolaId), eq(estoqueMerenda.prefeituraId, sessao.prefeituraId)));
}

/** O estoque de toda a rede — para o resumo e o pedido de reposição. */
export async function buscarMerendaDaRede(prefeituraId: string) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId || sessao.cargo === "escola") return [];
  return db.select().from(estoqueMerenda).where(eq(estoqueMerenda.prefeituraId, prefeituraId));
}

// ── COMPRAS DO PNAE E OS 30% DA AGRICULTURA FAMILIAR ──

const MODALIDADES = MODALIDADES_COMPRA.map((m) => m.chave) as [string, ...string[]];

const schemaCompra = z.object({
  ano: z.coerce.number().int().min(2007).max(2100),
  descricao: z.string().trim().min(3, "Descreva o que foi comprado.").max(200),
  fornecedor: z.string().trim().max(160).optional(),
  valor: z.coerce.number().positive("Informe o valor da compra.").max(1_000_000_000),
  agriculturaFamiliar: z.boolean().default(false),
  modalidade: z.enum(MODALIDADES).default("outra"),
  documento: z.string().trim().max(80).optional(),
  dataCompra: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da compra."),
});

export async function registrarCompraPnae(formData: FormData): Promise<ResultadoMerenda> {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirRede(sessao)) return { ok: false, erro: "Sem permissão." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração os dados são fictícios e não são alterados." };

  const parsed = schemaCompra.safeParse({
    ano: formData.get("ano"),
    descricao: formData.get("descricao"),
    fornecedor: formData.get("fornecedor") || undefined,
    valor: formData.get("valor"),
    agriculturaFamiliar: formData.get("agriculturaFamiliar") === "on",
    modalidade: formData.get("modalidade") || "outra",
    documento: formData.get("documento") || undefined,
    dataCompra: formData.get("dataCompra"),
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  await db.insert(pnaeCompras).values({
    id: gerarId("pnaec"),
    prefeituraId: sessao.prefeituraId,
    ano: d.ano,
    descricao: d.descricao,
    fornecedor: d.fornecedor ?? null,
    valor: d.valor,
    agriculturaFamiliar: d.agriculturaFamiliar,
    modalidade: d.modalidade as (typeof MODALIDADES_COMPRA)[number]["chave"],
    documento: d.documento ?? null,
    dataCompra: d.dataCompra,
    registradoPor: sessao.nome,
  });

  await auditar(sessao, {
    acao: "criar",
    entidade: "financeiro",
    resumo: `compra do PNAE ${d.ano}: ${d.descricao} — ${d.valor}${d.agriculturaFamiliar ? " (agricultura familiar)" : ""}`,
  });
  revalidatePath("/dashboard/secretarias/educacao/merenda");
  return { ok: true };
}

export async function removerCompraPnae(id: string): Promise<ResultadoMerenda> {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirRede(sessao)) return { ok: false, erro: "Sem permissão." };
  const [c] = await db
    .select({ id: pnaeCompras.id, descricao: pnaeCompras.descricao })
    .from(pnaeCompras)
    .where(and(eq(pnaeCompras.id, id), eq(pnaeCompras.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!c) return { ok: false, erro: "Compra não encontrada." };
  await db.delete(pnaeCompras).where(eq(pnaeCompras.id, c.id));
  await auditar(sessao, { acao: "excluir", entidade: "financeiro", entidadeId: c.id, resumo: `compra do PNAE removida: ${c.descricao}` });
  revalidatePath("/dashboard/secretarias/educacao/merenda");
  return { ok: true };
}

const MOTIVOS = MOTIVOS_DISPENSA_AF.map((m) => m.chave) as [string, ...string[]];

const schemaRepasse = z.object({
  ano: z.coerce.number().int().min(2007).max(2100),
  valor: z.coerce.number().min(0).max(10_000_000_000),
  motivoDispensa: z.enum(MOTIVOS).optional(),
  observacao: z.string().trim().max(300).optional(),
});

/**
 * O repasse do ano é o denominador dos 30%. Uma linha por ano; lançar de
 * novo corrige o valor.
 */
export async function registrarRepassePnae(formData: FormData): Promise<ResultadoMerenda> {
  const sessao = await lerSessao();
  if (!sessao || !podeGerirRede(sessao)) return { ok: false, erro: "Sem permissão." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração os dados são fictícios e não são alterados." };

  const parsed = schemaRepasse.safeParse({
    ano: formData.get("ano"),
    valor: formData.get("valor"),
    motivoDispensa: formData.get("motivoDispensa") || undefined,
    observacao: formData.get("observacao") || undefined,
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const agora = new Date().toISOString();

  const [existente] = await db
    .select({ id: pnaeRepasses.id })
    .from(pnaeRepasses)
    .where(and(eq(pnaeRepasses.prefeituraId, sessao.prefeituraId), eq(pnaeRepasses.ano, d.ano)))
    .limit(1);

  const valores = {
    valor: d.valor,
    motivoDispensa: (d.motivoDispensa ?? null) as MotivoDispensa,
    observacao: d.observacao ?? null,
    registradoPor: sessao.nome,
    atualizadoEm: agora,
  };

  if (existente) {
    await db.update(pnaeRepasses).set(valores).where(eq(pnaeRepasses.id, existente.id));
  } else {
    await db.insert(pnaeRepasses).values({
      id: gerarId("pnaer"),
      prefeituraId: sessao.prefeituraId,
      ano: d.ano,
      ...valores,
    });
  }

  await auditar(sessao, { acao: "alterar", entidade: "financeiro", resumo: `repasse do PNAE ${d.ano} informado: ${d.valor}` });
  revalidatePath("/dashboard/secretarias/educacao/merenda");
  return { ok: true };
}

type MotivoDispensa = "sem_nota" | "sem_regularidade" | "sanitario" | null;

export async function buscarComprasPnae(prefeituraId: string, ano: number) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId || sessao.cargo === "escola") return [];
  return db
    .select()
    .from(pnaeCompras)
    .where(and(eq(pnaeCompras.prefeituraId, prefeituraId), eq(pnaeCompras.ano, ano)))
    .orderBy(desc(pnaeCompras.dataCompra));
}

export async function buscarRepassePnae(prefeituraId: string, ano: number) {
  const sessao = await exigirAcesso();
  if (!sessao || sessao.prefeituraId !== prefeituraId || sessao.cargo === "escola") return null;
  const [r] = await db
    .select()
    .from(pnaeRepasses)
    .where(and(eq(pnaeRepasses.prefeituraId, prefeituraId), eq(pnaeRepasses.ano, ano)))
    .limit(1);
  return r ?? null;
}
