"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pedidosProposta, prefeituras, usuarios } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";
import { PLANOS_ADDON, NOME_PLANO_ADDON, planosContratadosDe, type PlanoAddon } from "@/lib/planos";
import { modulosDoPedido } from "@/lib/pedidos";
import { registrarPedidoProposta } from "@/lib/pedido-proposta";
import { auditar } from "@/lib/auditoria";

// ── PEDIR UM MÓDULO SEM SAIR DO PAINEL ──
//
// O botão "Pedir proposta" do Marketplace mandava o cliente ao formulário
// público, onde ele digitava de novo o nome e o e-mail que a conta já tem.
// Aqui o pedido nasce da própria conta: município pelo código IBGE gravado
// na prefeitura, nome e e-mail do usuário logado, dono já definido. O
// caminho de gravação e aviso é o mesmo do site (lib/pedido-proposta.ts).

export type ResultadoPedirModulo =
  | { ok: true; protocolo: string; confirmacaoEnviada: boolean }
  | { ok: false; erro: string };

export async function pedirModuloDoPainel(modulo: string): Promise<ResultadoPedirModulo> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração não é possível pedir proposta." };
  if (sessao.cargo === "secretario") return { ok: false, erro: "Apenas o prefeito ou um administrador pode pedir módulos." };

  const chave = PLANOS_ADDON.find((p) => p.chave === modulo)?.chave as PlanoAddon | undefined;
  if (!chave) return { ok: false, erro: "Módulo desconhecido." };

  const [pref] = await db
    .select({
      id: prefeituras.id,
      codigoIbge: prefeituras.codigoIbge,
      planosContratados: prefeituras.planosContratados,
    })
    .from(prefeituras)
    .where(eq(prefeituras.id, sessao.prefeituraId))
    .limit(1);
  if (!pref) return { ok: false, erro: "Prefeitura não encontrada." };
  if (!pref.codigoIbge) {
    return { ok: false, erro: "Reconheça o município na Implantação antes — o porte vem da população do IBGE." };
  }
  if (planosContratadosDe(pref.planosContratados).includes(chave)) {
    return { ok: false, erro: "Este módulo já está ativo na sua conta." };
  }

  // Um pedido aberto por módulo. Repetir só geraria mais um e-mail para a
  // equipe e mais uma linha para o cliente acompanhar.
  const abertos = await db
    .select({ modulos: pedidosProposta.modulos })
    .from(pedidosProposta)
    .where(and(eq(pedidosProposta.prefeituraId, pref.id), ne(pedidosProposta.status, "contratado")));
  if (abertos.some((p) => modulosDoPedido(p.modulos).includes(chave))) {
    return { ok: false, erro: "Já existe um pedido em andamento com este módulo. Acompanhe em 'Sua proposta', acima." };
  }

  const [u] = await db
    .select({ nome: usuarios.nome, email: usuarios.email, cargo: usuarios.cargo })
    .from(usuarios)
    .where(eq(usuarios.id, sessao.usuarioId))
    .limit(1);
  if (!u?.email) {
    return { ok: false, erro: "Sua conta não tem e-mail cadastrado. Preencha em Configurações → Minha conta e tente de novo." };
  }

  const r = await registrarPedidoProposta({
    codigoIbge: pref.codigoIbge,
    modulos: [chave],
    nome: u.nome,
    cargo: u.cargo === "prefeito" ? "Prefeito(a)" : u.cargo,
    email: u.email,
    observacao: "Pedido feito de dentro do painel (Módulos).",
    prefeituraId: pref.id,
  });
  if (!r.ok) return r;

  await auditar(sessao, { acao: "pedir", entidade: "modulo", resumo: `proposta do módulo ${NOME_PLANO_ADDON[chave]} (protocolo ${r.protocolo})` });
  revalidatePath("/dashboard/modulos/marketplace");
  return { ok: true, protocolo: r.protocolo, confirmacaoEnviada: r.confirmacaoEnviada };
}
