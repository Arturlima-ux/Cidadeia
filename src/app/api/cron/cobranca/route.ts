import { NextResponse } from "next/server";
import { rodarCobranca } from "@/lib/cobranca-servidor";
import { rodarVigiaFiscal } from "@/lib/vigia-fiscal-alertas";
import { rodarRotinaComercial } from "@/lib/rotina-comercial";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── A ROTINA DIÁRIA DE COBRANÇA ──
//
// Chamada pela Vercel todo dia (vercel.json). Emite a mensalidade de cada
// contrato ativo que ainda não a tem e manda os avisos por e-mail: três dias
// antes do vencimento, no atraso e na suspensão. As duas coisas são
// idempotentes; rodar duas vezes no mesmo dia não duplica nada.
//
// ── POR QUE TEM SENHA, E A /api/manter-vivo NÃO ──
//
// Esta rota grava fatura e manda e-mail a cliente. Aberta, qualquer um
// dispararia avisos de cobrança. A Vercel manda "Authorization: Bearer
// <CRON_SECRET>" quando a variável existe; sem a variável configurada, a
// rota não roda.
//
// ── A VIGIA FISCAL VEM NA MESMA ROTINA ──
//
// Depois da cobrança, a mesma chamada diária confere no Tesouro as entregas
// e os números de cada prefeitura com o plano Gestão (lib/vigia-fiscal-
// alertas.ts). Fica aqui, e não numa rotina própria, para não depender de
// mais um agendamento na Vercel. Uma falha numa não derruba a outra.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }
  const inicio = Date.now();
  const relatorio = await rodarCobranca();
  if (relatorio.erros.length) console.error("[cobranca] erros:", relatorio.erros);

  // O atendimento comercial: resumo da equipe e acompanhamentos
  // (lib/rotina-comercial.ts). Antes da vigia, porque é rápido e é venda.
  let atendimento: Awaited<ReturnType<typeof rodarRotinaComercial>> | { erro: string };
  try {
    atendimento = await rodarRotinaComercial();
    if (atendimento.erros.length) console.error("[atendimento] erros:", atendimento.erros);
  } catch (e) {
    console.error("[atendimento] falhou:", e);
    atendimento = { erro: e instanceof Error ? e.message : String(e) };
  }

  let vigiaFiscal: Awaited<ReturnType<typeof rodarVigiaFiscal>> | { erro: string };
  try {
    // O que sobrar dos 60 s da função, com folga para responder.
    vigiaFiscal = await rodarVigiaFiscal({ orcamentoMs: Math.max(5_000, 50_000 - (Date.now() - inicio)) });
    if (vigiaFiscal.erros.length) console.error("[vigia-fiscal] erros:", vigiaFiscal.erros);
  } catch (e) {
    console.error("[vigia-fiscal] falhou:", e);
    vigiaFiscal = { erro: e instanceof Error ? e.message : String(e) };
  }
  return NextResponse.json({ ok: true, ...relatorio, atendimento, vigiaFiscal });
}
