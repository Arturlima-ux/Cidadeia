import { registrarEvento } from "@/lib/registrar-evento";

// ── A VISITA DA HOME ESTÁTICA ──
//
// A home deixou de ser montada a cada pedido (novembro de 2026): sai pronta
// do cache, e por isso não lê cabeçalho nem grava nada no servidor. Quem
// conta a visita agora é o navegador, com um aviso curto depois que a página
// carregou (components/site/inicio/ContarVisita.tsx). A regra de quem conta
// é a mesma de antes (lib/analytics.ts, naoEhVisitante): sem robô, sem
// pré-carregamento, sem sessão logada. A diferença é que robô que não roda
// JavaScript nem chega a pedir.
//
// Quem abre a home com município, com ?para= ou com sessão continua indo à
// versão montada no servidor (proxy.ts → app/inicio), que conta sozinha.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Só a própria página avisa. Um site de fora não infla a contagem.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response(null, { status: 403 });

  let referer: string | null = null;
  try {
    const corpo = (await request.json()) as { origem?: unknown };
    if (typeof corpo.origem === "string" && corpo.origem.length <= 500) referer = corpo.origem || null;
  } catch {
    // corpo vazio ou estranho: a visita conta, sem origem
  }

  await registrarEvento({ tipo: "visita", caminho: "/", referer });
  return new Response(null, { status: 204 });
}
