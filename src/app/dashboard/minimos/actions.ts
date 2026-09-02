"use server";

import { z } from "zod";
import { db } from "@/db";
import { basesMinimos, investimentos } from "@/db/schema";
import { and, eq, like } from "drizzle-orm";
import { lerSessao } from "@/lib/sessao";
import { gerarId } from "@/lib/id";
import { AREAS_MINIMO, type AreaMinimo } from "@/lib/minimos-constitucionais";
import { revalidatePath } from "next/cache";

export type LinhaBase = {
  area: AreaMinimo;
  baseCalculo: number;
  aplicado: number;
  mesReferencia: number;
  origemAplicado: "manual" | "siconfi";
};

/**
 * Lê as bases informadas para um exercício.
 *
 * O prefeituraId vem SEMPRE da sessão, nunca do formulário — é o que impede
 * que alguém edite o valor de outro município trocando um campo escondido.
 */
export async function buscarBases(exercicio: number): Promise<LinhaBase[]> {
  const sessao = await lerSessao();
  if (!sessao) return [];

  const linhas = await db
    .select({
      area: basesMinimos.area,
      baseCalculo: basesMinimos.baseCalculo,
      aplicado: basesMinimos.aplicado,
      mesReferencia: basesMinimos.mesReferencia,
      origemAplicado: basesMinimos.origemAplicado,
    })
    .from(basesMinimos)
    .where(
      and(
        eq(basesMinimos.prefeituraId, sessao.prefeituraId),
        eq(basesMinimos.exercicio, exercicio)
      )
    );

  return linhas as LinhaBase[];
}

/**
 * Soma o que já foi lançado como investimento na área, no exercício.
 *
 * Serve para PRÉ-PREENCHER o campo "aplicado" — inclusive com o que veio do
 * SICONFI. Não substitui o número do contador: o último RREO publicado costuma
 * estar um bimestre atrás do que a prefeitura já empenhou, e é o gestor quem
 * decide qual dos dois vale.
 */
export async function somarAplicadoLancado(
  exercicio: number,
  area: AreaMinimo
): Promise<{ total: number; temSiconfi: boolean }> {
  const sessao = await lerSessao();
  if (!sessao) return { total: 0, temSiconfi: false };

  const linhas = await db
    .select({ valor: investimentos.valor, origem: investimentos.origem })
    .from(investimentos)
    .where(
      and(
        eq(investimentos.prefeituraId, sessao.prefeituraId),
        eq(investimentos.secretaria, area),
        like(investimentos.competencia, `${exercicio}-%`)
      )
    );

  return {
    total: linhas.reduce((s, l) => s + (l.valor ?? 0), 0),
    temSiconfi: linhas.some((l) => l.origem === "siconfi"),
  };
}

const schema = z.object({
  exercicio: z.coerce.number().int().min(2000).max(2100),
  area: z.enum(["educacao", "saude"]),
  baseCalculo: z.coerce.number().min(0),
  aplicado: z.coerce.number().min(0),
  mesReferencia: z.coerce.number().int().min(1).max(12),
  origemAplicado: z.enum(["manual", "siconfi"]).default("manual"),
});

export type ResultadoSalvar = { ok: true } | { ok: false; erro: string };

export async function salvarBase(formData: FormData): Promise<ResultadoSalvar> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  // Só o gabinete mexe nisto: o número alimenta a prestação de contas do
  // município inteiro, não de uma secretaria.
  if (sessao.cargo === "secretario") {
    return { ok: false, erro: "Apenas o prefeito ou um administrador pode informar a base de cálculo." };
  }

  const parsed = schema.safeParse({
    exercicio: formData.get("exercicio"),
    area: formData.get("area"),
    baseCalculo: formData.get("baseCalculo"),
    aplicado: formData.get("aplicado"),
    mesReferencia: formData.get("mesReferencia"),
    origemAplicado: formData.get("origemAplicado") || "manual",
  });

  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  const existente = await db
    .select({ id: basesMinimos.id })
    .from(basesMinimos)
    .where(
      and(
        eq(basesMinimos.prefeituraId, sessao.prefeituraId),
        eq(basesMinimos.exercicio, d.exercicio),
        eq(basesMinimos.area, d.area)
      )
    )
    .limit(1);

  const valores = {
    baseCalculo: d.baseCalculo,
    aplicado: d.aplicado,
    mesReferencia: d.mesReferencia,
    origemAplicado: d.origemAplicado,
    atualizadoEm: new Date().toISOString(),
  };

  if (existente[0]) {
    await db.update(basesMinimos).set(valores).where(eq(basesMinimos.id, existente[0].id));
  } else {
    await db.insert(basesMinimos).values({
      id: gerarId("base"),
      prefeituraId: sessao.prefeituraId,
      exercicio: d.exercicio,
      area: d.area,
      ...valores,
    });
  }

  revalidatePath("/dashboard/minimos");
  return { ok: true };
}

export { AREAS_MINIMO };
