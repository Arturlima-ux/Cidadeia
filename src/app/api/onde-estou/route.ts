import { localPelaConexao } from "@/lib/onde-esta";

// ── PERTO DE ONDE A PESSOA ESTÁ ──
//
// A home é estática (sai do cache) e não lê cabeçalho nenhum. Este endereço
// é o único que lê, e só os de localização aproximada que a Vercel põe em
// cada pedido (lib/onde-esta.ts). Devolve à própria pessoa e a mais
// ninguém: sem gravar, sem registrar evento, sem cache compartilhado.

export const dynamic = "force-dynamic";

const SEM_CACHE = { "Cache-Control": "private, no-store", Vary: "*" };

export async function GET(request: Request) {
  // Só a própria página pergunta.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response(null, { status: 403, headers: SEM_CACHE });

  const local = localPelaConexao(request.headers);
  if (!local) return new Response(null, { status: 204, headers: SEM_CACHE });
  return Response.json(local, { headers: SEM_CACHE });
}
