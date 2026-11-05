import { municipioPorSlug, caminhoDoRaioX } from "@/lib/slug-municipio";
import { hojeEmBrasilia } from "@/lib/cobranca";
import { montarCalendario, nomeDoCalendario } from "@/lib/calendario-prazos";
import { URL_BASE } from "@/lib/seo";

// O calendário de prazos da cidade (lib/calendario-prazos.ts) num endereço
// fixo: é o link do e-mail do Raio-X, para quem tem o anexo bloqueado, e
// serve de assinatura na agenda (o Google e o Outlook releem o endereço).
// Dado público, igual ao da página do município; o e-mail é a isca, não o
// cadeado.
export async function GET(_req: Request, { params }: { params: Promise<{ uf: string; slug: string }> }) {
  const { uf, slug } = await params;
  const m = municipioPorSlug(uf, slug);
  if (!m) return new Response("Município não encontrado.", { status: 404 });
  const ics = montarCalendario({
    codigoIbge: m.codigo,
    municipio: m.nome,
    uf: m.uf,
    hoje: hojeEmBrasilia(),
    link: `${URL_BASE}${caminhoDoRaioX(m)}`,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${nomeDoCalendario(slug, m.uf)}"`,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
