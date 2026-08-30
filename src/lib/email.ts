// Envio de e-mail via API REST da Resend (sem SDK — evita mais uma
// dependência de node_modules). Sem RESEND_API_KEY configurada, cai para
// log no console (mesmo padrão de degradação graciosa usado em ia.ts para
// ANTHROPIC_API_KEY), útil para testar o fluxo em desenvolvimento.
export type ResultadoEnvioEmail = { enviado: true } | { enviado: false; motivo: string };

export async function enviarEmail(params: {
  para: string;
  assunto: string;
  html: string;
}): Promise<ResultadoEnvioEmail> {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !remetente) {
    console.log(
      `[email] RESEND_API_KEY/RESEND_FROM_EMAIL não configurados — e-mail não enviado de verdade.\n` +
        `[email] Para: ${params.para}\n[email] Assunto: ${params.assunto}\n[email] Conteúdo:\n${params.html}`
    );
    return { enviado: false, motivo: "Envio de e-mail não configurado neste ambiente." };
  }

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
      }),
      // Sem limite, uma API lenta prende a requisição até o timeout da
      // função serverless e o usuário fica olhando para o botão travado.
      signal: AbortSignal.timeout(10_000),
    });
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    console.error(`[email] Não foi possível falar com a Resend: ${motivo}`);
    return { enviado: false, motivo: "Falha ao enviar o e-mail. Tente novamente." };
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error(`[email] Falha ao enviar via Resend (${resposta.status}): ${detalhe}`);
    return { enviado: false, motivo: "Falha ao enviar o e-mail. Tente novamente." };
  }

  return { enviado: true };
}
