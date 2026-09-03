"use server";

import { z } from "zod";
import { db } from "@/db";
import { despesaPessoal } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { lerSessao } from "@/lib/sessao";
import { gerarId } from "@/lib/id";
import { revalidatePath } from "next/cache";

export type LinhaPessoal = {
  exercicio: number;
  mesReferencia: number;
  rcl: number;
  despesa: number;
};

/**
 * Lê a série de períodos apurados.
 *
 * Traz mais de um exercício de propósito: o prazo de recondução do art. 23
 * atravessa a virada do ano, e cortar a leitura em 1º de janeiro faria um
 * estouro de setembro parecer novo em maio seguinte — zerando o prazo que na
 * verdade está correndo.
 *
 * O prefeituraId vem SEMPRE da sessão, nunca do formulário.
 */
export async function buscarPeriodos(limite = 8): Promise<LinhaPessoal[]> {
  const sessao = await lerSessao();
  if (!sessao) return [];

  const linhas = await db
    .select({
      exercicio: despesaPessoal.exercicio,
      mesReferencia: despesaPessoal.mesReferencia,
      rcl: despesaPessoal.rcl,
      despesa: despesaPessoal.despesa,
    })
    .from(despesaPessoal)
    .where(eq(despesaPessoal.prefeituraId, sessao.prefeituraId))
    .orderBy(desc(despesaPessoal.exercicio), desc(despesaPessoal.mesReferencia))
    .limit(limite);

  return linhas;
}

const schema = z.object({
  exercicio: z.coerce.number().int().min(2000).max(2100),
  mesReferencia: z.coerce.number().int().min(1).max(12),
  rcl: z.coerce.number().min(0),
  despesa: z.coerce.number().min(0),
});

export type ResultadoSalvarPessoal = { ok: true } | { ok: false; erro: string };

export async function salvarPeriodo(formData: FormData): Promise<ResultadoSalvarPessoal> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  // Mesma regra da base dos mínimos: o número é do município inteiro, não de
  // uma secretaria, e alimenta a prestação de contas do prefeito.
  if (sessao.cargo === "secretario") {
    return {
      ok: false,
      erro: "Apenas o prefeito ou um administrador pode informar a despesa com pessoal.",
    };
  }

  const parsed = schema.safeParse({
    exercicio: formData.get("exercicio"),
    mesReferencia: formData.get("mesReferencia"),
    rcl: formData.get("rcl"),
    despesa: formData.get("despesa"),
  });

  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  if (d.rcl <= 0) {
    // Deixar passar zero produziria uma divisão sem sentido lá na frente. Vale
    // barrar aqui, com a explicação que o gestor consegue agir sobre.
    return {
      ok: false,
      erro: "Informe a Receita Corrente Líquida do período — sem ela não há percentual a calcular.",
    };
  }

  const existente = await db
    .select({ id: despesaPessoal.id })
    .from(despesaPessoal)
    .where(
      and(
        eq(despesaPessoal.prefeituraId, sessao.prefeituraId),
        eq(despesaPessoal.exercicio, d.exercicio),
        eq(despesaPessoal.mesReferencia, d.mesReferencia)
      )
    )
    .limit(1);

  const valores = {
    rcl: d.rcl,
    despesa: d.despesa,
    atualizadoEm: new Date().toISOString(),
  };

  if (existente[0]) {
    // Reenviar o mesmo período corrige: o contador revisa a RCL depois de
    // fechada, e duas linhas para o mesmo mês virariam duas verdades.
    await db.update(despesaPessoal).set(valores).where(eq(despesaPessoal.id, existente[0].id));
  } else {
    await db.insert(despesaPessoal).values({
      id: gerarId("pessoal"),
      prefeituraId: sessao.prefeituraId,
      exercicio: d.exercicio,
      mesReferencia: d.mesReferencia,
      ...valores,
    });
  }

  revalidatePath("/dashboard/pessoal");
  revalidatePath("/dashboard");
  return { ok: true };
}
