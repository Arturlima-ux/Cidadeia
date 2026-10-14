// Envio de e-mail via API REST da Resend (sem SDK — evita mais uma
// dependência de node_modules). Sem RESEND_API_KEY configurada, cai para
// log no console (mesmo padrão de degradação graciosa usado em ia.ts para
// ANTHROPIC_API_KEY), útil para testar o fluxo em desenvolvimento.
// ── POR QUE A CAUSA VIAJA JUNTO ──
// Três situações diferentes chegavam à tela como uma frase só, e essa frase
// nomeava apenas UMA delas ("o envio não está configurado"). Quando a chave
// estava certa e era a Resend que recusava — remetente sem domínio próprio só
// entrega para o dono da conta —, a tela acusava configuração faltando e
// mandava investigar o lugar errado. Quem lê a mensagem precisa saber se o
// problema é do servidor (ninguém vai receber nada) ou daquele envio
// específico (tentar de novo pode funcionar).
export type CausaNaoEnviado = "nao-configurado" | "falha-no-envio";

export type ResultadoEnvioEmail =
  | { enviado: true }
  // motivo: frase para a tela. detalhe: o que o provedor respondeu (status e
  // mensagem), para log e para o e-mail interno — nunca para a tela pública.
  | { enviado: false; causa: CausaNaoEnviado; motivo: string; detalhe?: string };

type ParametrosEmail = {
  para: string;
  assunto: string;
  html: string;
  /** Arquivos anexos (a proposta em PDF, por exemplo). */
  anexos?: { nome: string; conteudo: Uint8Array }[];
  /** Para onde vai a resposta do cliente, quando não é o remetente. */
  responderPara?: string;
  /** Pedido de proposta ligado ao e-mail: se ele não sair, a caixa de saída
   *  oferece o PDF para baixar e mandar à mão. */
  pedidoId?: string;
};

// ── DOIS CAMINHOS, E UMA REDE EMBAIXO ──
//
// 1. Resend, com o domínio próprio. Sem domínio confirmado, ela só entrega
//    para o dono da conta e recusa o resto (403).
// 2. Gmail (SMTP com senha de app), quando SMTP_USUARIO e SMTP_SENHA estão
//    configurados. Enquanto o remetente da Resend for o @resend.dev, o Gmail
//    vai PRIMEIRO (é o que faz o e-mail chegar à prefeitura, com o nome
//    "CidadeIA"); com o domínio confirmado, a Resend volta a ser o primeiro.
// 3. Se nenhum dos dois entregar um e-mail para fora da equipe, ele vai para
//    a caixa de saída (lib/caixa-de-saida.ts), com o texto pronto para a
//    equipe mandar à mão. Nenhum e-mail de cliente se perde num log.
export async function enviarEmail(params: ParametrosEmail): Promise<ResultadoEnvioEmail> {
  const temResend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const temSmtp = Boolean(process.env.SMTP_USUARIO?.trim() && process.env.SMTP_SENHA?.trim());

  if (!temResend && !temSmtp) {
    console.log(
      `[email] RESEND_API_KEY/RESEND_FROM_EMAIL não configurados — e-mail não enviado de verdade.\n` +
        `[email] Para: ${params.para}\n[email] Assunto: ${params.assunto}\n[email] Conteúdo:\n${params.html}`
    );
    return {
      enviado: false,
      causa: "nao-configurado",
      motivo: "Envio de e-mail não configurado neste ambiente.",
    };
  }

  // ── QUEM VAI PRIMEIRO ──
  // Sem domínio próprio, a Resend manda de "onboarding@resend.dev" e só
  // entrega ao dono da conta: o Gmail, com o nome "CidadeIA", vem antes e
  // ela fica de reserva. Com domínio próprio no remetente, a Resend volta a
  // ser o caminho principal.
  const resendSemDominio = /@resend\.dev\b/i.test(process.env.RESEND_FROM_EMAIL ?? "");
  const ordem: ("resend" | "smtp")[] = [];
  if (temSmtp && (resendSemDominio || !temResend)) ordem.push("smtp");
  if (temResend) ordem.push("resend");
  if (temSmtp && !ordem.includes("smtp")) ordem.push("smtp");

  const tentativas: string[] = [];
  for (const caminho of ordem) {
    const r = caminho === "smtp" ? await viaSmtp(params) : await viaResend(params);
    if (r.enviado) return r;
    tentativas.push(r.detalhe ?? r.motivo);
  }

  const detalhe = tentativas.join(" | ");
  if (!ehDaEquipe(params.para)) {
    try {
      const { guardarNaCaixaDeSaida } = await import("@/lib/caixa-de-saida");
      await guardarNaCaixaDeSaida({
        para: params.para,
        assunto: params.assunto,
        html: params.html,
        anexos: params.anexos?.map((a) => a.nome),
        pedidoId: params.pedidoId ?? null,
        motivo: detalhe,
      });
    } catch (e) {
      console.error("[email] não guardou na caixa de saída:", e);
    }
  }
  return { enviado: false, causa: "falha-no-envio", motivo: "Falha ao enviar o e-mail.", detalhe };
}

function ehDaEquipe(para: string): boolean {
  const equipe = [process.env.PROPOSTA_DESTINO_EMAIL, process.env.ADMIN_EMAILS, "arturmlo2005@gmail.com"]
    .join(",")
    .toLowerCase()
    .split(/[,;\s]+/)
    .filter(Boolean);
  return equipe.includes(para.trim().toLowerCase());
}

async function viaSmtp(params: ParametrosEmail): Promise<ResultadoEnvioEmail> {
  const usuario = process.env.SMTP_USUARIO!.trim();
  const porta = Number(process.env.SMTP_PORTA ?? 465);
  try {
    const nodemailer = await import("nodemailer");
    const transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
      port: porta,
      secure: porta === 465,
      auth: { user: usuario, pass: process.env.SMTP_SENHA!.replace(/\s+/g, "") },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transporte.sendMail({
      from: { name: process.env.SMTP_NOME?.trim() || "CidadeIA", address: usuario },
      to: params.para,
      subject: params.assunto,
      html: params.html,
      ...(params.responderPara ? { replyTo: params.responderPara } : {}),
      ...(params.anexos?.length
        ? { attachments: params.anexos.map((a) => ({ filename: a.nome, content: Buffer.from(a.conteudo) })) }
        : {}),
    });
    return { enviado: true };
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    console.error(`[email] Falha ao enviar pelo SMTP: ${motivo}`);
    return { enviado: false, causa: "falha-no-envio", motivo: "Falha ao enviar o e-mail.", detalhe: `SMTP: ${motivo.slice(0, 300)}` };
  }
}

async function viaResend(params: ParametrosEmail): Promise<ResultadoEnvioEmail> {
  const apiKey = process.env.RESEND_API_KEY!;
  const remetente = process.env.RESEND_FROM_EMAIL!;

  // A chamada de rede fica dentro de try/catch porque uma falha aqui — DNS,
  // timeout, chave revogada — não pode derrubar a tela de quem pediu a
  // recuperação de senha. Sem isso, o erro subia até a fronteira de erro do
  // Next e o usuário via "Algo deu errado" em vez da mensagem de sempre.
  let resposta: Response;
  try {
    resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente,
        to: params.para,
        subject: params.assunto,
        html: params.html,
        ...(params.responderPara ? { reply_to: params.responderPara } : {}),
        ...(params.anexos?.length
          ? {
              attachments: params.anexos.map((a) => ({
                filename: a.nome,
                content: Buffer.from(a.conteudo).toString("base64"),
              })),
            }
          : {}),
      }),
      // Sem limite, uma API lenta prende a requisição até o timeout da
      // função serverless e o usuário fica olhando para o botão travado.
      signal: AbortSignal.timeout(10_000),
    });
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    console.error(`[email] Não foi possível falar com a Resend: ${motivo}`);
    return {
      enviado: false,
      causa: "falha-no-envio",
      motivo: "Falha ao enviar o e-mail.",
      detalhe: `sem resposta da Resend: ${motivo}`,
    };
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error(`[email] Falha ao enviar via Resend (${resposta.status}): ${detalhe}`);
    return {
      enviado: false,
      causa: "falha-no-envio",
      motivo: "Falha ao enviar o e-mail.",
      detalhe: `Resend respondeu ${resposta.status}: ${detalhe.slice(0, 300)}`,
    };
  }

  return { enviado: true };
}
