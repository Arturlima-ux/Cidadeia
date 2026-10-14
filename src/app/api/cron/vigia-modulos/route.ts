import { NextResponse } from "next/server";
import { rodarVigiaDosModulos } from "@/lib/vigia-dos-modulos-servidor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── A VIGIA DOS MÓDULOS, TODA MANHÃ ──
// Roda as regras de todos os módulos contratados de cada prefeitura cliente e
// transforma o que achar em alerta, com e-mail quando é novo ou piorou (ver
// lib/vigia-dos-modulos.ts). Rotina própria, e não dentro da cobrança, para
// ter os 60 s da função só para ela. Mesma senha (CRON_SECRET), que a Vercel
// manda sozinha.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }
  const relatorio = await rodarVigiaDosModulos({ orcamentoMs: 48_000 });
  if (relatorio.erros.length) console.error("[vigia-modulos] erros:", relatorio.erros);
  return NextResponse.json({ ok: true, ...relatorio });
}
