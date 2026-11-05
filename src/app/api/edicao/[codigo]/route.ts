import { NextResponse } from "next/server";
import { edicaoDaCidade } from "@/lib/boletim-da-cidade";
import { hojeEmBrasilia } from "@/lib/cobranca";

// A edição de hoje de uma prefeitura (lib/boletim-da-cidade.ts): só dado
// guardado no próprio site, sem consulta externa. Muda no máximo uma vez por
// dia (a data) e quando a vigia relê o RGF; uma hora de cache basta.
export async function GET(_req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^\d{7}$/.test(codigo)) return NextResponse.json({ erro: "Código IBGE inválido." }, { status: 400 });
  const e = edicaoDaCidade(codigo, hojeEmBrasilia());
  if (!e) return NextResponse.json({ erro: "Município não encontrado." }, { status: 404 });
  return NextResponse.json(e, { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } });
}
