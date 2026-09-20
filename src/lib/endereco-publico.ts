import { eq } from "drizzle-orm";
import { db } from "@/db";
import { configPublica, prefeituras } from "@/db/schema";
import { gerarSlug } from "@/lib/atendimento";
import { planosContratadosDe } from "@/lib/planos";

// ── TODA PREFEITURA TEM ENDEREÇO PÚBLICO ──
//
// O endereço /transparencia/<slug> nascia só quando o prefeito configurava
// o portal, dentro do módulo Essencial. Sem o Essencial, o município não
// existia para o cidadão. Agora o endereço nasce com a conta, e o que
// aparece nele depende do que foi contratado:
//
//   - sem Essencial: o portal MÍNIMO — identificação da prefeitura, canais
//     de atendimento e o dado público do Tesouro (Raio-X). Nada que a
//     prefeitura não queira ver publicado; nada que a lei não deixe.
//   - com Essencial: o portal completo — protocolo, ouvidoria, publicações.
//
// O slug é gerado uma vez e nunca muda: pode já ter sido divulgado em
// material impresso, no site da prefeitura ou nas redes sociais.

export type ModoDoPortal = "completo" | "minimo";

/** Decisão pura, testável: o que o endereço público mostra. */
export function modoDoPortal(planosContratadosRaw: string | null | undefined): ModoDoPortal {
  return planosContratadosDe(planosContratadosRaw).includes("essencial") ? "completo" : "minimo";
}

/** Slug único a partir de município + UF; sufixo numérico em caso de colisão. */
export async function slugLivre(municipio: string, estado: string): Promise<string> {
  const base = gerarSlug(municipio, estado);
  let slug = base;
  for (let n = 2; n <= 50; n++) {
    const [conflito] = await db.select({ p: configPublica.prefeituraId }).from(configPublica).where(eq(configPublica.slug, slug)).limit(1);
    if (!conflito) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Garante que a prefeitura tem endereço público. Devolve o slug. Idempotente:
 * quem já tem, mantém o que tem (inclusive as escolhas do portal).
 */
export async function garantirEnderecoPublico(prefeituraId: string): Promise<string | null> {
  const [existente] = await db
    .select({ slug: configPublica.slug })
    .from(configPublica)
    .where(eq(configPublica.prefeituraId, prefeituraId))
    .limit(1);
  if (existente) return existente.slug;

  const [pref] = await db
    .select({ municipio: prefeituras.municipio, estado: prefeituras.estado })
    .from(prefeituras)
    .where(eq(prefeituras.id, prefeituraId))
    .limit(1);
  if (!pref) return null;

  const slug = await slugLivre(pref.municipio, pref.estado);
  try {
    await db.insert(configPublica).values({
      prefeituraId,
      slug,
      // Ligado desde o início: o portal mínimo só mostra o que já é público.
      portalAtivo: true,
      atualizadoEm: new Date().toISOString(),
    });
    return slug;
  } catch (e) {
    // Corrida entre duas requisições: a outra já criou. Relê.
    console.error("[endereco-publico] não foi possível criar:", e);
    const [depois] = await db.select({ slug: configPublica.slug }).from(configPublica).where(eq(configPublica.prefeituraId, prefeituraId)).limit(1);
    return depois?.slug ?? null;
  }
}
