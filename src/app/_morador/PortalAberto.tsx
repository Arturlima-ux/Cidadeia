import Link from "next/link";
import { Suspense } from "react";
import MapaVivo from "@/components/site/inicio/MapaVivo";
import AcheSuaCidade from "@/components/morador/AcheSuaCidade";
import PedidoLai from "@/components/morador/PedidoLai";
import { indiceNoMapa } from "@/lib/mapa-municipios-codigos";
import { CODIGO_FERNANDO_DE_NORONHA } from "@/lib/siconfi-tipos";
import type { Municipio } from "@/lib/municipios";
import type { PortalPublicado } from "@/lib/portais";
import CarregaSalarios from "./CarregaSalarios";
import CarregaContas from "./CarregaContas";
import CarregaPortalDaCidade from "./CarregaPortalDaCidade";
import { EsqueletoPergunta } from "./CartaoPergunta";
import { O_QUE_O_PORTAL_DA } from "./OPortal";

// ── TODA CIDADE TEM PORTAL ──
//
// O morador escolhia a cidade e esperava ver o portal dela; via cartões. Agora
// a cidade escolhida abre como portal, com a mesma cara do portal do
// CidadeIA (/transparencia/[slug]): o nome grande, o mapa, as seções.
//
// O que é público vem preenchido para as 5.571 cidades: o dinheiro, lido no
// que a prefeitura entrega ao Tesouro. O que só existe quando a prefeitura
// ativa o portal (a voz da cidade, as obras, as compras, o pedido com
// protocolo) aparece no lugar, trancado, dizendo isso. Nunca com número
// inventado para uma cidade real: a amostra de como fica é Bela Aurora, que
// é fictícia e diz que é.
//
// Quando a cidade já tem o portal contratado, as seções trancadas viram o
// portal ao vivo, com o botão de pedido.

export default function PortalAberto({
  municipio,
  dados,
  portal,
  linkPrefeitura,
}: {
  municipio: Municipio;
  dados: Municipio;
  portal: PortalPublicado | null;
  linkPrefeitura: string;
}) {
  const semPrefeitura = dados.codigo === CODIGO_FERNANDO_DE_NORONHA;
  const mensagemWhats =
    `Oi! Sou morador de ${municipio.nome}. Queria ver pelo celular para onde vai o dinheiro da cidade, como estão as obras e ` +
    `poder fazer pedidos à prefeitura. Existe um portal assim, olha um exemplo: https://cidadeia.vercel.app/transparencia/exemplo. ` +
    `A nossa prefeitura podia ter um!`;

  const nav = [
    { href: "#dinheiro", rotulo: "Para onde vai o dinheiro" },
    ...(semPrefeitura ? [] : [{ href: "#voz", rotulo: "A voz da cidade" }]),
    ...(semPrefeitura ? [] : [{ href: "#pedido", rotulo: "Peça uma informação" }]),
    { href: "#direitos", rotulo: "Seus direitos" },
  ];

  return (
    <>
      {/* ═══ A CIDADE ═══ */}
      <header className="relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(60% 70% at 75% 40%, color-mix(in oklab, var(--brand) 16%, transparent), transparent 70%)" }}
          aria-hidden
        />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-8 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Chave linkPrefeitura={linkPrefeitura} />
            <details className="group">
              <summary className="list-none cursor-pointer rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground hover:border-brand transition">
                Ver outra cidade
              </summary>
              <div className="absolute left-4 right-4 sm:left-auto sm:right-8 sm:w-[560px] mt-3 z-30 rounded-3xl border border-border p-4" style={{ background: "var(--card)", boxShadow: "var(--shadow-lg)" }}>
                <AcheSuaCidade compacto />
              </div>
            </details>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-6 lg:gap-10 items-center pt-10 sm:pt-14 pb-8">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2.5 rounded-full border border-border px-3.5 py-1.5 text-sm" style={{ background: "var(--card)" }}>
                <span className="w-2 h-2 rounded-full portal-pulso" style={{ background: "var(--brand)" }} />
                {portal ? "Portal da Transparência" : "Portal aberto · dados públicos"}
              </p>
              <p className="text-muted text-lg mt-6">
                {semPrefeitura ? "Distrito estadual" : "Prefeitura Municipal"}{" "}
                <span style={{ color: "var(--brand-claro)" }}>· {municipio.uf}</span>
              </p>
              <h1 className="text-[clamp(3rem,10vw,7rem)] font-semibold tracking-[-0.055em] leading-[0.92] mt-1 break-words">
                {municipio.nome}
              </h1>
              <p className="text-xl sm:text-2xl leading-snug mt-6 max-w-[28ch]">
                {semPrefeitura ? (
                  "A ilha não tem prefeitura: quem cuida dela é o Governo de Pernambuco."
                ) : (
                  <>
                    O que a prefeitura faz com o seu dinheiro.{" "}
                    <span style={{ color: "var(--brand-claro)" }}>E o que você pode fazer.</span>
                  </>
                )}
              </p>
              {!semPrefeitura && (
                <div className="flex flex-wrap gap-3 mt-8">
                  {portal ? (
                    <Link
                      href={`/transparencia/${portal.slug}#atendimento`}
                      className="rounded-full px-6 py-3.5 font-semibold"
                      style={{ background: "var(--brand)", color: "var(--sobre-forte)" }}
                    >
                      Fazer um pedido à prefeitura
                    </Link>
                  ) : (
                    <a href="#pedido" className="rounded-full px-6 py-3.5 font-semibold" style={{ background: "var(--brand)", color: "var(--sobre-forte)" }}>
                      Pedir uma informação
                    </a>
                  )}
                  <a href="#dinheiro" className="rounded-full px-6 py-3.5 font-medium border border-border hover:border-brand transition">
                    Ver as contas
                  </a>
                </div>
              )}
            </div>
            <div className="relative aspect-square w-full max-w-[460px] mx-auto lg:ml-auto hidden sm:block" aria-hidden>
              <MapaVivo destaque={indiceNoMapa(dados.codigo)} className="w-full h-full" />
            </div>
          </div>

          <nav aria-label="Nesta página" className="flex gap-2 overflow-x-auto pb-6 rolagem-discreta">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="shrink-0 rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground hover:border-brand transition">
                {n.rotulo}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* ═══ PARA ONDE VAI O DINHEIRO ═══ */}
      <section id="dinheiro" className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 scroll-mt-24">
        <Titulo
          olho="Para onde vai o dinheiro"
          titulo={
            <>
              Três respostas. <span style={{ color: "var(--brand-claro)" }}>Em português claro.</span>
            </>
          }
          texto="Tiradas do que a própria prefeitura entrega ao Tesouro Nacional, para todas as cidades do Brasil."
        />
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

      {/* ═══ A VOZ DA CIDADE, AS OBRAS E AS COMPRAS ═══ */}
      {!semPrefeitura && (
        <section id="voz" className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-24 scroll-mt-24">
          <Titulo
            olho="A voz da cidade"
            titulo={
              <>
                A cidade fala. <span style={{ color: "var(--brand-claro)" }}>A prefeitura responde.</span>
              </>
            }
            texto={
              portal
                ? "Os pedidos dos moradores e as respostas da prefeitura, as obras e as compras. Ao vivo, do portal da cidade."
                : `Pedidos com número de protocolo, as respostas da prefeitura, as obras e as compras. Esta parte do portal de ${municipio.nome} liga quando a prefeitura ativar o portal do CidadeIA.`
            }
          />
          {portal ? (
            <Suspense
              key={`p${portal.slug}`}
              fallback={<div className="rounded-[28px] border border-border h-72 animate-pulse" style={{ background: "var(--card)" }} />}
            >
              <CarregaPortalDaCidade slug={portal.slug} cidade={dados.nome} />
            </Suspense>
          ) : (
            <Trancado cidade={municipio.nome} mensagemWhats={mensagemWhats} />
          )}
        </section>
      )}

      {/* ═══ PEÇA UMA INFORMAÇÃO ═══ */}
      {!semPrefeitura && (
        <section id="pedido" className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-24 scroll-mt-24">
          <Titulo
            olho="Peça uma informação"
            titulo={
              <>
                Quer saber mais? <span style={{ color: "var(--brand-claro)" }}>Peça.</span>
              </>
            }
            texto={`Qualquer pessoa pode pedir informação pública à prefeitura de ${dados.nome}, e ela tem 20 dias para responder. O pedido sai pronto aqui.`}
          />
          <PedidoLai cidade={dados.nome} uf={dados.uf} linkPortal={portal ? `/transparencia/${portal.slug}` : null} />
        </section>
      )}
    </>
  );
}

function Titulo({ olho, titulo, texto }: { olho: string; titulo: React.ReactNode; texto?: string }) {
  return (
    <div className="max-w-[720px] mb-8">
      <p className="text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: "var(--brand-claro)" }}>
        {olho}
      </p>
      <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.04em] leading-[1.05] mt-3">{titulo}</h2>
      {texto && <p className="text-muted text-base sm:text-lg leading-relaxed mt-4">{texto}</p>}
    </div>
  );
}

/**
 * O pedaço do portal que só a prefeitura liga, no lugar dele. As formas
 * apagadas lembram o portal sem mostrar número nenhum: número aqui seria
 * dado inventado sobre uma cidade de verdade.
 */
function Trancado({ cidade, mensagemWhats }: { cidade: string; mensagemWhats: string }) {
  const partes = O_QUE_O_PORTAL_DA.slice(0, 2).concat(O_QUE_O_PORTAL_DA.slice(3, 4));
  return (
    <div className="relative rounded-[28px] border border-border overflow-hidden" style={{ background: "var(--card)" }}>
      <div className="p-6 sm:p-9 grid grid-cols-2 sm:grid-cols-4 gap-3 opacity-40 pointer-events-none select-none" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: "var(--sutil)" }}>
            <div className="h-8 w-16 rounded-lg" style={{ background: "var(--border)" }} />
            <div className="h-3 w-24 rounded mt-3" style={{ background: "var(--border)" }} />
          </div>
        ))}
        {Array.from({ length: 3 }, (_, i) => (
          <div key={`l${i}`} className="col-span-2 sm:col-span-4 h-14 rounded-2xl" style={{ background: "var(--sutil)" }} />
        ))}
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center p-5"
        style={{ background: "linear-gradient(180deg, color-mix(in oklab, var(--card) 55%, transparent), var(--card) 75%)" }}
      >
        <div className="max-w-[560px] text-center">
          <span
            className="inline-flex w-12 h-12 rounded-full items-center justify-center"
            style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <p className="text-xl sm:text-2xl font-semibold tracking-[-0.03em] mt-4">
            A prefeitura de {cidade} ainda não ligou esta parte.
          </p>
          <ul className="text-sm text-muted mt-3 space-y-1">
            {partes.map((p) => (
              <li key={p.titulo}>{p.titulo}</li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(mensagemWhats)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border px-6 py-3 font-semibold transition hover:opacity-90"
              style={{ borderColor: "color-mix(in oklab, var(--brand) 50%, var(--border))", color: "var(--brand-claro)", background: "var(--brand-tint)" }}
            >
              Pedir o portal pelo WhatsApp
            </a>
            <Link href="/transparencia/exemplo" className="rounded-full border border-border px-6 py-3 font-medium hover:border-brand transition">
              Ver como fica (cidade de exemplo)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A chave "Sou da prefeitura / Sou morador", com o morador ativo. */
export function Chave({ linkPrefeitura }: { linkPrefeitura: string }) {
  return (
    <div role="tablist" aria-label="Quem está olhando" className="inline-flex rounded-full border border-border p-1.5" style={{ background: "var(--card)" }}>
      <Link role="tab" aria-selected={false} href={linkPrefeitura} className="rounded-full px-4 sm:px-5 py-2.5 text-sm font-medium text-muted hover:text-foreground transition">
        Sou da prefeitura
      </Link>
      <span role="tab" aria-selected className="rounded-full px-4 sm:px-5 py-2.5 text-sm font-semibold" style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}>
        Sou morador
      </span>
    </div>
  );
}
