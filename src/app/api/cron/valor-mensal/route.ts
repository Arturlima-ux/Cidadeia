import { NextResponse } from "next/server";
import { rodarValorMensal } from "@/lib/valor-mensal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── O RESUMO DO MÊS, DIA 1º, 8H10 DE BRASÍLIA ── (ver lib/valor-mensal.ts)
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }
  const relatorio = await rodarValorMensal();
  if (relatorio.erros.length) console.error("[valor-mensal] erros:", relatorio.erros);
  return NextResponse.json({ ok: true, ...relatorio });
}
