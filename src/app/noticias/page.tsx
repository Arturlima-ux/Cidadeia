import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import { NOTICIAS, dataDaNoticia } from "@/lib/noticias";
import { compartilhamento } from "@/lib/seo";

export const metadata = compartilhamento({
  titulo: "Notícias",
  descricao: "O que mudou no CidadeIA, com data: novos módulos, novas fontes de dado público e o que chegou ao portal do cidadão.",
  caminho: "/noticias",
});

// Agrupadas por mês, da mais nova para a mais antiga. O texto de cada uma
// fica em lib/noticias.ts, e só entra lá o que já está no ar.
export default function NoticiasPage() {
  const porMes = new Map<string, typeof NOTICIAS>();
  for (const n of [...NOTICIAS].sort((a, b) => b.data.localeCompare(a.data))) {
    const mes = dataDaNoticia(n.data).replace(/^\d+ de /, "");
    porMes.set(mes, [...(porMes.get(mes) ?? []), n]);
  }

  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 sm:pt-24 pb-10">
          <Olho>Notícias</Olho>
          <h1 className="titulo-pagina mt-5 max-w-[20ch]">O que mudou no CidadeIA.</h1>
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-[60ch]">
            Cada novidade com a data em que entrou no ar e o lugar onde dá para ver. Aqui só entra o que já funciona.
          </p>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-20 sm:pb-28">
          {[...porMes.entries()].map(([mes, lista]) => (
            <div key={mes} className="mt-6 first:mt-0">
              <h2 className="text-sm font-medium text-muted first-letter:uppercase">{mes}</h2>
              <ol className="mt-4 grid gap-4">
                {lista.map((n) => (
                  <li key={n.titulo}>
                    <article
                      className="rounded-2xl border border-border p-5 sm:p-7 grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8"
                      style={{ background: "var(--card)" }}
                    >
                      <div className="flex sm:flex-col gap-x-3 gap-y-1 text-sm">
                        <time dateTime={n.data} className="text-muted tabular-nums">
                          {dataDaNoticia(n.data).replace(/ de \d{4}$/, "")}
                        </time>
                        <span style={{ color: "var(--brand-claro)" }}>{n.categoria}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-semibold tracking-[-0.02em] leading-snug">{n.titulo}</h3>
                        <p className="mt-2 text-muted leading-relaxed max-w-[70ch]">{n.resumo}</p>
                        {n.link && (
                          <Link href={n.link.href} className="inicio-sublinhado inline-block mt-4 text-sm">
                            {n.link.rotulo}
                          </Link>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
