import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import { compartilhamento } from "@/lib/seo";
import { GUIAS } from "@/lib/guias";

export const metadata = compartilhamento({
  titulo: "Guias de LRF, LAI e contratação para a prefeitura",
  descricao:
    "Prazos do RREO e do RGF, limites da despesa com pessoal, prazo de resposta da LAI e da ouvidoria e dispensa de licitação para software, com o artigo de cada regra.",
  caminho: "/guias",
});

export default function GuiasPage() {
  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 sm:pt-24 pb-10">
          <Olho>Guias</Olho>
          <h1 className="titulo-pagina mt-5 max-w-[18ch]">O que a lei pede, com o artigo ao lado.</h1>
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-[60ch]">
            Respostas curtas para as perguntas de quem cuida das contas, do controle e do atendimento da prefeitura.
            Cada guia diz a regra, o prazo e onde conferir no texto da lei.
          </p>
        </section>
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-20 sm:pb-28">
          <ul className="grid gap-4 sm:grid-cols-2">
            {GUIAS.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guias/${g.slug}`}
                  className="card-interactive block h-full rounded-2xl border border-border p-6 sm:p-7"
                  style={{ background: "var(--card)" }}
                >
                  <h2 className="text-lg sm:text-xl font-semibold tracking-[-0.02em] leading-snug">{g.chamada}</h2>
                  <p className="mt-2 text-muted leading-relaxed">{g.descricao}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
