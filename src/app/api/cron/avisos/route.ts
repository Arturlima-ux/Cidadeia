import { NextResponse } from "next/server";
import { rodarAvisosDaCidade } from "@/lib/aviso-da-cidade-servidor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── O AVISO GRATUITO DA CIDADE, TODA MANHÃ ──
// Rotina própria, e não dentro de /api/cron/cobranca: lá o tempo da função
// é dos clientes pagantes (cobrança e vigia fiscal). Mesma senha
// (CRON_SECRET), que a Vercel manda sozinha. Ver lib/aviso-da-cidade.ts.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }
  const relatorio = await rodarAvisosDaCidade({ orcamentoMs: 48_000 });
  if (relatorio.erros.length) console.error("[avisos] erros:", relatorio.erros);
  return NextResponse.json({ ok: true, ...relatorio });
}
