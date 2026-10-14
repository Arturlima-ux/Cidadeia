import { NextResponse } from "next/server";
import { rodarSegundaDoPrefeito } from "@/lib/segunda-do-prefeito-servidor";
import { avisarEquipeDoRisco } from "@/lib/saude-do-cliente-servidor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── A SEGUNDA DO PREFEITO ──
// Toda segunda, 7h30 de Brasília, depois da vigia dos módulos (6h40): o
// resumo da semana para o prefeito, o administrador e cada secretário (ver
// lib/segunda-do-prefeito.ts). Mesma senha (CRON_SECRET) das outras rotinas.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }
  const relatorio = await rodarSegundaDoPrefeito();
  if (relatorio.erros.length) console.error("[segunda] erros:", relatorio.erros);
  // Na mesma manhã, para a equipe: os clientes em risco de cancelamento
  // (lib/saude-do-cliente.ts). Falha aqui não desfaz o resumo dos prefeitos.
  let risco: Awaited<ReturnType<typeof avisarEquipeDoRisco>> | { erro: string };
  try {
    risco = await avisarEquipeDoRisco();
  } catch (e) {
    console.error("[segunda] risco de cancelamento:", e);
    risco = { erro: e instanceof Error ? e.message : String(e) };
  }
  return NextResponse.json({ ok: true, ...relatorio, risco });
}
