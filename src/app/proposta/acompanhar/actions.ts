"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pedidosProposta, prefeituras } from "@/db/schema";
import { limitarUso } from "@/lib/rate-limit";
import { NOME_PLANO_ADDON } from "@/lib/planos";
import { modulosDoPedido, STATUS_PEDIDO, linkCadastroDoPedido, type StatusPedido } from "@/lib/pedidos";

// ── ACOMPANHAR SEM CONTA ──
//
// Quem pede proposta e ainda não criou conta ficava sem saber de nada até
// alguém escrever. Aqui ele consulta com o protocolo que recebeu na tela
// mais o e-mail que informou — os dois juntos, nunca um só: protocolo tem
// oito caracteres, e sozinho viraria uma porta para varrer pedidos de
// outras prefeituras. O limite por uso fecha o resto.

const schema = z.object({
  protocolo: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
    .refine((v) => v.length === 8, "O protocolo tem 8 caracteres (veio na tela e no e-mail)."),
  email: z.string().trim().email("Informe o e-mail usado no pedido."),
});

export type Acompanhamento = {
  protocolo: string;
  municipio: string;
  uf: string;
  modulos: string[];
  status: StatusPedido;
  rotulo: string;
  mensagem: string;
  /** Só quando o pedido ainda não tem conta: o link para criar. */
  linkCadastro: string | null;
  contaNome: string | null;
};

export type ResultadoAcompanhar = { ok: true; pedido: Acompanhamento } | { ok: false; erro: string; campo?: string };

export async function acompanharPedido(entrada: unknown): Promise<ResultadoAcompanhar> {
  const parsed = schema.safeParse(entrada);
  if (!parsed.success) {
    const primeiro = parsed.error.issues[0];
    return { ok: false, erro: primeiro?.message ?? "Dados inválidos.", campo: String(primeiro?.path?.[0] ?? "") };
  }
  const { protocolo, email } = parsed.data;

  if (!(await limitarUso(`acompanhar:${email.toLowerCase()}`, 10, 60))) {
    return { ok: false, erro: "Muitas consultas seguidas. Tente de novo em uma hora." };
  }

  let linha:
    | { pedido: typeof pedidosProposta.$inferSelect; contaNome: string | null }
    | undefined;
  try {
    // O protocolo é o fim do id, em maiúsculas — a mesma conta que a tela de
    // sucesso e o e-mail mostram.
    [linha] = await db
      .select({ pedido: pedidosProposta, contaNome: prefeituras.nome })
      .from(pedidosProposta)
      .leftJoin(prefeituras, eq(pedidosProposta.prefeituraId, prefeituras.id))
      .where(
        and(
          sql`upper(right(${pedidosProposta.id}, 8)) = ${protocolo}`,
          sql`lower(${pedidosProposta.email}) = ${email.toLowerCase()}`
        )
      )
      .limit(1);
  } catch (e) {
    console.error("[acompanhar] falha ao consultar:", e);
    return { ok: false, erro: "Não foi possível consultar agora. Tente de novo em instantes." };
  }

  if (!linha) {
    return {
      ok: false,
      erro: "Não encontramos pedido com esse protocolo e esse e-mail. Confira os dois — eles aparecem na tela que você viu ao pedir.",
    };
  }

  const p = linha.pedido;
  const status = p.status as StatusPedido;
  return {
    ok: true,
    pedido: {
      protocolo,
      municipio: p.municipio,
      uf: p.uf,
      modulos: modulosDoPedido(p.modulos).map((m) => NOME_PLANO_ADDON[m]),
      status,
      rotulo: STATUS_PEDIDO[status]?.rotulo ?? status,
      mensagem: STATUS_PEDIDO[status]?.paraOCliente ?? "",
      linkCadastro: p.prefeituraId ? null : linkCadastroDoPedido(p.id),
      contaNome: linha.contaNome,
    },
  };
}
