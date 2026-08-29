import Link from "next/link";
import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/sessao";
import { PLANOS_ADDON } from "@/lib/planos";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import PainelExecutivo from "@/components/PainelExecutivo";
import { PAINEIS_MODULOS } from "@/lib/paineis-modulos";
import {
  IconVisaoGeral,
  IconIA,
  IconAlertas,
  IconDownload,
  IconHistorico,
  IconModulos,
  IconCheck,
  IconSaude,
  IconEducacao,
  IconObras,
  IconLicitacoes,
} from "@/components/icons";

const RECURSO_DESTAQUE = {
  icone: IconIA,
  titulo: "IA Central",
  descricao:
    "Converse sobre os indicadores e alertas já cadastrados na sua prefeitura. As respostas usam só dados reais — nunca números inventados.",
};

const RECURSOS_LISTA = [
  {
    icone: IconVisaoGeral,
    titulo: "Dashboard executivo",
    descricao: "Receita, despesas, saldo e índice de transparência num só painel.",
  },
  {
    icone: IconAlertas,
    titulo: "Alertas com apoio de IA",
    descricao: "A IA sugere, uma pessoa aprova antes de virar alerta oficial.",
  },
  {
    icone: IconHistorico,
    titulo: "Histórico e projeções",
    descricao: "Evolução de cada indicador ao longo do tempo, com simulação de cenários.",
  },
  {
    icone: IconDownload,
    titulo: "Relatórios em PDF",
    descricao: "Da prefeitura inteira ou de uma secretaria, prontos quando precisar.",
  },
  {
    icone: IconModulos,
    titulo: "Módulos por secretaria",
    descricao: "Saúde, Educação, Obras e Licitações — ative só o que precisa.",
  },
];

const MOTIVOS = [
  {
    problema: "Dado espalhado entre secretarias",
    solucao: "Painel único, consolidado automaticamente",
  },
  {
    problema: "Relatório pro TCE feito na correria",
    solucao: "PDF executivo pronto a qualquer momento",
  },
  {
    problema: "Problema só aparece quando já é crise",
    solucao: "IA sinaliza padrão preocupante, com justificativa",
  },
];

const PASSOS = [
  {
    numero: "1",
    titulo: "Cadastre sua prefeitura",
    descricao: "Leva poucos minutos — CNPJ, dados básicos e quem vai administrar o sistema.",
  },
  {
    numero: "2",
    titulo: "Ative os módulos que precisa",
    descricao: "Contrate Essencial, Saúde, Educação, Obras, Licitações e/ou Gestão — só o que sua prefeitura usa.",
  },
  {
    numero: "3",
    titulo: "Gerencie tudo com apoio de IA",
    descricao: "Dashboards, alertas sugeridos e relatórios prontos — cada secretário só vê a própria área.",
  },
];

const ICONE_ADDON: Record<string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  essencial: IconAlertas,
  saude: IconSaude,
  educacao: IconEducacao,
  obras: IconObras,
  licitacoes: IconLicitacoes,
  gestao: IconVisaoGeral,
};

export default async function LandingPage() {
  const sessao = await lerSessao();
  if (sessao) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SiteHeader />

      {/* HERO — assimétrico: texto compacto em cima, um painel-arco grande
          embaixo carregando o peso visual, no lugar do par badge+card 50/50. */}
      <section className="relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-16 sm:pt-20">
          <Reveal delay={0}>
            <div className="flex items-center gap-3 text-brand-dark">
              <span className="h-px w-10" style={{ background: "var(--brand)" }} />
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                Sistema operacional para prefeituras
              </span>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-serif text-[2.6rem] leading-[1.05] sm:text-6xl sm:leading-[1.03] font-bold mt-5 max-w-3xl">
              A prefeitura inteira, <span className="text-shimmer">num só lugar</span>.
            </h1>
          </Reveal>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-t border-border pt-6">
            <Reveal delay={220}>
              <p className="text-muted text-base leading-relaxed max-w-sm">
                Dashboards por secretaria, alertas sugeridos por IA e relatórios
                prontos — tudo com dados reais, sem planilha solta.
              </p>
            </Reveal>
            <Reveal delay={320}>
              <div className="flex items-center gap-5 shrink-0">
                <Link
                  href="/cadastro"
                  className="group bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-6 py-3 transition shadow-elevated inline-flex items-center gap-1.5"
                >
                  Criar conta grátis
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
                </Link>
                <Link
                  href="/login"
                  className="group text-sm font-semibold text-foreground hover:text-brand transition inline-flex items-center gap-1"
                >
                  Entrar
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Painel-arco — elemento assinatura carregando o produto, não uma
            manchinha de gradiente atrás do texto. */}
        <Reveal delay={200}>
          <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-12 sm:mt-16">
            <div
              className="relative overflow-hidden border border-border shadow-lg"
              style={{
                background: "var(--gradient-hero)",
                borderRadius: "72px 72px 0 0",
                paddingTop: "3.5rem",
              }}
            >
              <div className="px-6 sm:px-12 pb-10 sm:pb-14">
                <div className="max-w-lg mx-auto animate-float">
                  <PainelExecutivo
                    nomePrefeitura="Prefeitura Modelo"
                    metricas={PAINEIS_MODULOS[1].metricas}
                    eficienciaPct={PAINEIS_MODULOS[1].eficienciaPct}
                    eficienciaLabel={PAINEIS_MODULOS[1].eficienciaLabel}
                    alerta={PAINEIS_MODULOS[1].alerta}
                  />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAIXA DE CONFIANÇA */}
      <Reveal>
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs sm:text-sm font-medium text-muted">
            <span className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-brand shrink-0" /> Feito só pra prefeituras brasileiras
            </span>
            <span className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-brand shrink-0" /> IA nunca inventa número
            </span>
            <span className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-brand shrink-0" /> Dados isolados por prefeitura
            </span>
            <span className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-brand shrink-0" /> Alinhado à LGPD
            </span>
          </div>
        </section>
      </Reveal>

      {/* POR QUE CIDADEIA — lista com seta, não cards em grid */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 py-20">
        <Reveal>
          <h2 className="font-serif text-3xl font-bold max-w-md">Por que o prefeito precisa disso</h2>
        </Reveal>
        <div className="mt-10 divide-y divide-border border-t border-border">
          {MOTIVOS.map((m, i) => (
            <Reveal key={m.problema} delay={i * 90}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-5">
                <p className="text-sm text-muted line-through sm:w-72 shrink-0" style={{ textDecorationColor: "var(--urgente)" }}>
                  {m.problema}
                </p>
                <span className="hidden sm:inline text-brand">→</span>
                <p className="text-sm font-semibold">{m.solucao}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <Link
            href="/por-que-cidadeia"
            className="group mt-8 text-sm font-semibold text-brand hover:text-brand-dark transition inline-flex items-center gap-1.5"
          >
            Ver a lista completa de motivos
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
        </Reveal>
      </section>

      {/* RECURSOS — um destaque grande + lista compacta, não grid uniforme */}
      <section id="recursos" className="max-w-6xl mx-auto px-4 sm:px-8 py-20">
        <Reveal>
          <div className="max-w-xl mb-12">
            <h2 className="font-serif text-3xl font-bold">Feito para o dia a dia da gestão</h2>
            <p className="text-muted mt-3 leading-relaxed">
              Cada recurso já está pronto e funcionando — sem promessa de "em breve".
            </p>
          </div>
        </Reveal>
        <div className="grid lg:grid-cols-5 gap-6 items-stretch">
          <Reveal className="lg:col-span-2">
            <div
              className="h-full text-white p-7 flex flex-col justify-between"
              style={{ background: "var(--gradient-hero)", borderRadius: "34px 12px 12px 12px" }}
            >
              <div>
                <div className="arco-badge w-11 h-11 bg-white/15 flex items-center justify-center mb-6">
                  <RECURSO_DESTAQUE.icone className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-2xl font-bold">{RECURSO_DESTAQUE.titulo}</h3>
                <p className="text-white/85 text-sm mt-3 leading-relaxed">{RECURSO_DESTAQUE.descricao}</p>
              </div>
              <Link
                href="/dashboard/ia"
                className="group mt-8 text-sm font-semibold text-white inline-flex items-center gap-1.5"
              >
                Ver como funciona
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </Reveal>
          <div className="lg:col-span-3 divide-y divide-border border-t border-b border-border lg:border-0">
            {RECURSOS_LISTA.map((r, i) => (
              <Reveal key={r.titulo} delay={i * 70}>
                <div className="flex items-start gap-4 py-5 lg:py-4">
                  <div
                    className="arco-badge w-9 h-9 text-white flex items-center justify-center shrink-0"
                    style={{ background: "var(--gradient-hero)" }}
                  >
                    <r.icone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{r.titulo}</h3>
                    <p className="text-sm text-muted mt-1 leading-relaxed">{r.descricao}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA — trilho horizontal conectado, não círculos soltos */}
      <section id="como-funciona" className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20">
          <Reveal>
            <h2 className="font-serif text-3xl font-bold max-w-md mb-14">Como funciona</h2>
          </Reveal>
          <div className="relative grid sm:grid-cols-3 gap-10 sm:gap-8">
            <div
              aria-hidden
              className="hidden sm:block absolute top-[18px] left-[16.5%] right-[16.5%] h-px"
              style={{ background: "var(--border)" }}
            />
            {PASSOS.map((p, i) => (
              <Reveal key={p.numero} delay={i * 140}>
                <div className="relative">
                  <div
                    className="relative z-10 w-9 h-9 rounded-full text-white flex items-center justify-center font-serif font-bold text-sm mb-5"
                    style={{ background: "var(--gradient-hero)" }}
                  >
                    {p.numero}
                  </div>
                  <h3 className="font-semibold text-sm">{p.titulo}</h3>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">{p.descricao}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* MÓDULOS — lista em espinha, não cards 2x2 */}
      <section id="modulos" className="max-w-4xl mx-auto px-4 sm:px-8 py-20">
        <Reveal>
          <div className="max-w-xl mb-10">
            <h2 className="font-serif text-3xl font-bold">Módulos sob demanda</h2>
            <p className="text-muted mt-3 leading-relaxed">
              Cada área é um módulo avulso. Contrate só o que sua prefeitura precisa.
            </p>
          </div>
        </Reveal>

        <div className="divide-y divide-border border-t border-border mt-2">
          {PLANOS_ADDON.map((p, i) => {
            const Icone = ICONE_ADDON[p.chave];
            return (
              <Reveal key={p.chave} delay={i * 60}>
                <div className="flex items-center gap-4 py-4">
                  <div
                    className="arco-badge w-9 h-9 text-white flex items-center justify-center shrink-0"
                    style={{ background: "var(--gradient-hero)" }}
                  >
                    <Icone className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{p.nome}</p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{p.descricao}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* CTA FINAL — no fundo normal da página, com o arco como moldura, não
          uma faixa colorida de ponta a ponta. */}
      <section className="relative overflow-hidden border-t border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-24 w-[46rem] h-[30rem] opacity-[0.06]"
          style={{ background: "var(--brand)", borderRadius: "50% 50% 0 0 / 42% 42% 0 0" }}
        />
        <Reveal>
          <div className="relative max-w-2xl mx-auto px-4 sm:px-8 py-20 text-center">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold">
              Pronto para modernizar sua gestão?
            </h2>
            <p className="mt-3 text-muted leading-relaxed">
              Crie sua conta agora — leva poucos minutos e não precisa de cartão de crédito.
            </p>
            <Link
              href="/cadastro"
              className="group mt-7 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-6 py-3 transition shadow-elevated inline-flex items-center gap-1.5"
            >
              Criar conta grátis
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
