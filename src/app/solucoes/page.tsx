import Link from "next/link";
import { registrarEvento } from "@/lib/registrar-evento";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import SeletorPainelModulo from "@/components/site/SeletorPainelModulo";
import MontadorProposta from "@/components/site/MontadorProposta";
import { PLANOS_ADDON } from "@/lib/planos";
import { detalheDoModulo } from "@/lib/modulos-detalhe";
import { compartilhamento, JsonLdScript, ldSoftware, ldBreadcrumb } from "@/lib/seo";

import { IconAlertas, IconSaude, IconEducacao, IconObras, IconLicitacoes, IconVisaoGeral } from "@/components/icons";

const ICONE_ADDON: Record<string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  essencial: IconAlertas,
  saude: IconSaude,
  educacao: IconEducacao,
  obras: IconObras,
  licitacoes: IconLicitacoes,
  gestao: IconVisaoGeral,
};

export const metadata = compartilhamento({
  titulo: "Soluções",
  descricao:
    "Os seis módulos do CidadeIA — Essencial, Gestão, Saúde, Educação, Obras e Licitações — com o que cada um entrega, o painel de cada um e o montador de proposta.",
  caminho: "/solucoes",
});

export default async function SolucoesPage({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
}) {
  await registrarEvento({ tipo: "visita", caminho: "/solucoes" });

  const params = await searchParams;
  const demoIndisponivel = params.demo === "indisponivel";
  // ── A PÁGINA NO PADRÃO DA HOME ──
  // Os seis módulos vêm primeiro, como um índice com o que cada um entrega
  // (a mesma fonte da home, lib/modulos-detalhe). Depois o painel de cada um
  // e, por último, o montador de proposta. Quem chega aqui pelo antigo
  // /precos tem o atalho para o montador logo no topo.
  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <JsonLdScript dados={[ldSoftware(), ldBreadcrumb([{ nome: "Início", caminho: "/" }, { nome: "Soluções", caminho: "/solucoes" }])]} />
      <SiteHeader />
      <main id="conteudo">
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-16">
          <h1 className="titulo-pagina">Soluções</h1>
          {demoIndisponivel && (
            <p
              className="text-sm rounded-xl px-4 py-3 border mt-6 max-w-2xl"
              style={{ color: "var(--medio)", background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}
            >
              A demonstração não pôde ser preparada agora. Tente de novo em instantes, ou
              veja o painel de cada módulo nesta página.
            </p>
          )}
          <p className="inicio-lead text-muted mt-6 max-w-[48ch]">
            Seis módulos avulsos, um por área da prefeitura. Você contrata só os que vai
            usar, pela faixa de habitantes do município, sem fidelidade.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
            <a
              href="#montar"
              className="bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-6 py-3 transition"
            >
              Montar proposta
            </a>
            <Link href="/demo" className="inicio-sublinhado text-sm text-muted">
              Abrir a demonstração, sem cadastro
            </Link>
          </div>
        </section>

        <section id="modulos" className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-24 scroll-mt-24">
          <ul className="border-t border-border">
            {PLANOS_ADDON.map((p) => {
              const Icone = ICONE_ADDON[p.chave];
              const detalhe = detalheDoModulo(p.chave);
              return (
                <li
                  key={p.chave}
                  className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 lg:gap-16 py-10 border-b border-border"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <Icone className="w-5 h-5 shrink-0" style={{ color: "var(--brand-claro)" }} />
                      <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em]">{p.nome}</h2>
                    </div>
                    <p className="text-muted leading-relaxed mt-3 max-w-[40ch]">
                      {detalhe?.resumo ?? p.descricao}
                    </p>
                    <Link
                      href={`/modulos/${p.chave}`}
                      className="inicio-sublinhado inline-block mt-4 text-sm text-brand-claro"
                    >
                      Conhecer o módulo
                    </Link>
                  </div>
                  <div>
                    {detalhe && (
                      <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                        {detalhe.capacidades.map((c) => (
                          <li key={c} className="flex gap-2.5 text-sm leading-snug text-muted">
                            <span
                              aria-hidden
                              className="mt-[7px] w-1 h-1 rounded-full shrink-0"
                              style={{ background: "var(--brand-claro)" }}
                            />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {detalhe?.automacao && (
                      <p className="mt-5 pt-4 border-t border-border text-sm text-muted leading-relaxed">
                        <span className="text-foreground font-medium">Roda sozinho:</span>{" "}
                        {detalhe.automacao}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted mt-6 max-w-[64ch] leading-relaxed">
            O valor de cada módulo é por faixa de habitantes, a da população do IBGE, e vem
            na proposta com o termo de referência. Por mês, sem fidelidade.
          </p>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-24">
          <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:gap-16 items-end mb-10">
            <h2 className="titulo-secao max-w-[16ch]">O painel de cada módulo.</h2>
            <p className="text-muted leading-relaxed max-w-[42ch]">
              O mesmo formato em toda secretaria. Muda a métrica, de acordo com o que o
              módulo cuida.
            </p>
          </div>
          <div className="max-w-4xl">
            <SeletorPainelModulo />
          </div>
        </section>

        <section id="montar" className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-28 scroll-mt-24">
          <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:gap-16 items-end mb-10">
            <h2 className="titulo-secao max-w-[16ch]">Monte a sua proposta.</h2>
            <p className="text-muted leading-relaxed max-w-[42ch]">
              Município e módulos. O porte sai da população do IBGE e a proposta chega em
              até um dia útil, com o termo de referência pronto.
            </p>
          </div>
          <MontadorProposta />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
