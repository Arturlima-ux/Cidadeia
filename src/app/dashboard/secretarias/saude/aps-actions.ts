"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { apsResultados } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { lerSessao, temAcessoSecretaria, ehGestor } from "@/lib/sessao";
import { auditar } from "@/lib/auditoria";
import { INDICADORES_APS, indicadorAps } from "@/lib/aps";

// ── LANÇAMENTO DOS INDICADORES DA APS ──
// Quem lança é a secretaria de saúde (ou gestor): o número sai do painel
// do SIAPS, que só o município acessa. A gerência de unidade não entra
// aqui — o indicador é da equipe, não da unidade.

async function exigirSecretariaSaude() {
  const sessao = await lerSessao();
  if (!sessao || sessao.cargo === "unidade") return null;
  if (!temAcessoSecretaria(sessao, "saude") && !ehGestor(sessao)) return null;
  return sessao;
}

const schema = z.object({
  indicador: z.string().refine((v) => INDICADORES_APS.some((i) => i.chave === v), "Indicador desconhecido."),
  equipe: z.string().trim().max(80).optional().or(z.literal("")),
  ano: z.coerce.number().int().min(2024).max(2100),
  quadrimestre: z.coerce.number().int().min(1).max(3),
  resultado: z.coerce.number().min(0).max(1000),
  meta: z.union([z.coerce.number().min(0).max(1000), z.literal("")]).optional(),
  observacao: z.string().trim().max(300).optional().or(z.literal("")),
});

export type ResultadoAps = { ok: true } | { ok: false; erro: string };

export async function lancarResultadoAps(formData: FormData): Promise<ResultadoAps> {
  const sessao = await exigirSecretariaSaude();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração os resultados são fictícios." };

  const parsed = schema.safeParse({
    indicador: formData.get("indicador"),
    equipe: formData.get("equipe") ?? "",
    ano: formData.get("ano"),
    quadrimestre: formData.get("quadrimestre"),
    resultado: formData.get("resultado"),
    meta: formData.get("meta") === "" ? "" : formData.get("meta"),
    observacao: formData.get("observacao") ?? "",
  });
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const equipe = d.equipe ? d.equipe : null;
  const meta = typeof d.meta === "number" ? d.meta : null;
  const agora = new Date().toISOString();

  // Uma linha por indicador/equipe/quadrimestre: lançar de novo corrige.
  // Sem ON CONFLICT porque a chave inclui COALESCE(equipe, "") — expressão
  // que o alvo do upsert não aceita.
  const [existente] = await db
    .select({ id: apsResultados.id })
    .from(apsResultados)
    .where(
      and(
        eq(apsResultados.prefeituraId, sessao.prefeituraId),
        eq(apsResultados.indicador, d.indicador),
        equipe === null ? isNull(apsResultados.equipe) : eq(apsResultados.equipe, equipe),
        eq(apsResultados.ano, d.ano),
        eq(apsResultados.quadrimestre, d.quadrimestre)
      )
    )
    .limit(1);
  if (existente) {
    await db
      .update(apsResultados)
      .set({ resultado: d.resultado, meta, observacao: d.observacao || null, registradoPor: sessao.nome, atualizadoEm: agora })
      .where(eq(apsResultados.id, existente.id));
  } else {
    await db.insert(apsResultados).values({
      id: gerarId("aps"),
      prefeituraId: sessao.prefeituraId,
      indicador: d.indicador,
      equipe,
      ano: d.ano,
      quadrimestre: d.quadrimestre,
      resultado: d.resultado,
      meta,
      observacao: d.observacao || null,
      registradoPor: sessao.nome,
      atualizadoEm: agora,
    });
  }

  await auditar(sessao, {
    acao: "alterar",
    entidade: "indicador",
    resumo: `APS ${indicadorAps(d.indicador)?.nome ?? d.indicador}${equipe ? ` (${equipe})` : ""} — ${d.quadrimestre}º quadr. ${d.ano}: ${d.resultado}%${meta !== null ? ` (meta ${meta}%)` : ""}`,
  });
  revalidatePath("/dashboard/secretarias/saude/aps");
  revalidatePath("/dashboard/secretarias/saude");
  return { ok: true };
}

export async function removerResultadoAps(id: string): Promise<ResultadoAps> {
  const sessao = await exigirSecretariaSaude();
  if (!sessao) return { ok: false, erro: "Sem permissão." };
  const [l] = await db
    .select({ id: apsResultados.id, indicador: apsResultados.indicador, ano: apsResultados.ano, quadrimestre: apsResultados.quadrimestre })
    .from(apsResultados)
    .where(and(eq(apsResultados.id, id), eq(apsResultados.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  if (!l) return { ok: false, erro: "Lançamento não encontrado." };
  await db.delete(apsResultados).where(eq(apsResultados.id, l.id));
  await auditar(sessao, { acao: "excluir", entidade: "indicador", entidadeId: l.id, resumo: `APS ${indicadorAps(l.indicador)?.nome ?? l.indicador} — ${l.quadrimestre}º quadr. ${l.ano}` });
  revalidatePath("/dashboard/secretarias/saude/aps");
  return { ok: true };
}

/** Resultados de um quadrimestre. */
export async function buscarResultadosAps(prefeituraId: string, ano: number, quadrimestre: number) {
  const sessao = await exigirSecretariaSaude();
  if (!sessao || sessao.prefeituraId !== prefeituraId) return [];
  try {
    return await db
      .select()
      .from(apsResultados)
      .where(and(eq(apsResultados.prefeituraId, prefeituraId), eq(apsResultados.ano, ano), eq(apsResultados.quadrimestre, quadrimestre)));
  } catch (e) {
    console.error("[aps] não foi possível ler:", e);
    return [];
  }
}
