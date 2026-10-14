import { NextResponse } from "next/server";
import { rodarImportacaoAutomatica } from "@/lib/importacao-automatica";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── A IMPORTAÇÃO AUTOMÁTICA, DE MADRUGADA ──
// Tesouro, CNES e PNCP para cada prefeitura cliente, uma vez por semana cada
// fonte, antes da vigia dos módulos (ver lib/importacao-automatica.ts).
// Mesma senha (CRON_SECRET) das outras rotinas.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }
  const relatorio = await rodarImportacaoAutomatica({ orcamentoMs: 48_000 });
  if (relatorio.erros.length) console.error("[importacoes] erros:", relatorio.erros);
  return NextResponse.json({ ok: true, ...relatorio });
}
