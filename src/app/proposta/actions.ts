"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidosProposta } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { limitarUso } from "@/lib/rate-limit";
import { buscarMunicipioPorCodigo, ehCodigoIbge } from "@/lib/populacao-ibge";
import { montarProposta, porteDaPopulacao, PORTES } from "@/lib/precos";
import { PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";
import { LIMITE_DISPENSA, cabeNaDispensa } from "@/lib/contratacao";
import { formatarMoeda } from "@/lib/formatadores";

// ── PARA ONDE O PEDIDO VAI ──
// O plano gratuito da Resend só entrega para o e-mail dono da conta. Por
// isso o destino é configurável: PROPOSTA_DESTINO_EMAIL na Vercel, com o
// mesmo endereço da conta Resend. Sem a variável, cai no contato do site.
const DESTINO_PADRAO = "arturmlo2005@gmail.com";

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
  | { ok: true; protocolo: string; emailEnviado: boolean }
  | { ok: false; erro: string; campo?: string };

function escapar(t: string): string {
  return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

/**
 * Grava o pedido e envia o e-mail. Gravar vem primeiro: é o registro do
 * primeiro contato, e sobrevive a uma falha de envio — o e-mail é aviso,
 * o banco é a fonte.
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

  const municipio = await buscarMunicipioPorCodigo(dados.codigoIbge);
  if (!municipio) return { ok: false, erro: "Município não encontrado na tabela do IBGE." };

  const modulos = dados.modulos.filter((m): m is PlanoAddon => PLANOS_ADDON.some((p) => p.chave === m));
  const porte = porteDaPopulacao(municipio.populacao);
  const proposta = montarProposta({ porte, modulos });
  const rotuloPorte = PORTES.find((p) => p.chave === porte);
  const nomesModulos = proposta.itens.map((i) => i.nome);

  const id = gerarId("prop");
  const protocolo = id.slice(-8).toUpperCase();

  // 1) grava
  let gravado = false;
  try {
    await db.insert(pedidosProposta).values({
      id,
      codigoIbge: municipio.codigo,
      municipio: municipio.nome,
      uf: municipio.uf,
      populacao: municipio.populacao,
      porte,
      modulos: JSON.stringify(modulos),
      mensal: proposta.incompleta ? null : proposta.mensal,
      nome: dados.nome,
      cargo: dados.cargo || null,
      email: dados.email,
      telefone: dados.telefone || null,
      observacao: dados.observacao || null,
    });
    gravado = true;
  } catch (e) {
    console.error("[proposta] falha ao gravar pedido:", e);
  }

  // 2) avisa por e-mail
  const linhas = [
    `<p><strong>Município:</strong> ${escapar(municipio.nome)}/${municipio.uf} — ${new Intl.NumberFormat("pt-BR").format(municipio.populacao)} habitantes (IBGE) → porte ${rotuloPorte?.rotulo ?? porte}</p>`,
    `<p><strong>Módulos:</strong> ${escapar(nomesModulos.join(", ") || "(nenhum marcado)")}</p>`,
    proposta.incompleta || proposta.anual === 0
      ? `<p><strong>Valor:</strong> sob consulta (faixa sem tabela publicada)</p>`
      : `<p><strong>Valor:</strong> ${formatarMoeda(proposta.mensal)}/mês — ${formatarMoeda(proposta.anual)} em 12 meses. ${
          cabeNaDispensa(proposta.anual) ? `Cabe na dispensa (${LIMITE_DISPENSA.base}).` : "Acima do limite de dispensa — pregão."
        }</p>`,
    `<hr/>`,
    `<p><strong>Solicitante:</strong> ${escapar(dados.nome)}${dados.cargo ? `, ${escapar(dados.cargo)}` : ""}</p>`,
    `<p><strong>E-mail:</strong> ${escapar(dados.email)}${dados.telefone ? ` · <strong>Telefone:</strong> ${escapar(dados.telefone)}` : ""}</p>`,
    dados.observacao ? `<p><strong>Observação:</strong> ${escapar(dados.observacao)}</p>` : "",
    `<p style="color:#888">Protocolo ${protocolo}${gravado ? "" : " — ATENÇÃO: não foi gravado no banco (tabela pedidos_proposta ausente?)"}</p>`,
  ].join("\n");

  const envio = await enviarEmail({
    para: process.env.PROPOSTA_DESTINO_EMAIL?.trim() || DESTINO_PADRAO,
    assunto: `Pedido de proposta — ${municipio.nome}/${municipio.uf} — ${nomesModulos.join(" + ") || "sem módulos"}`,
    html: linhas,
  });

  if (envio.enviado && gravado) {
    try {
      await db.update(pedidosProposta).set({ emailEnviado: true }).where(eq(pedidosProposta.id, id));
    } catch {
      /* o pedido já está gravado; a marca de envio é secundária */
    }
  }

  if (!gravado && !envio.enviado) {
    return {
      ok: false,
      erro: "Não conseguimos registrar o pedido agora. Tente de novo em instantes ou escreva para " + DESTINO_PADRAO + ".",
    };
  }
  return { ok: true, protocolo, emailEnviado: envio.enviado };
}
