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

  const [existe] = await db
    .select({ id: prefeituras.id })
    .from(prefeituras)
    .where(eq(prefeituras.id, PREFEITURA_TESTE_ID))
    .limit(1);
  if (!existe) {
    await db.insert(prefeituras).values({
      id: PREFEITURA_TESTE_ID,
      nome: "Prefeitura de Teste da Equipe",
      // Teresina: código IBGE e população reais, para o Raio-X, o RGF e os
      // painéis que consultam o Tesouro terem o que mostrar.
      estado: "PI",
      municipio: "Teresina",
      codigoIbge: "2211001",
      populacao: 908012,
      cnpj: "TESTE-EQUIPE",
      prefeito: u.nome,
      planosContratados: JSON.stringify(PLANOS_ADDON.map((p) => p.chave)),
    });
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
