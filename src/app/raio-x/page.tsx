import { compartilhamento } from "@/lib/seo";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MapaVivo from "@/components/site/inicio/MapaVivo";
import FormularioRaioX from "./FormularioRaioX";
import Link from "next/link";
import ConferenciaConformidade from "@/components/site/ConferenciaConformidade";
import { ESTADOS, NOME_DOS_ESTADOS } from "@/lib/estados";

export const metadata = compartilhamento({
  titulo: "Raio-X da prefeitura: despesa com pessoal e LRF",
  descricao:
    "Digite a cidade e veja a despesa com pessoal na régua da LRF, a receita e a entrega do RREO e do RGF, lidas na hora do Tesouro Nacional. Sem cadastro.",
  caminho: "/raio-x",
});

// ── O TOPO NO PADRÃO DA HOME ──
// Título grande e o formulário à esquerda; à direita, o país com um ponto por
// município (o mesmo MapaVivo da home). A faixa de estados fica embaixo,
// como segunda porta, em texto simples.
export default function RaioXPage() {
  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        <section className="relative max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 sm:pt-24 pb-20 sm:pb-28">
          <div className="grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-12 lg:gap-14 items-center">
            <div>
              <h1 className="titulo-pagina max-w-[14ch]">O que já se sabe sobre a sua prefeitura.</h1>
              <p className="inicio-lead text-muted mt-6 max-w-[44ch]">
                Digite o município e veja o que a própria prefeitura publicou no
                Tesouro: receita, aplicação por área e os relatórios que faltam.
                Sem cadastro.
              </p>
              <div className="mt-10">
                <FormularioRaioX />
              </div>

              <p className="text-sm font-medium text-muted mt-14 mb-4">
                Ou veja todas as prefeituras de um estado
              </p>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.map((uf) => (
                  <Link
                    key={uf}
                    href={`/raio-x/${uf.toLowerCase()}`}
                    title={NOME_DOS_ESTADOS[uf]}
                    className="text-sm font-medium rounded-full border border-border px-3.5 py-1.5 hover:border-brand hover:text-brand-claro transition"
                  >
                    {uf}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden lg:block relative h-[600px]" aria-hidden>
              <MapaVivo className="w-full h-full" />
            </div>
          </div>
        </section>
        <ConferenciaConformidade />
      </main>

      <SiteFooter />
    </div>
  );
}
