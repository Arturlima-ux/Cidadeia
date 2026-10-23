import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidosProposta } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { montarEmail, saudacao } from "@/lib/email-modelo";
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
  const appBase = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";
  const linhas = montarEmail({
    remetente: { tipo: "equipe" },
    previa: `${dados.nome}${dados.cargo ? `, ${dados.cargo}` : ""}. Proposta em até 1 dia útil.`,
    etiqueta: { texto: "Pedido de proposta", tom: "marca" },
    titulo: `${municipio.nome}/${municipio.uf} pediu uma proposta`,
    blocos: [
      !gravado && { destaque: "O pedido NÃO foi gravado no banco (tabela pedidos_proposta ausente?). Registre à mão.", tom: "urgente" },
      {
        dados: [
          ["Município", `${municipio.nome}/${municipio.uf}`],
          ["População (IBGE)", `${new Intl.NumberFormat("pt-BR").format(municipio.populacao)} hab. · porte ${rotuloPorte?.rotulo ?? porte}`],
          ["Módulos", nomesModulos.join(", ") || "nenhum marcado"],
          [
            "Valor",
            proposta.incompleta || proposta.anual === 0
              ? "sob consulta (faixa sem tabela)"
              : `${formatarMoeda(proposta.mensal)}/mês · ${formatarMoeda(proposta.anual)}/ano`,
          ],
          ["Contratação", proposta.incompleta || proposta.anual === 0 ? "a definir" : cabeNaDispensa(proposta.anual) ? `cabe na dispensa (${LIMITE_DISPENSA.base}), somado ao que a prefeitura já contratou em software no ano` : "acima da dispensa: pregão"],
          ["Protocolo", protocolo],
        ],
      },
      { secao: "Quem pediu" },
      {
        dados: [
          ["Nome", `${dados.nome}${dados.cargo ? `, ${dados.cargo}` : ""}`],
          ["E-mail", dados.email],
          ...(dados.telefone ? ([["Telefone", dados.telefone]] as [string, string][]) : []),
          ["Conta", prefeituraId ? `já vinculada (${prefeituraId})` : "ainda não tem"],
        ],
      },
      dados.observacao ? { citacao: dados.observacao, rotulo: "Observação" } : null,
      !prefeituraId && { nota: `O cliente recebe o link para criar a conta: /cadastro?proposta=${id}` },
      { botao: "Abrir a mesa de pedidos", link: `${appBase}/admin/pedidos` },
    ],
    assinatura: null,
    motivo: "Aviso interno: a proposta deve sair em até 1 dia útil.",
  });

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
    html: montarEmail({
      remetente: { tipo: "cidadeia" },
      previa: `Protocolo ${protocolo}. A proposta chega neste e-mail em até um dia útil.`,
      etiqueta: { texto: "Pedido recebido", tom: "ok" },
      titulo: `Recebemos o pedido de proposta para ${municipio.nome}`,
      saudacao: saudacao(dados.nome),
      blocos: [
        { p: `Obrigado pelo interesse no CidadeIA. Recebemos o pedido de proposta para a Prefeitura de ${municipio.nome}/${municipio.uf}.` },
        {
          dados: [
            ["Protocolo", protocolo],
            ["Módulos", nomesModulos.join(", ") || "a definir"],
            ["Prazo", "até 1 dia útil"],
          ],
        },
        { secao: "O que acontece agora" },
        {
          itens: [
            { titulo: "A proposta chega neste e-mail", detalhe: "Em até um dia útil, com o valor, o escopo e o termo de referência prontos para o jurídico.", tom: "marca" },
            { titulo: "O kit de contratação vai junto", detalhe: "Estudo técnico, justificativa da contratação, minuta do contrato e acordo de tratamento de dados.", tom: "marca" },
            { titulo: "Os módulos ligam com o contrato registrado", detalhe: "O pagamento é mensal, depois do mês usado e do atesto do fiscal. Se quiser adiantar, crie desde já a conta da prefeitura: é nela que os módulos são ativados.", tom: "marca" },
          ],
        },
        { botao: "Acompanhar o pedido", link: `${base}/proposta/acompanhar?protocolo=${protocolo}`, depois: { texto: "Criar a conta da prefeitura", link: `${base}/cadastro?proposta=${id}` } },
        { p: "Para acompanhar, use o protocolo e este e-mail. Qualquer dúvida, é só responder." },
      ],
      motivo: `Você recebe este e-mail porque pediu uma proposta do CidadeIA para ${municipio.nome}/${municipio.uf}.`,
    }),
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
