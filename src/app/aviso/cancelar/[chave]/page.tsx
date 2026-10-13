import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { ORIGEM_AVISO, inscritoDaChave } from "@/lib/aviso-da-cidade";
import { cancelarAvisoDaCidade } from "@/app/_atendimento/aviso-actions";

// ── PARAR DE RECEBER O AVISO ──
// Com botão, e não num clique só no link: o filtro de segurança do e-mail da
// prefeitura abre todo link que recebe, e um descadastro por GET cancelaria
// o aviso antes de a pessoa ler o primeiro.

export const dynamic = "force-dynamic";
export const metadata = { title: "Parar o aviso da cidade", robots: { index: false } };

export default async function CancelarAvisoPage({
  params,
  searchParams,
}: {
  params: Promise<{ chave: string }>;
  searchParams: Promise<{ feito?: string }>;
}) {
  const { chave } = await params;
  const { feito } = await searchParams;
  const id = inscritoDaChave(chave);
  const [l] = id
    ? await db
        .select({ municipio: leads.municipio, uf: leads.uf })
        .from(leads)
        .where(and(eq(leads.id, id), eq(leads.origem, ORIGEM_AVISO)))
        .limit(1)
    : [];

  async function parar() {
    "use server";
    await cancelarAvisoDaCidade(chave);
    redirect(`/aviso/cancelar/${chave}?feito=1`);
  }

  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />
      <main id="conteudo" className="max-w-xl mx-auto px-4 sm:px-8 py-20 sm:py-28">
        {!l ? (
          <>
            <h1 className="titulo-pagina">Link inválido.</h1>
            <p className="text-muted mt-5 leading-relaxed">
              Não encontramos esta inscrição. Se continuar recebendo avisos, responda qualquer um deles pedindo para
              parar.
            </p>
          </>
        ) : feito ? (
          <>
            <h1 className="titulo-pagina">Pronto.</h1>
            <p className="text-muted mt-5 leading-relaxed">
              Você não vai mais receber o aviso de {l.municipio}/{l.uf}. O Raio-X continua aberto quando quiser
              conferir.
            </p>
            <Link href="/raio-x" className="inicio-sublinhado inline-block mt-8">
              Abrir o Raio-X
            </Link>
          </>
        ) : (
          <>
            <h1 className="titulo-pagina">Parar o aviso de {l.municipio}/{l.uf}?</h1>
            <p className="text-muted mt-5 leading-relaxed">
              Você deixa de receber o e-mail quando um relatório fiscal da cidade estiver para vencer, vencer ou for
              entregue.
            </p>
            <form action={parar} className="mt-8">
              <button
                type="submit"
                className="rounded-full border border-border hover:border-brand px-6 py-3 font-semibold transition"
              >
                Parar de receber
              </button>
            </form>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
