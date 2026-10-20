import { textoDoHtml } from "@/lib/email-modelo";

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
  /** Versão em texto puro. Ausente, sai do próprio HTML (lib/email-modelo.ts). */
  texto?: string;
  /**
   * O nome que aparece como remetente. Padrão "CidadeIA". A ouvidoria usa
   * "Prefeitura de X via CidadeIA": quem fala é a prefeitura, pela plataforma.
   */
  nomeRemetente?: string;
  /** Link para parar de receber: vira o cabeçalho List-Unsubscribe. */
  cancelar?: string | null;
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
export async function enviarEmail(entrada: ParametrosEmail): Promise<ResultadoEnvioEmail> {
  const params: ParametrosEmail = { ...entrada, texto: entrada.texto ?? textoDoHtml(entrada.html) };
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
      from: { name: params.nomeRemetente ?? (process.env.SMTP_NOME?.trim() || "CidadeIA"), address: usuario },
      to: params.para,
      subject: params.assunto,
      html: params.html,
      text: params.texto,
      ...(params.cancelar ? { list: { unsubscribe: params.cancelar } } : {}),
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

/**
 * "onboarding@resend.dev" chegava na caixa de entrada como "onboarding". Com
 * o nome na frente, chega como "CidadeIA". Se a variável já traz um nome
 * ("Fulano <x@y>"), ele é respeitado.
 */
export function comNome(endereco: string, nome: string): string {
  const e = endereco.trim();
  if (e.includes("<")) return e;
  return `${nome.replace(/["<>]/g, "")} <${e}>`;
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
        from: comNome(remetente, params.nomeRemetente ?? "CidadeIA"),
        to: params.para,
        subject: params.assunto,
        html: params.html,
        text: params.texto,
        ...(params.cancelar ? { headers: { "List-Unsubscribe": `<${params.cancelar}>` } } : {}),
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

// ── O TESTE DOS DOIS CAMINHOS ──
//
// Quando um e-mail sai pela Resend com o remetente "onboarding", é porque o
// Gmail falhou antes, e em silêncio: o envio deu certo, então ninguém olha o
// porquê. O teste tenta cada caminho sozinho, para a equipe, e devolve o erro
// de cada um em português. O erro do provedor nunca traz a senha.

export type ResultadoDoCaminho = {
  caminho: "gmail" | "resend";
  configurado: boolean;
  /** O endereço que aparece como remetente (não é segredo). */
  remetente: string | null;
  enviado: boolean;
  erro: string | null;
  /** O que fazer, em português. */
  explicacao: string | null;
};

/** Traduz a resposta do provedor no que a equipe precisa fazer. Pura. */
export function explicarFalha(caminho: "gmail" | "resend", detalhe: string, remetente: string | null): string {
  const d = detalhe.toLowerCase();
  if (caminho === "gmail") {
    if (/535|534|username and password not accepted|invalid login|badcredentials|auth/.test(d))
      return `O Gmail recusou o login de ${remetente ?? "SMTP_USUARIO"}. Confira na Vercel: SMTP_USUARIO deve ser exatamente esse endereço, e SMTP_SENHA deve ser uma senha de app (16 letras, gerada em myaccount.google.com/apppasswords) DESSA mesma conta, com a verificação em duas etapas ligada. A senha normal da conta não funciona.`;
    if (/etimedout|econnrefused|econnreset|greeting|connection|timeout|enotfound/.test(d))
      return "Não conseguiu conectar ao servidor do Gmail. Confira SMTP_HOST (vazio ou smtp.gmail.com) e SMTP_PORTA (vazio ou 465).";
    if (/daily|limit|quota|5\.4\.5/.test(d)) return "O Gmail atingiu o limite diário de envios desta conta. Volta a funcionar em até 24 horas.";
    return "O Gmail recusou o envio. O erro exato está acima.";
  }
  if (/403/.test(d) && /domain|domínio|verify|testing|own email/.test(d))
    return "A Resend está sem domínio próprio verificado: nesse modo ela só entrega para o dono da conta. Com o Gmail funcionando, isso deixa de importar; com domínio próprio, a Resend passa a entregar para todos.";
  if (/401|api key|unauthorized/.test(d)) return "A chave da Resend (RESEND_API_KEY) está errada ou foi revogada.";
  return "A Resend recusou o envio. O erro exato está acima.";
}

export async function testarCaminhos(para: string): Promise<ResultadoDoCaminho[]> {
  const { montarEmail } = await import("@/lib/email-modelo");
  const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
  const msg = (caminho: string): ParametrosEmail => {
    const html = montarEmail({
      remetente: { tipo: "equipe" },
      previa: `Envio de teste pelo caminho ${caminho}.`,
      etiqueta: { texto: "Teste de envio", tom: "ok" },
      titulo: `O envio pelo ${caminho} funciona`,
      blocos: [{ p: `Se você está lendo isto, o caminho ${caminho} entregou este e-mail em ${agora}.` }],
      assinatura: null,
      motivo: "Teste pedido na caixa de saída do admin.",
    });
    return { para, assunto: `Teste de envio pelo ${caminho} (${agora})`, html, texto: textoDoHtml(html) };
  };

  const usuario = process.env.SMTP_USUARIO?.trim() || null;
  const temSmtp = Boolean(usuario && process.env.SMTP_SENHA?.trim());
  const remetenteResend = process.env.RESEND_FROM_EMAIL?.trim() || null;
  const temResend = Boolean(process.env.RESEND_API_KEY && remetenteResend);

  const gmail: ResultadoDoCaminho = { caminho: "gmail", configurado: temSmtp, remetente: usuario, enviado: false, erro: null, explicacao: null };
  if (!temSmtp) gmail.explicacao = "Faltam SMTP_USUARIO ou SMTP_SENHA na Vercel (ambiente Production).";
  else {
    const r = await viaSmtp(msg("Gmail"));
    gmail.enviado = r.enviado;
    if (!r.enviado) {
      gmail.erro = r.detalhe ?? r.motivo;
      gmail.explicacao = explicarFalha("gmail", gmail.erro, usuario);
    }
  }

  const resend: ResultadoDoCaminho = { caminho: "resend", configurado: temResend, remetente: remetenteResend, enviado: false, erro: null, explicacao: null };
  if (!temResend) resend.explicacao = "Faltam RESEND_API_KEY ou RESEND_FROM_EMAIL na Vercel.";
  else {
    const r = await viaResend(msg("Resend"));
    resend.enviado = r.enviado;
    if (!r.enviado) {
      resend.erro = r.detalhe ?? r.motivo;
      resend.explicacao = explicarFalha("resend", resend.erro, remetenteResend);
    }
  }
  return [gmail, resend];
}
