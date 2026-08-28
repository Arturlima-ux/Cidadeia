"use server";

import { z } from "zod";
import { db } from "@/db";
import { investimentos, prefeituras } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { gerarId } from "@/lib/id";
import { lerSessao } from "@/lib/sessao";
import { revalidatePath } from "next/cache";
import { limitarUso } from "@/lib/rate-limit";
import { buscarPrefeitura } from "@/lib/dados-prefeitura";
import {
  buscarCodigoIbge,
  buscarDespesasSiconfi,
  competenciaDoBimestre,
} from "@/lib/siconfi";

const SECRETARIAS = ["saude", "educacao", "obras", "licitacoes"] as const;

/** Só prefeito/admin — investimento consolidado é visão de Gestão. */
async function exigirGestao() {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (sessao.cargo === "secretario") {
    throw new Error("Apenas o prefeito ou um administrador acessa o consolidado de investimentos.");
  }
  return sessao;
}

export async function buscarInvestimentos(prefeituraId: string) {
  const sessao = await lerSessao();
  if (!sessao || sessao.prefeituraId !== prefeituraId || sessao.cargo === "secretario") {
    return [];
  }
  return db
    .select()
    .from(investimentos)
    .where(eq(investimentos.prefeituraId, prefeituraId))
    .orderBy(desc(investimentos.competencia));
}

const schemaInvestimento = z.object({
  secretaria: z.enum(SECRETARIAS),
  valor: z.coerce.number().positive("O valor precisa ser maior que zero."),
  descricao: z.string().optional(),
  competencia: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Use o formato AAAA-MM (ex: 2026-08)."),
});

export type ResultadoInvestimento = { ok: true } | { ok: false; erro: string };

export async function registrarInvestimento(
  formData: FormData
): Promise<ResultadoInvestimento> {
  let sessao;
  try {
    sessao = await exigirGestao();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  const parsed = schemaInvestimento.safeParse({
    secretaria: formData.get("secretaria"),
    valor: formData.get("valor"),
    descricao: formData.get("descricao") || undefined,
    competencia: formData.get("competencia"),
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await db.insert(investimentos).values({
    id: gerarId("inv"),
    prefeituraId: sessao.prefeituraId,
    secretaria: parsed.data.secretaria,
    valor: parsed.data.valor,
    descricao: parsed.data.descricao ?? null,
    competencia: parsed.data.competencia,
  });

  revalidatePath("/dashboard/eficacia");
  return { ok: true };
}

export async function removerInvestimento(id: string) {
  const sessao = await exigirGestao();
  await db
    .delete(investimentos)
    .where(and(eq(investimentos.id, id), eq(investimentos.prefeituraId, sessao.prefeituraId)));
  revalidatePath("/dashboard/eficacia");
}

// ── IMPORTAÇÃO DO SICONFI (Tesouro Nacional) ──

export type ResultadoImportacao =
  | { ok: true; importados: number; total: number; instituicao: string | null; periodo: string }
  | { ok: false; erro: string };

const schemaImportacao = z.object({
  ano: z.coerce.number().int().min(2015).max(new Date().getFullYear()),
  bimestre: z.coerce.number().int().min(1).max(6),
});

/**
 * Puxa a despesa liquidada por função do RREO no Tesouro Nacional e grava
 * como investimento. Reimportar o MESMO período substitui só o que veio do
 * SICONFI — lançamento manual do gestor nunca é apagado.
 */
export async function importarDoSiconfi(formData: FormData): Promise<ResultadoImportacao> {
  let sessao;
  try {
    sessao = await exigirGestao();
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  const parsed = schemaImportacao.safeParse({
    ano: formData.get("ano"),
    bimestre: formData.get("bimestre"),
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Período inválido." };
  }
  const { ano, bimestre } = parsed.data;

  // A API do Tesouro é pública e gratuita — não abusar dela é
  // responsabilidade nossa, não deles.
  const podeUsar = await limitarUso(`siconfi:${sessao.prefeituraId}`, 10, 10);
  if (!podeUsar) {
    return { ok: false, erro: "Muitas importações seguidas — aguarde alguns minutos." };
  }

  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  if (!prefeitura) return { ok: false, erro: "Prefeitura não encontrada." };

  // Descobre o código IBGE na primeira vez e guarda, pra não consultar de novo.
  let codigoIbge = prefeitura.codigoIbge;
  if (!codigoIbge) {
    codigoIbge = await buscarCodigoIbge(prefeitura.municipio, prefeitura.estado);
    if (!codigoIbge) {
      return {
        ok: false,
        erro: `Não encontramos o município "${prefeitura.municipio}/${prefeitura.estado}" na base do IBGE. Confira o nome e a UF em Configurações.`,
      };
    }
    await db
      .update(prefeituras)
      .set({ codigoIbge })
      .where(eq(prefeituras.id, sessao.prefeituraId));
  }

  const resultado = await buscarDespesasSiconfi(codigoIbge, ano, bimestre);
  if (!resultado.ok) return resultado;

  const competencia = competenciaDoBimestre(ano, bimestre);

  // Idempotência: apaga só o que este mesmo período já trouxe do SICONFI.
  await db
    .delete(investimentos)
    .where(
      and(
        eq(investimentos.prefeituraId, sessao.prefeituraId),
        eq(investimentos.origem, "siconfi"),
        eq(investimentos.competencia, competencia)
      )
    );

  await db.insert(investimentos).values(
    resultado.despesas.map((d) => ({
      id: gerarId("inv"),
      prefeituraId: sessao.prefeituraId,
      secretaria: d.secretaria,
      valor: d.valor,
      descricao: `SICONFI ${bimestre}º bim/${ano} — função: ${d.funcoes.join(", ")}`,
      competencia,
      origem: "siconfi" as const,
    }))
  );

  revalidatePath("/dashboard/eficacia");
  return {
    ok: true,
    importados: resultado.despesas.length,
    total: resultado.despesas.reduce((a, d) => a + d.valor, 0),
    instituicao: resultado.instituicao,
    periodo: `${bimestre}º bimestre de ${ano}`,
  };
}
