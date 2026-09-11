import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import SeletorPainelModulo from "@/components/site/SeletorPainelModulo";
import MontadorProposta from "@/components/site/MontadorProposta";
import { PLANOS_ADDON } from "@/lib/planos";
import { PRECO_MENSAL, PORTES } from "@/lib/precos";
import { formatarMoeda } from "@/lib/formatadores";
import { IconAlertas, IconSaude, IconEducacao, IconObras, IconLicitacoes, IconVisaoGeral } from "@/components/icons";

const ICONE_ADDON: Record<string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  essencial: IconAlertas,
  saude: IconSaude,
  educacao: IconEducacao,
  obras: IconObras,
  licitacoes: IconLicitacoes,
  gestao: IconVisaoGeral,
};

export const metadata = {
  title: "Preços — CidadeIA",
};

export default function PrecosPage() {
  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />

      <Reveal>
        <section className="max-w-3xl mx-auto px-4 sm:px-8 pt-16 pb-8 text-center">
          <h1 className="font-serif text-4xl font-bold">Preços</h1>
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
              do IBGE — não é uma escolha — e o valor anual aparece na hora, com
              o caminho de contratação que cabe.
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
        </section>
      </Reveal>

      <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-16">
        <h2 className="font-serif text-xl font-bold">Módulos disponíveis</h2>
        {/* A regra, escrita: o valor de cada módulo depende da faixa de
            habitantes, e a faixa é a da população do IBGE para o município.
            Já houve botão para escolher a faixa; não há mais, e a tabela
            abaixo existe para a conta ser aberta — não para ser escolhida. */}
        <p className="text-sm text-muted mt-1.5 mb-5 leading-relaxed max-w-2xl">
          Valores mensais por faixa de habitantes. A faixa do seu município é a
          da população estimada pelo IBGE — o sistema a define sozinho, e é ela
          que vale na proposta e no contrato.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {PLANOS_ADDON.map((p, i) => {
            const Icone = ICONE_ADDON[p.chave];
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
                  <dl className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-3 text-center">
                    {PORTES.map((porte) => {
                      const valor = PRECO_MENSAL[p.chave][porte.chave];
                      return (
                        <div key={porte.chave}>
                          <dt className="text-[11px] text-muted leading-tight">
                            {porte.rotulo} {porte.detalhe}
                          </dt>
                          <dd className="font-serif text-base font-bold tabular-nums mt-0.5">
                            {valor === null ? (
                              <span className="text-xs font-sans font-medium text-muted">
                                sob consulta
                              </span>
                            ) : (
                              formatarMoeda(valor)
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                  <p className="text-[11px] text-muted mt-2 text-center">por mês</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold">Some só os módulos que a prefeitura vai usar.</p>
            <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-lg mx-auto">
              O simulador no topo desta página fecha o total anual pelo porte do
              seu município e diz se cabe na dispensa por valor. Contratação em
              prefeitura passa por proposta, processo e empenho — não por
              cartão —, e o valor vai junto do termo de referência.
            </p>
            {/* A ação cheia era "Criar conta grátis", que leva a uma conta sem
                módulo nenhum e a um checkout ainda não configurado. Quem fecha
                a contratação é a proposta; a conta vem depois dela. */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/suporte?assunto=proposta"
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
