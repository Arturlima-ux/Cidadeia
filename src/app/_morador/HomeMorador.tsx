import Link from "next/link";
import MapaVivo from "@/components/site/inicio/MapaVivo";
import AcheSuaCidade from "@/components/morador/AcheSuaCidade";
import { DIREITOS_CIDADAO } from "@/lib/direitos-cidadao";
import { indiceNoMapa } from "@/lib/mapa-municipios-codigos";
import type { Municipio } from "@/lib/municipios";
import type { PortalPublicado } from "@/lib/portais";
import OPortal from "./OPortal";
import PortalAberto, { Chave } from "./PortalAberto";

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


  // Cidade escolhida: ela abre como portal (PortalAberto.tsx).
  if (municipio && dados) {
    return (
      <>
        <PortalAberto municipio={municipio} dados={dados} portal={portal} linkPrefeitura={linkPrefeitura} />
        <Direitos />
        <Saida linkPrefeitura={linkPrefeitura} />
      </>
    );
  }

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
            </div>
            <div className="relative aspect-square w-full max-w-[440px] mx-auto lg:ml-auto hidden sm:block" aria-hidden>
              <MapaVivo destaque={dados ? indiceNoMapa(dados.codigo) : null} className="w-full h-full" />
            </div>
          </div>
        </div>
      </section>

      {!municipio && (
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

      <Direitos />
      <Saida linkPrefeitura={linkPrefeitura} />
    </>
  );
}

function Direitos() {
  return (
      <section id="direitos" className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-24 scroll-mt-24">
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
  );
}

function Saida({ linkPrefeitura }: { linkPrefeitura: string }) {
  return (
      <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-20 pb-24">
        <div className="border-t border-border pt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted">Trabalha na prefeitura?</p>
          <Link href={linkPrefeitura} className="font-semibold hover:underline" style={{ color: "var(--brand-claro)" }}>
            Veja o CidadeIA para quem faz a gestão →
          </Link>
        </div>
      </section>
  );
}
