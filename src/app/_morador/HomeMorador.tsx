import Link from "next/link";
import { Suspense } from "react";
import MapaVivo from "@/components/site/inicio/MapaVivo";
import AcheSuaCidade from "@/components/morador/AcheSuaCidade";
import PedidoLai from "@/components/morador/PedidoLai";
import { DIREITOS_CIDADAO } from "@/lib/direitos-cidadao";
import { indiceNoMapa } from "@/lib/mapa-municipios-codigos";
import { CODIGO_FERNANDO_DE_NORONHA } from "@/lib/siconfi-tipos";
import type { Municipio } from "@/lib/municipios";
import type { PortalPublicado } from "@/lib/portais";
import CarregaSalarios from "./CarregaSalarios";
import CarregaContas from "./CarregaContas";
import CarregaPortalDaCidade from "./CarregaPortalDaCidade";
import OPortal from "./OPortal";
import { EsqueletoPergunta } from "./CartaoPergunta";

// ── A HOME DO MORADOR ──
//
// "Sou morador" não troca um campo: troca o site. Outra cor, outro
// cabeçalho, outra conversa. Some tudo o que é venda (régua para o prefeito,
// módulos, proposta, vídeo) e fica o que o morador veio saber:
//
//   1. quanto do dinheiro vai para pagar os servidores;
//   2. quanto foi para saúde e educação, e quanto dá por morador;
//   3. se a prefeitura está prestando contas;
//
// e o que ele pode FAZER com isso: falar com a prefeitura pelo portal, pedir
// o portal, ou mandar um pedido pela Lei de Acesso à Informação, pronto.
//
// A cidade se acha digitando o nome, sem escolher estado antes, ou pelo
// "Estou aqui" (components/morador/AcheSuaCidade.tsx).

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export default function HomeMorador({
  municipio,
  dados,
  portais,
  linkPrefeitura,
}: {
  /** O que a pessoa escolheu (pode ser uma região do DF). */
  municipio: Municipio | null;
  /** De onde vêm os números (no DF, Brasília). */
  dados: Municipio | null;
  portais: PortalPublicado[];
  /** A mesma página no modo da prefeitura. */
  linkPrefeitura: string;
}) {
  const portal = dados
    ? portais.find((p) => p.codigoIbge === dados.codigo) ??
      portais.find((p) => p.estado === dados.uf && normalizar(p.municipio) === normalizar(dados.nome)) ??
      null
    : null;
  const semPrefeitura = dados?.codigo === CODIGO_FERNANDO_DE_NORONHA;

  const mensagemWhats = municipio
    ? `Oi! Sou morador de ${municipio.nome}. Queria ver pelo celular para onde vai o dinheiro da cidade, como estão as obras e poder fazer pedidos à prefeitura. Existe um portal assim, olha um exemplo: https://cidadeia.vercel.app/transparencia/exemplo. A nossa prefeitura podia ter um!`
    : "";

  return (
    <>
      {/* ═══ HERÓI ═══ */}
      <section className="relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(60% 70% at 80% 30%, color-mix(in oklab, var(--brand) 14%, transparent), transparent 70%)" }}
          aria-hidden
        />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 sm:pt-14 pb-10">
          <Chave linkPrefeitura={linkPrefeitura} />

          <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-8 items-center mt-8 sm:mt-12">
            <div className="min-w-0">
              {municipio ? (
                <>
                  <p className="text-sm font-medium" style={{ color: "var(--brand-claro)" }}>
                    Sua cidade
                  </p>
                  <h1 className="text-[clamp(2.6rem,9vw,5.6rem)] font-semibold tracking-[-0.05em] leading-[0.95] mt-3 break-words">
                    {municipio.nome}
                    <span className="text-muted">, {municipio.uf}</span>
                  </h1>
                  <p className="text-lg text-muted mt-5 max-w-[46ch] leading-relaxed">
                    {semPrefeitura
                      ? "A ilha não tem prefeitura: quem cuida dela é o Governo de Pernambuco."
                      : "Três respostas sobre o dinheiro da sua cidade, tiradas do que a própria prefeitura entrega ao Tesouro Nacional."}
                  </p>
                  <div className="mt-8 max-w-[640px]">
                    <p className="text-sm text-muted mb-2.5">Ver outra cidade</p>
                    <AcheSuaCidade compacto />
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-[clamp(2.5rem,7.5vw,5.2rem)] font-semibold tracking-[-0.05em] leading-[0.98]">
                    O que a prefeitura faz com o{" "}
                    <span style={{ color: "var(--brand-claro)" }}>seu dinheiro?</span>
                  </h1>
                  <p className="text-lg sm:text-xl text-muted mt-6 max-w-[44ch] leading-relaxed">
                    Digite sua cidade e veja, em português claro, quanto vai para os servidores, para a saúde e para a
                    educação, e se a prefeitura está prestando contas. Sem cadastro.
                  </p>
                  <div className="mt-9 max-w-[680px]">
                    <AcheSuaCidade />
                  </div>
                  <p className="text-sm text-muted mt-4">
                    Vale para as 5.571 cidades do Brasil. Os números vêm do Tesouro Nacional.
                  </p>
                </>
              )}
            </div>
            <div className="relative aspect-square w-full max-w-[440px] mx-auto lg:ml-auto hidden sm:block" aria-hidden>
              <MapaVivo destaque={dados ? indiceNoMapa(dados.codigo) : null} className="w-full h-full" />
            </div>
          </div>
        </div>
      </section>

      {municipio && dados ? (
        <>
          {/* ═══ AS TRÊS RESPOSTAS ═══ */}
          <section id="sua-cidade" className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-6 scroll-mt-24">
            <div className="grid lg:grid-cols-3 gap-4">
              <Suspense key={`s${dados.codigo}`} fallback={<EsqueletoPergunta numero={1} titulo="Quanto vai para pagar os servidores?" />}>
                <CarregaSalarios codigoIbge={dados.codigo} />
              </Suspense>
              <Suspense
                key={`c${dados.codigo}`}
                fallback={
                  <>
                    <EsqueletoPergunta numero={2} titulo="Quanto foi para saúde e educação?" />
                    <EsqueletoPergunta numero={3} titulo="A prefeitura está prestando contas?" />
                  </>
                }
              >
                <CarregaContas municipio={dados.nome} uf={dados.uf} populacao={dados.populacao} />
              </Suspense>
            </div>
          </section>

          {/* ═══ O PORTAL DA CIDADE ═══
              Com portal: ele ao vivo, com os pedidos, as obras e o botão de
              pedido. Sem portal: o que o morador ganharia com ele, e como
              pedir. */}
          {!semPrefeitura &&
            (portal ? (
              <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-20">
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em]">Fale com a prefeitura.</h2>
                <Suspense
                  key={`p${portal.slug}`}
                  fallback={<div className="mt-6 rounded-[28px] border border-border h-72 animate-pulse" style={{ background: "var(--card)" }} />}
                >
                  <CarregaPortalDaCidade slug={portal.slug} cidade={dados.nome} />
                </Suspense>
              </section>
            ) : (
              <OPortal
                titulo={
                  <>
                    É isto que {dados.nome} <span className="text-muted">ainda não tem.</span>
                  </>
                }
                subtitulo={`Quando a prefeitura contrata o portal do CidadeIA, quem mora em ${dados.nome} passa a ter, no celular:`}
                acoes={
                  <>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(mensagemWhats)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border px-6 py-3.5 font-semibold transition hover:opacity-90"
                      style={{ borderColor: "color-mix(in oklab, var(--brand) 50%, var(--border))", color: "var(--brand-claro)" }}
                    >
                      Pedir o portal pelo WhatsApp
                    </a>
                    <Link href="/transparencia/exemplo" className="rounded-full border border-border px-6 py-3.5 font-medium hover:border-brand transition">
                      Abrir o portal de exemplo
                    </Link>
                  </>
                }
              />
            ))}

          {/* ═══ O PEDIDO PRONTO ═══ */}
          {!semPrefeitura && (
            <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-20">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em]">
                Quer saber mais? <span className="text-muted">Peça.</span>
              </h2>
              <p className="text-lg text-muted mt-3 max-w-[60ch] leading-relaxed">
                Qualquer pessoa pode pedir informação pública à prefeitura de {dados.nome}, e ela tem 20 dias para
                responder. O pedido sai pronto aqui.
              </p>
              <div className="mt-8">
                <PedidoLai cidade={dados.nome} uf={dados.uf} linkPortal={portal ? `/transparencia/${portal.slug}` : null} />
              </div>
            </section>
          )}
        </>
      ) : (
        /* ═══ SEM CIDADE: O QUE ELA VAI RESPONDER ═══ */
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-10">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: 1, t: "Quanto vai para pagar os servidores?", d: "De cada R$ 100 que a prefeitura arrecada, quantos viram salário, e onde a lei manda parar." },
              { n: 2, t: "Quanto foi para saúde e educação?", d: "O que já foi gasto no ano, e quanto isso dá por morador da cidade." },
              { n: 3, t: "A prefeitura está prestando contas?", d: "Se ela entregou ao Tesouro os relatórios que a lei obriga, no prazo." },
            ].map((c) => (
              <div key={c.n} className="rounded-[28px] border border-border p-6 sm:p-7" style={{ background: "var(--card)" }}>
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
                >
                  {c.n}
                </span>
                <p className="text-xl font-semibold tracking-[-0.02em] mt-5">{c.t}</p>
                <p className="text-muted mt-2 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!municipio && (
        <OPortal
          titulo={
            <>
              E quando a cidade tem o <span style={{ color: "var(--brand-claro)" }}>portal do CidadeIA</span>.
            </>
          }
          subtitulo="É o portal da transparência que a prefeitura põe no ar com o CidadeIA. O morador abre no celular e tem:"
          acoes={
            <>
              <Link href="/transparencia/exemplo" className="rounded-full border border-border px-6 py-3.5 font-medium hover:border-brand transition">
                Abrir o portal de exemplo →
              </Link>
              {portais.slice(0, 4).map((p) => (
                <Link
                  key={p.slug}
                  href={`/transparencia/${p.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3.5 text-sm font-medium hover:border-brand transition"
                >
                  <span className="w-2 h-2 rounded-full portal-pulso" style={{ background: "var(--brand)" }} />
                  {p.municipio} · {p.estado}
                </Link>
              ))}
            </>
          }
        />
      )}

      {/* ═══ O QUE É SEU POR DIREITO ═══ */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-20">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em]">O que é seu por direito.</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {DIREITOS_CIDADAO.map((d) => {
            const Icone = d.icone;
            return (
              <div key={d.titulo} className="rounded-[28px] border border-border p-6 sm:p-7" style={{ background: "var(--card)" }}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}>
                  <Icone className="w-5 h-5" />
                </span>
                <h3 className="font-semibold text-lg leading-snug mt-4">{d.titulo}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">{d.texto}</p>
                <p className="text-xs font-mono text-muted mt-3">{d.lei}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ A SAÍDA PARA A PREFEITURA ═══ */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-20 pb-24">
        <div className="border-t border-border pt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted">Trabalha na prefeitura?</p>
          <Link href={linkPrefeitura} className="font-semibold hover:underline" style={{ color: "var(--brand-claro)" }}>
            Veja o CidadeIA para quem faz a gestão →
          </Link>
        </div>
      </section>
    </>
  );
}

/** A chave "Sou da prefeitura / Sou morador", aqui com o morador ativo. */
function Chave({ linkPrefeitura }: { linkPrefeitura: string }) {
  return (
    <div role="tablist" aria-label="Quem está olhando" className="inline-flex rounded-full border border-border p-1.5" style={{ background: "var(--card)" }}>
      <Link role="tab" aria-selected={false} href={linkPrefeitura} className="rounded-full px-5 py-2.5 text-sm font-medium text-muted hover:text-foreground transition">
        Sou da prefeitura
      </Link>
      <span role="tab" aria-selected className="rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}>
        Sou morador
      </span>
    </div>
  );
}
