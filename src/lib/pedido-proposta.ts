import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidosProposta } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { buscarMunicipioPorCodigo } from "@/lib/populacao-ibge";
import { montarProposta, porteDaPopulacao, PORTES } from "@/lib/precos";
import { PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";
import { LIMITE_DISPENSA, cabeNaDispensa } from "@/lib/contratacao";
import { formatarMoeda } from "@/lib/formatadores";

// ── O REGISTRO DE UM PEDIDO DE PROPOSTA ──
//
// Um só caminho para gravar o pedido, avisar a equipe e confirmar a quem
// pediu — usado pelo formulário público (/proposta) e pelo painel (Módulos,
// "Pedir este módulo"). Não é "use server": quem chama é uma ação que já
// validou a entrada e decidiu de quem é o pedido (prefeituraId).
//
// ── PARA ONDE O AVISO VAI ──
// O plano gratuito da Resend só entrega para o e-mail dono da conta. Por
// isso o destino é configurável: PROPOSTA_DESTINO_EMAIL na Vercel, com o
// mesmo endereço da conta Resend. Sem a variável, cai no contato do site.
export const DESTINO_PADRAO = "arturmlo2005@gmail.com";

export type DadosDoPedido = {
  codigoIbge: string;
  modulos: string[];
  nome: string;
  cargo?: string;
  email: string;
  telefone?: string;
  observacao?: string;
  /** Conta dona do pedido, quando quem pede está logado. */
  prefeituraId: string | null;
};

export type ResultadoRegistro =
  | { ok: true; protocolo: string; pedidoId: string; confirmacaoEnviada: boolean; vinculadoAConta: boolean }
  | { ok: false; erro: string };

function escapar(t: string): string {
  return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

/**
 * Grava o pedido e envia os e-mails. Gravar vem primeiro: é o registro do
 * primeiro contato, e sobrevive a uma falha de envio — o e-mail é aviso,
 * o banco é a fonte.
 */
export async function registrarPedidoProposta(dados: DadosDoPedido): Promise<ResultadoRegistro> {
  const municipio = await buscarMunicipioPorCodigo(dados.codigoIbge);
  if (!municipio) return { ok: false, erro: "Município não encontrado na tabela do IBGE." };

  const modulos = dados.modulos.filter((m): m is PlanoAddon => PLANOS_ADDON.some((p) => p.chave === m));
  const porte = porteDaPopulacao(municipio.populacao);
  const proposta = montarProposta({ porte, modulos });
  const rotuloPorte = PORTES.find((p) => p.chave === porte);
  const nomesModulos = proposta.itens.map((i) => i.nome);

  const id = gerarId("prop");
  const protocolo = id.slice(-8).toUpperCase();

  const prefeituraId = dados.prefeituraId;

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
      prefeituraId,
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
    prefeituraId ? `<p><strong>Conta:</strong> pedido feito de dentro do painel — já vinculado à prefeitura ${prefeituraId}.</p>` : `<p><strong>Conta:</strong> ainda não tem. O cliente recebe o link para criar; se precisar, ele é /cadastro?proposta=${id}.</p>`,
    `<p><a href="${process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app"}/admin/pedidos">Abrir a mesa de pedidos</a></p>`,
    `<p style="color:#888">Protocolo ${protocolo}${gravado ? "" : " — ATENÇÃO: não foi gravado no banco (tabela pedidos_proposta ausente?)"}</p>`,
  ].join("\n");

  const envio = await enviarEmail({
    para: process.env.PROPOSTA_DESTINO_EMAIL?.trim() || DESTINO_PADRAO,
    assunto: `Pedido de proposta — ${municipio.nome}/${municipio.uf} — ${nomesModulos.join(" + ") || "sem módulos"}`,
    html: linhas,
  });

  // ── CONFIRMAÇÃO PARA QUEM PEDIU ──
  // Antes, só a equipe era avisada: quem pedia via a tela de sucesso e
  // nunca mais recebia nada. Agora o solicitante recebe o protocolo, o que
  // foi pedido, o link de acompanhamento e o link para criar a conta.
  // Enquanto a Resend estiver sem domínio próprio, esta entrega falha para
  // qualquer destinatário que não seja o dono da conta — por isso a tela
  // não promete "enviamos um e-mail" quando não enviou.
  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";
  const confirmacao = await enviarEmail({
    para: dados.email,
    assunto: `Pedido recebido — proposta do CidadeIA para ${municipio.nome}/${municipio.uf} (protocolo ${protocolo})`,
    html: [
      `<p>Olá, ${escapar(dados.nome)}.</p>`,
      `<p>Recebemos o seu pedido de proposta para a Prefeitura de ${escapar(municipio.nome)}/${municipio.uf}.</p>`,
      `<p><strong>Protocolo:</strong> ${protocolo}<br/><strong>Módulos:</strong> ${escapar(nomesModulos.join(", ") || "a definir")}</p>`,
      `<p>A proposta e o termo de referência, prontos para o jurídico, chegam neste e-mail em até um dia útil.</p>`,
      `<p>Acompanhe o andamento quando quiser: <a href="${base}/proposta/acompanhar?protocolo=${protocolo}">${base}/proposta/acompanhar</a> (protocolo + este e-mail).</p>`,
      `<p>Se quiser adiantar, crie a conta da prefeitura — é nela que os módulos são ativados no dia em que o contrato for assinado: <a href="${base}/cadastro?proposta=${id}">criar a conta</a>.</p>`,
      `<p style="color:#888">CidadeIA · dado público do SICONFI e do IBGE.</p>`,
    ].join("\n"),
  });
  if (!confirmacao.enviado) {
    console.error(`[proposta] confirmação ao solicitante não saiu: ${confirmacao.detalhe ?? confirmacao.motivo}`);
  }

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
  // emailEnviado é sobre QUEM PEDIU: é o que a tela promete a ele.
  return { ok: true, protocolo, pedidoId: id, confirmacaoEnviada: confirmacao.enviado, vinculadoAConta: Boolean(prefeituraId) };
}
