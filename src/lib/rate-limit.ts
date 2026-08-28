import { db } from "@/db";
import { tentativasLogin, limitesUso } from "@/db/schema";
import { eq } from "drizzle-orm";

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

/** Se o documento está bloqueado agora, retorna quantos minutos faltam. */
export async function verificarBloqueio(documento: string): Promise<number | null> {
  const [linha] = await db
    .select()
    .from(tentativasLogin)
    .where(eq(tentativasLogin.documento, documento))
    .limit(1);

  if (!linha?.bloqueadoAte) return null;

  const restanteMs = new Date(linha.bloqueadoAte).getTime() - Date.now();
  if (restanteMs <= 0) return null;

  return Math.ceil(restanteMs / 60000);
}

/** Registra uma tentativa falha. Bloqueia por BLOQUEIO_MINUTOS ao atingir o limite. */
export async function registrarTentativaFalha(documento: string): Promise<void> {
  const [linha] = await db
    .select()
    .from(tentativasLogin)
    .where(eq(tentativasLogin.documento, documento))
    .limit(1);

  const tentativas = (linha?.tentativas ?? 0) + 1;
  const bloqueadoAte =
    tentativas >= MAX_TENTATIVAS
      ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60000).toISOString()
      : null;

  if (linha) {
    await db
      .update(tentativasLogin)
      .set({
        tentativas: bloqueadoAte ? 0 : tentativas,
        bloqueadoAte,
        ultimaTentativa: new Date().toISOString(),
      })
      .where(eq(tentativasLogin.documento, documento));
  } else {
    await db.insert(tentativasLogin).values({
      documento,
      tentativas,
      bloqueadoAte,
      ultimaTentativa: new Date().toISOString(),
    });
  }
}

/** Limpa o contador — chamado em todo login bem-sucedido. */
export async function limparTentativas(documento: string): Promise<void> {
  await db.delete(tentativasLogin).where(eq(tentativasLogin.documento, documento));
}

/**
 * Limite genérico por janela de tempo fixa — usado em endpoints caros
 * (chamadas de IA) pra evitar abuso/custo descontrolado por uma conta.
 * Retorna true se a chamada pode prosseguir; false se estourou o limite.
 */
export async function limitarUso(
  chave: string,
  maxPorJanela: number,
  janelaMinutos: number
): Promise<boolean> {
  const [linha] = await db
    .select()
    .from(limitesUso)
    .where(eq(limitesUso.chave, chave))
    .limit(1);

  const agora = Date.now();
  const janelaExpirada =
    !linha || agora - new Date(linha.janelaInicio).getTime() > janelaMinutos * 60000;

  if (janelaExpirada) {
    await db
      .insert(limitesUso)
      .values({ chave, contagem: 1, janelaInicio: new Date().toISOString() })
      .onConflictDoUpdate({
        target: limitesUso.chave,
        set: { contagem: 1, janelaInicio: new Date().toISOString() },
      });
    return true;
  }

  if (linha.contagem >= maxPorJanela) return false;

  await db
    .update(limitesUso)
    .set({ contagem: linha.contagem + 1 })
    .where(eq(limitesUso.chave, chave));
  return true;
}
