import { registrarEvento } from "@/lib/registrar-evento";
import { lerCampanha, type Campanha } from "@/lib/links-de-campanha";

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
  let campanha: Campanha | null = null;
  try {
    const corpo = (await request.json()) as { origem?: unknown; busca?: unknown };
    if (typeof corpo.origem === "string" && corpo.origem.length <= 500) referer = corpo.origem || null;
    // A busca da página (?utm_source=…): só vale o link marcado pelo
    // CidadeIA, e dele só o canal e o número do prospecto.
    if (typeof corpo.busca === "string" && corpo.busca.length <= 500) campanha = lerCampanha(new URLSearchParams(corpo.busca));
  } catch {
    // corpo vazio ou estranho: a visita conta, sem origem
  }

  await registrarEvento({ tipo: "visita", caminho: "/", referer, campanha });
  return new Response(null, { status: 204 });
}
