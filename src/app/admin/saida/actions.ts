"use server";

import { revalidatePath } from "next/cache";
import { emailDaEquipe } from "@/lib/equipe";
import { resolverPendente } from "@/lib/caixa-de-saida";

/** "Já mandei": tira o e-mail da caixa de saída. Só a equipe. */
export async function marcarEnviado(id: string): Promise<{ ok: boolean }> {
  const autor = await emailDaEquipe();
  if (!autor || !/^saida_[A-Za-z0-9_-]{4,64}$/.test(id)) return { ok: false };
  await resolverPendente(id, autor);
  revalidatePath("/admin/saida");
  return { ok: true };
}
