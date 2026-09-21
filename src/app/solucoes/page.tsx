import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
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
  const params = await searchParams;
  const demoIndisponivel = params.demo === "indisponivel";
  return (
    <div className="tema-noite min-h-screen">
      <JsonLdScript dados={[ldSoftware(), ldBreadcrumb([{ nome: "Início", caminho: "/" }, { nome: "Soluções", caminho: "/solucoes" }])]} />
      <SiteHeader />

      <Reveal>
        <section className="max-w-3xl mx-auto px-4 sm:px-8 pt-16 pb-8 text-center">
          <h1 className="font-serif text-4xl font-bold">Soluções</h1>
          {demoIndisponivel && (
            <p
              className="text-sm rounded-lg px-3 py-2.5 border mt-4 text-left"
              style={{ color: "var(--medio)", background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}
            >
              A demonstração não pôde ser preparada agora. Tente de novo em instantes — ou
              veja o painel de cada módulo logo abaixo.
            </p>
          )}
          <p className="text-muted text-base mt-4 leading-relaxed">
            Cada área é um módulo avulso, contratado separadamente conforme o que
            sua gestão precisa. Você paga só pelo que usa.
          </p>
        </section>
      </Reveal>

      {/* O simulador existia só na home, na quinta seção. A página que se
          chama "Preços" abria com uma tabela — e a pergunta que a pessoa traz
          é "quanto fica para o MEU município, com o que EU preciso". É isto
          que o simulador responde, então ele abre a página. */}
      <Reveal>
        <section className="max-w-5xl mx-auto px-4 sm:px-8 pb-16">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl font-bold">Monte a sua proposta</h2>
            <p className="text-muted mt-2 leading-relaxed max-w-lg mx-auto">
              Informe o município e marque os módulos. O porte sai da população
              do IBGE — não é uma escolha — e a proposta chega em até um dia útil,
              por módulo e pela faixa do seu município, com o termo de referência
              pronto.
            </p>
          </div>
          <MontadorProposta />
        </section>
      </Reveal>

      <Reveal>
        <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-16">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl font-bold">O painel de cada módulo</h2>
            <p className="text-muted mt-2 leading-relaxed max-w-lg mx-auto">
              Mesmo formato pra toda secretaria — só muda a métrica de acordo com o que aquele módulo cuida.
            </p>
          </div>
          <SeletorPainelModulo />
          <p className="text-sm text-center mt-6">
            <a href="/demo" className="font-semibold text-brand-claro hover:text-foreground transition">
              Prefere clicar? Explore a demonstração — o painel de verdade, sem cadastro →
            </a>
          </p>
        </section>
      </Reveal>

      <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-16">
        <h2 id="modulos" className="font-serif text-xl font-bold scroll-mt-24">Os seis módulos</h2>
        {/* A regra, escrita: o valor de cada módulo depende da faixa de
            habitantes, e a faixa é a da população do IBGE para o município.
            Já houve botão para escolher a faixa; não há mais, e a tabela
            abaixo existe para a conta ser aberta — não para ser escolhida. */}
        <p className="text-sm text-muted mt-1.5 mb-5 leading-relaxed max-w-2xl">
          Cada área é um módulo avulso. O valor é por faixa de habitantes — a do seu
          município é a da população estimada pelo IBGE, que o sistema define
          sozinho — e vem na proposta, com o termo de referência.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {PLANOS_ADDON.map((p, i) => {
            const Icone = ICONE_ADDON[p.chave];
            const detalhe = detalheDoModulo(p.chave);
            return (
              <Reveal key={p.chave} delay={(i % 2) * 100}>
                <div className="card-interactive shadow-elevated bg-card border border-border rounded-2xl p-5 h-full">
                  <div
                    className="w-10 h-10 rounded-xl text-white flex items-center justify-center mb-4"
                    style={{ background: "var(--gradient-hero)" }}
                  >
                    <Icone className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-sm">{p.nome}</p>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">{p.descricao}</p>

                  {/* ── O MESMO QUE A HOME PROMETE ──
                      A home listava o que cada módulo entrega e esta página
                      mostrava só uma frase — diferente da de lá. Quem
                      comparava as duas telas via dois produtos. A lista vem
                      da mesma fonte da home (lib/modulos-detalhe), item por
                      item. */}
                  {detalhe && (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {detalhe.capacidades.map((c) => (
                        <li key={c} className="flex gap-2 text-xs leading-snug text-muted">
                          <span aria-hidden="true" style={{ color: "var(--accent)" }}>
                            ✓
                          </span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {detalhe?.automacao && (
                    <p className="mt-3 text-xs leading-relaxed text-muted">
                      <span
                        className="font-bold uppercase tracking-wider mr-1.5"
                        style={{ color: "var(--accent-claro)" }}
                      >
                        Automático
                      </span>
                      {detalhe.automacao}
                    </p>
                  )}
                  <Link
                    href={`/modulos/${p.chave}`}
                    className="inline-block mt-3 text-xs font-semibold text-brand hover:underline"
                  >
                    Conhecer o módulo →
                  </Link>

                  {/* Aqui dizia "Sob consulta — pedir proposta" em TODOS os
                      módulos, enquanto a calculadora da home mostrava os
                      valores. A página de preços era a única do site sem
                      preço — e contradizia frontalmente o argumento central,
                      que é "a conta está aberta, sem reunião com comercial".

                      Os números saem da mesma tabela que alimenta a
                      calculadora, então não há como as duas divergirem de
                      novo. Onde o preço ainda não existe, o rótulo continua
                      "sob consulta", que é honesto — mas hoje não é o caso de
                      nenhum módulo. */}
                  {/* Sem valores: a tabela de preços é interna, por decisão
                      comercial. O que se diz é a regra — o valor depende da
                      faixa de habitantes, que o IBGE define — e o caminho. */}
                  <p className="mt-4 pt-4 border-t border-border text-xs text-muted leading-relaxed">
                    Valor por faixa de habitantes, na proposta. Módulo avulso, por mês, sem fidelidade.
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold">Some só os módulos que a prefeitura vai usar.</p>
            <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-lg mx-auto">
              Monte a proposta no topo desta página: município, módulos, e ela
              chega em até um dia útil. Contratação em prefeitura passa por
              proposta, processo e empenho — não por cartão —, e o valor vai
              junto do termo de referência.
            </p>
            {/* A ação cheia era "Criar conta grátis", que leva a uma conta sem
                módulo nenhum e a um checkout ainda não configurado. Quem fecha
                a contratação é a proposta; a conta vem depois dela. */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/proposta"
                className="bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-6 py-2.5 transition"
              >
                Receber proposta
              </Link>
              <Link
                href="/diagnostico"
                className="text-sm font-semibold text-foreground hover:text-brand transition border border-border rounded-full px-6 py-2.5"
              >
                Fazer o diagnóstico
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
