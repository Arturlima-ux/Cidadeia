"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pedidosProposta, prefeituras, usuarios, auditoria } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { lerSessao } from "@/lib/sessao";
import { enviarEmail } from "@/lib/email";
import { NOME_PLANO_ADDON } from "@/lib/planos";
import { ativarModulos, ehAdmin, modulosDoPedido, PROXIMO_STATUS, type StatusPedido } from "@/lib/pedidos";

// ── QUEM AVANÇA O PEDIDO É A EQUIPE ──
// Cada ação confere de novo que quem chama é admin (ADMIN_EMAILS). A tela
// esconde os botões, mas a ação é o que protege.

export type ResultadoAdmin = { ok: true; aviso?: string } | { ok: false; erro: string };

async function exigirAdmin(): Promise<boolean> {
  const sessao = await lerSessao();
  if (!sessao || sessao.demo) return false;
  const [u] = await db.select({ email: usuarios.email }).from(usuarios).where(eq(usuarios.id, sessao.usuarioId)).limit(1);
  return ehAdmin(u?.email);
}

/**
 * recebido → proposta_enviada: só marca. proposta_enviada → contratado: liga
 * os módulos do pedido na conta vinculada, marca a data e avisa o cliente.
 */
export async function avancarPedido(pedidoId: string): Promise<ResultadoAdmin> {
  if (!(await exigirAdmin())) return { ok: false, erro: "Sem permissão." };

  const [pedido] = await db.select().from(pedidosProposta).where(eq(pedidosProposta.id, pedidoId)).limit(1);
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };

  const atual = pedido.status as StatusPedido;
  const proximo = PROXIMO_STATUS[atual];
  if (!proximo) return { ok: false, erro: "Este pedido já está contratado." };

  if (proximo === "proposta_enviada") {
    await db.update(pedidosProposta).set({ status: proximo }).where(eq(pedidosProposta.id, pedidoId));
    revalidatePath("/admin/pedidos");
    return { ok: true };
  }

  // contratado: precisa de conta para ligar os módulos
  if (!pedido.prefeituraId) {
    return {
      ok: false,
      erro: "O pedido ainda não tem conta. Mande ao cliente o link de cadastro (ao lado) e ative depois.",
    };
  }
  const [pref] = await db
    .select({ id: prefeituras.id, nome: prefeituras.nome, planosContratados: prefeituras.planosContratados })
    .from(prefeituras)
    .where(eq(prefeituras.id, pedido.prefeituraId))
    .limit(1);
  if (!pref) return { ok: false, erro: "A conta vinculada não existe mais." };

  const modulos = modulosDoPedido(pedido.modulos);
  if (modulos.length === 0) return { ok: false, erro: "O pedido não tem módulo nenhum para ativar." };

  const agora = new Date().toISOString();
  const nomes = modulos.map((m) => NOME_PLANO_ADDON[m]);
  await db
    .update(prefeituras)
    .set({ planosContratados: ativarModulos(pref.planosContratados, modulos) })
    .where(eq(prefeituras.id, pref.id));
  await db.update(pedidosProposta).set({ status: "contratado", contratadoEm: agora }).where(eq(pedidosProposta.id, pedidoId));
  // Na trilha da PREFEITURA (não da conta admin): o controle interno dela
  // precisa ver quando e quais módulos foram ligados, e por quem.
  try {
    await db.insert(auditoria).values({
      id: gerarId("aud"),
      prefeituraId: pref.id,
      usuarioId: "equipe",
      usuarioNome: "Equipe CidadeIA",
      usuarioCargo: "admin",
      acao: "ativar",
      entidade: "modulo",
      entidadeId: pedidoId,
      resumo: `módulos ativados após contrato: ${nomes.join(", ")}`,
    });
  } catch (e) {
    console.error("[auditoria] ativação não registrada:", e);
  }

  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";
  const envio = await enviarEmail({
    para: pedido.email,
    assunto: `CidadeIA — módulos ativados para ${pedido.municipio}/${pedido.uf}`,
    html: [
      `<p>Olá, ${pedido.nome}.</p>`,
      `<p>Os módulos <strong>${nomes.join(", ")}</strong> estão ativos na conta da ${pref.nome}.</p>`,
      `<p>Entre em <a href="${base}/login">${base}/login</a> com o CPF/CNPJ e a senha cadastrados. A Implantação no painel mostra, passo a passo, o que cadastrar primeiro.</p>`,
      `<p style="color:#888">Protocolo ${pedido.id.slice(-8).toUpperCase()}.</p>`,
    ].join("\n"),
  });

  revalidatePath("/admin/pedidos");
  revalidatePath("/dashboard/modulos/marketplace");
  return envio.enviado
    ? { ok: true }
    : {
        ok: true,
        aviso: `Módulos ativados. O aviso por e-mail ao cliente NÃO saiu (${envio.detalhe ?? envio.motivo}) — avise por outro canal.`,
      };
}
