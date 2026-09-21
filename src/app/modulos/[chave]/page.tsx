import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Olho from "@/components/site/Olho";
import PainelModuloFiel from "@/components/site/PainelModuloFiel";
import { PLANOS_ADDON } from "@/lib/planos";
import { detalheDoModulo } from "@/lib/modulos-detalhe";
import { PAINEIS_MODULOS } from "@/lib/paineis-modulos";
import { IconCheck } from "@/components/icons";
import { compartilhamento, JsonLdScript, ldBreadcrumb } from "@/lib/seo";

// ── UMA PÁGINA POR MÓDULO ──
//
// Os seis módulos viviam comprimidos na home: texto, lista, "Automático",
// "Ver na proposta", seis vezes seguidas. Parecia especificação, não
// catálogo. Cada módulo ganha página própria com o que já existia
// espalhado: o mockup fiel de Preços, o resumo e as capacidades de
// lib/modulos-detalhe, a tabela de valores por faixa. Nada é escrito duas
// vezes — a página lê das mesmas fontes que a home e Preços.
//
// O bloco "IA" só aparece com a chave da Anthropic no ambiente, pela mesma
// razão da home: anunciar recurso que o servidor não executa é vender o que
// não é entregue. Sem a chave, o que existe é a leitura automática por
// regras — e é isso que a página diz.

export function generateStaticParams() {
  return PLANOS_ADDON.map((p) => ({ chave: p.chave }));
}

export async function generateMetadata({ params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;
  const plano = PLANOS_ADDON.find((p) => p.chave === chave);
  if (!plano) return { title: "Módulo" };
  return compartilhamento({
    titulo: `Módulo ${plano.nome}`,
    descricao: detalheDoModulo(plano.chave)?.resumo ?? plano.descricao,
    caminho: `/modulos/${plano.chave}`,
  });
}

export default async function ModuloPage({ params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;
  const plano = PLANOS_ADDON.find((p) => p.chave === chave);
  const detalhe = plano ? detalheDoModulo(plano.chave) : undefined;
  const painel = PAINEIS_MODULOS.find((p) => p.chave === chave);
  if (!plano || !detalhe || !painel) notFound();

  const iaAtiva = Boolean(process.env.ANTHROPIC_API_KEY);
  const outros = PLANOS_ADDON.filter((p) => p.chave !== plano.chave);

  return (
    <div className="tema-noite min-h-screen">
      <JsonLdScript dados={ldBreadcrumb([{ nome: "Início", caminho: "/" }, { nome: "Soluções", caminho: "/solucoes" }, { nome: plano.nome, caminho: `/modulos/${plano.chave}` }])} />
      <SiteHeader />
      <main>
        {/* ── capa: o que é, e a tela ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-12">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-center">
            <Reveal>
              <div>
                <Olho>Módulo</Olho>
                <h1 className="font-serif text-4xl sm:text-5xl font-extrabold tracking-[-0.035em] leading-[1.02] mt-4">
                  {plano.nome}
                </h1>
                <p className="text-foreground text-lg leading-relaxed mt-5 max-w-[46ch]">{detalhe.resumo}</p>
                <p className="text-muted leading-relaxed mt-3 max-w-[46ch]">{plano.descricao}</p>
                <div className="flex flex-wrap items-center gap-3 mt-8">
                  <Link
                    href={`/proposta?modulos=${plano.chave}`}
                    className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-6 py-3.5 transition shadow-elevated"
                  >
                    Adicionar à minha proposta&nbsp;&nbsp;→
                  </Link>
                  <a
                    href="#valores"
                    className="border border-border bg-white/[0.03] hover:bg-white/[0.07] font-semibold text-sm rounded-xl px-5 py-3.5 transition"
                  >
                    Como é o valor
                  </a>
                </div>
              </div>
            </Reveal>
            <Reveal delay={140}>
              <div>
                <PainelModuloFiel painel={painel} />
                <p className="text-xs text-muted text-center mt-3">
                  Números fictícios de uma prefeitura modelo. A tela, os blocos e os
                  rótulos são os do painel de verdade.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── o que passa a existir ── */}
        <section className="border-y border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-16">
            <div className="grid md:grid-cols-[1fr_1fr] gap-10">
              <Reveal>
                <div>
                  <h2 className="font-serif text-2xl font-extrabold tracking-[-0.03em]">
                    O que a secretaria passa a ver
                  </h2>
                  <ul className="flex flex-col gap-3 mt-6">
                    {detalhe.capacidades.map((c) => (
                      <li key={c} className="flex gap-3 text-sm leading-snug">
                        <IconCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                        <span className="text-muted">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={100}>
                <div className="flex flex-col gap-4">
                  {detalhe.automacao && (
                    <div className="rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--accent-claro)" }}>
                        Automático
                      </p>
                      <p className="text-sm leading-relaxed mt-2">{detalhe.automacao}</p>
                    </div>
                  )}
                  <div className="rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-claro">
                      {iaAtiva ? "IA" : "Leitura automática"}
                    </p>
                    <p className="text-sm leading-relaxed mt-2">
                      {iaAtiva && detalhe.ia
                        ? detalhe.ia
                        : "Regras sobre o dado cadastrado apontam o ponto mais importante agora, dizem de onde o número veio (\"caiu 7 pontos desde junho\") e sugerem uma ação concreta — ou dizem que não há dado suficiente, em vez de forçar um insight genérico. Cada frase é explicável ao Tribunal de Contas."}
                    </p>
                  </div>
                  {detalhe.noPortal && (
                    <div className="rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Portal do cidadão</p>
                      <p className="text-sm leading-relaxed mt-2">
                        Parte do que este módulo registra aparece no portal público do
                        município, sem login — é a transparência ativa que a LAI exige.
                      </p>
                    </div>
                  )}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── valores ── */}
        <section id="valores" className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-16">
          <Reveal>
            <div className="max-w-2xl">
              <Olho>Valores</Olho>
              <h2 className="font-serif text-2xl font-extrabold tracking-[-0.03em] mt-4">
                Valor na proposta, pela faixa do seu município
              </h2>
              <p className="text-sm text-muted leading-relaxed mt-3">
                Módulo avulso, por mês, sem fidelidade. O valor depende da faixa de
                habitantes — a população estimada pelo IBGE, que o sistema define
                sozinho — e chega na proposta em até um dia útil, com o termo de
                referência pronto para o jurídico.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Link
                href={`/proposta?modulos=${plano.chave}`}
                className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-6 py-3.5 transition shadow-elevated"
              >
                Montar proposta com {plano.nome}&nbsp;&nbsp;→
              </Link>
              <Link href="/solucoes" className="text-sm font-semibold text-muted hover:text-foreground transition">
                Ver todos os módulos
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ── outros módulos ── */}
        <section className="border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted mb-4">Outros módulos</p>
            <div className="flex flex-wrap gap-2.5">
              {outros.map((o) => (
                <Link
                  key={o.chave}
                  href={`/modulos/${o.chave}`}
                  className="text-sm font-semibold rounded-full border border-border px-4 py-2 hover:border-brand hover:text-brand-claro transition"
                >
                  {o.nome} →
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
