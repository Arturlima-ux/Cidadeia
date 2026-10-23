import type { ReactNode } from "react";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import LinkOficial from "@/components/site/LinkOficial";
import { JsonLdScript, ldBreadcrumb, ldGuia } from "@/lib/seo";
import { GUIAS, type Guia } from "@/lib/guias";

const DATA = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * O molde dos guias: título, data de revisão, o texto, as fontes citadas e o
 * caminho para o Raio-X. A tipografia é a das páginas de texto do site
 * (FAQ, Conformidade): coluna estreita, títulos de seção em h2.
 */
export default function GuiaArtigo({
  guia,
  fontes,
  children,
}: {
  guia: Guia;
  /** As leis e bases citadas no texto, com o endereço oficial. */
  fontes: { rotulo: string; href: string }[];
  children: ReactNode;
}) {
  const caminho = `/guias/${guia.slug}`;
  const outros = GUIAS.filter((g) => g.slug !== guia.slug);
  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <JsonLdScript
        dados={[
          ldBreadcrumb([
            { nome: "Início", caminho: "/" },
            { nome: "Guias", caminho: "/guias" },
            { nome: guia.chamada, caminho },
          ]),
          ldGuia({ titulo: guia.chamada, descricao: guia.descricao, caminho, revisadoEm: guia.revisadoEm }),
        ]}
      />
      <SiteHeader />
      <main id="conteudo">
        <article className="max-w-[760px] mx-auto px-4 sm:px-8 pt-14 sm:pt-24 pb-16">
          <Olho>
            <Link href="/guias" className="hover:underline">
              Guias para a prefeitura
            </Link>
          </Olho>
          <h1 className="titulo-pagina mt-5">{guia.chamada}</h1>
          <p className="mt-6 text-lg text-muted leading-relaxed">{guia.descricao}</p>
          <p className="mt-4 text-sm text-muted">
            Revisado em <time dateTime={guia.revisadoEm}>{DATA.format(new Date(`${guia.revisadoEm}T00:00:00Z`))}</time>. Não
            substitui o parecer da contabilidade nem da assessoria jurídica do município.
          </p>

          <div className="guia-texto mt-10">{children}</div>

          <aside className="mt-12 rounded-2xl border border-border p-6" style={{ background: "var(--card)" }}>
            <h2 className="text-base font-semibold">Onde conferir</h2>
            <ul className="mt-3 grid gap-2 text-sm text-muted">
              {fontes.map((f) => (
                <li key={f.href}>
                  <LinkOficial href={f.href}>{f.rotulo}</LinkOficial>
                </li>
              ))}
            </ul>
          </aside>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/raio-x"
              className="pressiona bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-6 py-3"
            >
              Ver o Raio-X da minha prefeitura
            </Link>
            <Link href="/proposta" className="pressiona rounded-full border border-border font-semibold text-sm px-6 py-3 hover:bg-[color:var(--sutil)]">
              Receber proposta
            </Link>
          </div>

          <nav aria-label="Outros guias" className="mt-14 border-t border-border pt-8">
            <h2 className="text-base font-semibold">Outros guias</h2>
            <ul className="mt-3 grid gap-2">
              {outros.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guias/${g.slug}`} className="text-brand-claro hover:underline">
                    {g.chamada}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
