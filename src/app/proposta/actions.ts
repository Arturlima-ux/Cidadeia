"use server";

import { z } from "zod";
import { limitarUso } from "@/lib/rate-limit";
import { ehCodigoIbge } from "@/lib/populacao-ibge";
import { lerSessao } from "@/lib/sessao";
import { registrarPedidoProposta } from "@/lib/pedido-proposta";

// O que grava, avisa e confirma mora em lib/pedido-proposta.ts — o mesmo
// caminho que o painel usa em "Pedir este módulo". Aqui: validar a entrada
// do formulário público, limitar por e-mail e decidir de quem é o pedido.

const schema = z.object({
  codigoIbge: z.string().refine(ehCodigoIbge, "Município inválido."),
  modulos: z.array(z.string()).max(6),
  nome: z.string().trim().min(3, "Informe seu nome.").max(120),
  cargo: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido.").max(160),
  telefone: z.string().trim().max(30).optional().or(z.literal("")),
  observacao: z.string().trim().max(1500).optional().or(z.literal("")),
});

export type ResultadoPedido =
  // pedidoId: para o cadastro nascer amarrado ao pedido. vinculadoAConta:
  // quem pediu já estava logado — o pedido foi para a conta dela.
  | { ok: true; protocolo: string; emailEnviado: boolean; pedidoId: string; vinculadoAConta: boolean }
  | { ok: false; erro: string; campo?: string };

/**
 * Público e sem login. Se houver sessão de cliente (não a demo), o pedido
 * nasce amarrado à conta dela.
 */
export async function enviarPedidoProposta(entrada: unknown): Promise<ResultadoPedido> {
  const parsed = schema.safeParse(entrada);
  if (!parsed.success) {
    const primeiro = parsed.error.issues[0];
    return { ok: false, erro: primeiro?.message ?? "Dados inválidos.", campo: String(primeiro?.path?.[0] ?? "") };
  }
  const dados = parsed.data;

  // Público e sem login: limite por e-mail, para não virar disparador.
  if (!(await limitarUso(`proposta:${dados.email.toLowerCase()}`, 5, 60))) {
    return { ok: false, erro: "Já recebemos pedidos deste e-mail há pouco. Aguarde uma hora para enviar outro." };
  }

  // Quem pede logado já tem conta: o pedido vai para ela, e o cliente
  // acompanha o status em Módulos. A demo nunca cria pedido com dono.
  const sessao = await lerSessao();
  const prefeituraId = sessao && !sessao.demo ? sessao.prefeituraId : null;

  const r = await registrarPedidoProposta({
    codigoIbge: dados.codigoIbge,
    modulos: dados.modulos,
    nome: dados.nome,
    cargo: dados.cargo || undefined,
    email: dados.email,
    telefone: dados.telefone || undefined,
    observacao: dados.observacao || undefined,
    prefeituraId,
  });
  if (!r.ok) return r;
  // emailEnviado é sobre QUEM PEDIU: é o que a tela promete a ele.
  return { ok: true, protocolo: r.protocolo, emailEnviado: r.confirmacaoEnviada, pedidoId: r.pedidoId, vinculadoAConta: r.vinculadoAConta };
}
