import { NextResponse } from "next/server";
import { rodarCobranca } from "@/lib/cobranca-servidor";

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
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }
  const relatorio = await rodarCobranca();
  if (relatorio.erros.length) console.error("[cobranca] erros:", relatorio.erros);
  return NextResponse.json({ ok: true, ...relatorio });
}
