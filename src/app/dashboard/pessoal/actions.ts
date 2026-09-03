"use server";

import { z } from "zod";
import { db } from "@/db";
import { despesaPessoal, prefeituras } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { lerSessao } from "@/lib/sessao";
import { gerarId } from "@/lib/id";
import { revalidatePath } from "next/cache";
import { buscarPrefeitura } from "@/lib/dados-prefeitura";
import { buscarCodigoIbge } from "@/lib/siconfi";
import { buscarRgfMaisRecente } from "@/lib/siconfi-rgf";
import { LIMITE_PESSOAL } from "@/lib/despesa-pessoal";

export type LinhaPessoal = {
  exercicio: number;
  mesReferencia: number;
  rcl: number;
  despesa: number;
  origem: "manual" | "siconfi";
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
      origem: despesaPessoal.origem,
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
    origem: "manual" as const,
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

// ── IMPORTAÇÃO DO RGF ──
//
// O Relatório de Gestão Fiscal que a prefeitura já envia ao Tesouro traz, no
// Anexo 01, os dois números que esta tela pedia à mão. O botão poupa o
// trabalho e, mais importante, tira a digitação do caminho: RCL e despesa com
// pessoal são valores de nove dígitos, e um zero a mais move o percentual de
// 50% para 5%.

export type ResultadoImportacao =
  | { ok: true; mesReferencia: number; exercicio: number; percentual: number; instituicao: string | null }
  | { ok: false; erro: string };

export async function importarRgfDoSiconfi(): Promise<ResultadoImportacao> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  if (sessao.cargo === "secretario") {
    return {
      ok: false,
      erro: "Apenas o prefeito ou um administrador pode importar a despesa com pessoal.",
    };
  }

  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  if (!prefeitura) return { ok: false, erro: "Prefeitura não encontrada." };

  // O código IBGE é a chave da consulta. Se ainda não foi descoberto, acha
  // agora pelo nome + UF e guarda — na próxima importação já está pronto.
  let codigoIbge = prefeitura.codigoIbge;
  if (!codigoIbge) {
    codigoIbge = await buscarCodigoIbge(prefeitura.municipio, prefeitura.estado);
    if (!codigoIbge) {
      // Acontece em dois casos que o gestor precisa distinguir: conta de
      // teste com município inventado, e cadastro com a UF errada — como
      // "Barro Duro/CE", que existe, mas no Piauí. Nos dois a busca falha
      // igual, e sem a explicação a tela parece defeituosa.
      return {
        ok: false,
        erro:
          `O Tesouro não conhece um município chamado "${prefeitura.municipio}" em ${prefeitura.estado}. ` +
          `Se esta é uma conta de teste com município fictício, é o esperado — a importação só existe ` +
          `para município real. Se não for, confira o estado no cadastro: nome de município se repete ` +
          `entre UFs, e um errado impede a busca. Enquanto isso, informe os valores à mão abaixo.`,
      };
    }
    await db
      .update(prefeituras)
      .set({ codigoIbge })
      .where(eq(prefeituras.id, sessao.prefeituraId));
  }

  const agora = new Date();
  const resultado = await buscarRgfMaisRecente(
    codigoIbge,
    agora.getFullYear(),
    agora.getMonth() + 1
  );
  if (!resultado.ok) return { ok: false, erro: resultado.erro };

  const { dados } = resultado;

  // Confere a nossa régua contra a do Tesouro antes de gravar. Se o limite que
  // ele publica não representar 54% da RCL ajustada, alguma premissa mudou —
  // e é melhor recusar do que gravar um número que a tela vai julgar por uma
  // régua que não vale mais.
  if (dados.limiteMaximo > 0) {
    const limitePublicado = (dados.limiteMaximo / dados.rclAjustada) * 100;
    if (Math.abs(limitePublicado - LIMITE_PESSOAL) > 0.5) {
      return {
        ok: false,
        erro:
          `O Tesouro publicou para este município um limite de ${limitePublicado.toFixed(1).replace(".", ",")}% ` +
          `da RCL, e não os ${LIMITE_PESSOAL}% que esta tela usa. Confira com o contador antes de importar.`,
      };
    }
  }

  const { exercicio: exercicioRgf, mesReferencia } = dados.periodo;

  const existente = await db
    .select({ id: despesaPessoal.id })
    .from(despesaPessoal)
    .where(
      and(
        eq(despesaPessoal.prefeituraId, sessao.prefeituraId),
        eq(despesaPessoal.exercicio, exercicioRgf),
        eq(despesaPessoal.mesReferencia, mesReferencia)
      )
    )
    .limit(1);

  const valores = {
    // Grava a AJUSTADA: é sobre ela que o art. 20, § 6º manda calcular o
    // limite. A RCL cheia daria um percentual menor que o oficial, dizendo ao
    // prefeito que ele tem folga que não tem.
    rcl: dados.rclAjustada,
    despesa: dados.despesaTotal,
    origem: "siconfi" as const,
    atualizadoEm: new Date().toISOString(),
  };

  if (existente[0]) {
    await db.update(despesaPessoal).set(valores).where(eq(despesaPessoal.id, existente[0].id));
  } else {
    await db.insert(despesaPessoal).values({
      id: gerarId("pessoal"),
      prefeituraId: sessao.prefeituraId,
      exercicio: exercicioRgf,
      mesReferencia,
      ...valores,
    });
  }

  revalidatePath("/dashboard/pessoal");
  revalidatePath("/dashboard");

  return {
    ok: true,
    exercicio: exercicioRgf,
    mesReferencia,
    percentual: (dados.despesaTotal / dados.rclAjustada) * 100,
    instituicao: dados.instituicao,
  };
}
