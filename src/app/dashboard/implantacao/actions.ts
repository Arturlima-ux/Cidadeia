"use server";

import { db } from "@/db";
import { prefeituras } from "@/db/schema";
import { eq } from "drizzle-orm";
import { lerSessao } from "@/lib/sessao";
import { buscarPrefeitura } from "@/lib/dados-prefeitura";
import { buscarCodigoIbge } from "@/lib/siconfi";
import { buscarPopulacao } from "@/lib/populacao-ibge";
import { revalidatePath } from "next/cache";

export type ResultadoMunicipio =
  | { ok: true; codigoIbge: string; municipio: string; estado: string; populacao: number | null }
  | { ok: false; erro: string };

/**
 * Procura o município no IBGE pelo nome + UF do cadastro e grava o código.
 *
 * O mesmo que a importação do RGF faz por baixo dos panos — aqui vira um
 * passo visível, porque é ele que destrava as importações automáticas. Se o
 * IBGE não conhece o nome, a tela diz isso sem rodeio: para conta de teste
 * com município fictício é o esperado, e para município real é sinal de
 * erro no cadastro (nome de município se repete entre UFs).
 */
export async function confirmarMunicipio(): Promise<ResultadoMunicipio> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  if (sessao.cargo === "secretario") {
    return { ok: false, erro: "Apenas o prefeito ou um administrador pode fazer isto." };
  }

  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  if (!prefeitura) return { ok: false, erro: "Prefeitura não encontrada." };

  if (prefeitura.codigoIbge && prefeitura.populacao) {
    return {
      ok: true,
      codigoIbge: prefeitura.codigoIbge,
      municipio: prefeitura.municipio,
      estado: prefeitura.estado,
      populacao: prefeitura.populacao,
    };
  }

  const codigoIbge = prefeitura.codigoIbge ?? (await buscarCodigoIbge(prefeitura.municipio, prefeitura.estado));
  if (!codigoIbge) {
    return {
      ok: false,
      erro:
        `O IBGE não tem um município chamado "${prefeitura.municipio}" em ${prefeitura.estado}. ` +
        `Se esta é uma conta de teste com município fictício, é o esperado — os passos que ` +
        `dependem de dado público continuam disponíveis para município real. Se o município é ` +
        `real, confira o estado no cadastro.`,
    };
  }

  // ── A POPULAÇÃO VEM DO IBGE, NUNCA DO CADASTRO ──
  // O campo existia desde o início e nenhum código o gravava: ficava vazio
  // em toda prefeitura, e é ele que decide regras da LRF (RGF semestral) e
  // o porte do contrato. Declarado, seria a porta para uma capital contratar
  // como cidade de 10 mil habitantes. Do IBGE, é fato público.
  const populacao = await buscarPopulacao(codigoIbge);

  await db
    .update(prefeituras)
    .set({ codigoIbge, ...(populacao !== null ? { populacao } : {}) })
    .where(eq(prefeituras.id, sessao.prefeituraId));

  revalidatePath("/dashboard/implantacao");
  return { ok: true, codigoIbge, municipio: prefeitura.municipio, estado: prefeitura.estado, populacao };
}

/**
 * Encerra a lista. Não apaga nada, não bloqueia nada: só deixa de mandar o
 * prefeito para cá ao entrar. A tela continua acessível pelo menu, com os
 * passos que faltarem ainda pendentes.
 */
export async function concluirImplantacao(): Promise<{ ok: boolean }> {
  const sessao = await lerSessao();
  if (!sessao || sessao.cargo === "secretario") return { ok: false };

  await db
    .update(prefeituras)
    .set({ implantacaoConcluidaEm: new Date().toISOString() })
    .where(eq(prefeituras.id, sessao.prefeituraId));

  revalidatePath("/dashboard");
  return { ok: true };
}
