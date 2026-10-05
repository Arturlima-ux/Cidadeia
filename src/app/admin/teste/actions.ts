"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { prefeituras, usuarios } from "@/db/schema";
import { lerSessao, criarSessao } from "@/lib/sessao";
import { PLANOS_ADDON } from "@/lib/planos";
import { emailDaEquipe, PREFEITURA_EQUIPE_ID, PREFEITURA_TESTE_ID } from "@/lib/equipe";

async function usuarioDaEquipe() {
  if (!(await emailDaEquipe())) return null;
  const sessao = await lerSessao();
  if (!sessao) return null;
  const [u] = await db
    .select({ id: usuarios.id, nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.id, sessao.usuarioId))
    .limit(1);
  return u ?? null;
}

/** Entra no painel de teste, criando a prefeitura de teste na primeira vez. */
export async function abrirPainelDeTeste(): Promise<void> {
  const u = await usuarioDaEquipe();
  if (!u) redirect("/login");

  // Sem município nenhum: o ambiente de teste não é nem finge ser uma
  // prefeitura real. Os dados de identificação são regravados a cada entrada,
  // para corrigir uma versão anterior que nascia como Teresina.
  const identidade = {
    nome: "Ambiente de teste",
    estado: "--",
    municipio: "Ambiente de teste",
    codigoIbge: null,
    populacao: null,
    prefeito: u.nome,
    planosContratados: JSON.stringify(PLANOS_ADDON.map((p) => p.chave)),
  };
  const [existe] = await db
    .select({ id: prefeituras.id })
    .from(prefeituras)
    .where(eq(prefeituras.id, PREFEITURA_TESTE_ID))
    .limit(1);
  if (existe) {
    await db.update(prefeituras).set(identidade).where(eq(prefeituras.id, PREFEITURA_TESTE_ID));
  } else {
    await db.insert(prefeituras).values({ id: PREFEITURA_TESTE_ID, cnpj: "TESTE-EQUIPE", ...identidade });
  }

  await criarSessao({ usuarioId: u.id, prefeituraId: PREFEITURA_TESTE_ID, nome: u.nome, cargo: "prefeito" });
  redirect("/dashboard");
}

/** Sai do painel de teste e volta para a mesa da equipe. */
export async function voltarParaMesa(): Promise<void> {
  const u = await usuarioDaEquipe();
  if (!u) redirect("/login");
  await criarSessao({ usuarioId: u.id, prefeituraId: PREFEITURA_EQUIPE_ID, nome: u.nome, cargo: "admin" });
  redirect("/admin/pedidos");
}
