import Link from "next/link";
import { listarPortaisPublicados } from "@/lib/portais";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import SeletorMunicipio from "@/components/site/SeletorMunicipio";
import MapaVivo from "@/components/site/inicio/MapaVivo";
import { DIREITOS_CIDADAO } from "@/lib/direitos-cidadao";
import { municipioDoParametro, municipioParaDados } from "@/lib/fatos-do-municipio";
import { caminhoDoRaioX } from "@/lib/slug-municipio";
import { indiceNoMapa } from "@/lib/mapa-municipios-codigos";
import { ESTADOS } from "@/lib/estados";
import { Surgir } from "@/components/portal/Vivo";

// ── A PORTA DO CIDADÃO ──
//
// Era uma lista cinza de municípios. Agora começa pela pergunta que o
// morador tem: "qual é a minha cidade?". Ele escolhe estado e cidade e a
// página responde:
//
//   · tem portal → um cartão grande para entrar nele;
//   · não tem → o que ele pode fazer agora (ver as contas da cidade no
//     Raio-X, com o dado do Tesouro) e um jeito de pedir o portal à
//     prefeitura, com a mensagem pronta para o WhatsApp.
//
// Sem escolha, mostra as cidades que já têm portal e a cidade de exemplo.
//
// O acesso ao banco é em tempo de requisição: prerenderizar exigiria banco
// no build, e uma queda momentânea quebraria o deploy de uma página pública.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal do cidadão",
  description:
    "Encontre o portal da transparência da sua cidade: para onde vai o dinheiro, as obras e um canal para falar com a prefeitura. Sem cadastro.",
};

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export default async function PortaDoCidadao({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; uf?: string }>;
}) {
  const parametros = await searchParams;
  const { portais, falhou } = await listarPortaisPublicados();

  const uf = typeof parametros.uf === "string" && (ESTADOS as readonly string[]).includes(parametros.uf) ? parametros.uf : null;
  const pedido = municipioDoParametro(parametros.m);
  const municipio = pedido && uf && pedido.uf !== uf ? null : pedido;
  const dados = municipio ? municipioParaDados(municipio) : null;

  // O portal casa pelo código do IBGE; nome + UF é a reserva para a
  // prefeitura que ainda não tem o código gravado.
  const portal = dados
    ? portais.find((p) => p.codigoIbge === dados.codigo) ??
      portais.find((p) => p.estado === dados.uf && normalizar(p.municipio) === normalizar(dados.nome)) ??
      null
    : null;

  const mensagemWhats = municipio
    ? `Oi! Sou morador de ${municipio.nome}. Queria ver pelo celular para onde vai o dinheiro da cidade, como estão as obras e poder fazer pedidos à prefeitura. Existe um portal assim, olha um exemplo: https://cidadeia.vercel.app/transparencia/exemplo. A nossa prefeitura podia ter um!`
    : "";

  return (
    <div className="tema-noite min-h-screen bg-background overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        {/* ═══ A PERGUNTA ═══ */}
        <section className="relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(55% 70% at 78% 35%, color-mix(in oklab, var(--brand) 16%, transparent), transparent 70%)" }}
            aria-hidden
          />
          <div className="relative max-w-[1200px] mx-auto px-4 sm:px-8 pt-12 sm:pt-20 pb-10 grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-8 items-center">
            <Surgir>
              <p className="inline-flex items-center gap-2.5 rounded-full border border-border px-3.5 py-1.5 text-sm" style={{ background: "var(--card)" }}>
                <span className="w-2 h-2 rounded-full portal-pulso" style={{ background: "var(--info)" }} />
                Portal do cidadão
              </p>
              <h1 className="text-[clamp(2.8rem,8vw,6rem)] font-semibold tracking-[-0.05em] leading-[0.95] mt-6">
                Qual é a sua <span style={{ color: "var(--brand-claro)" }}>cidade?</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted leading-relaxed mt-6 max-w-[34ch]">
                Veja para onde vai o dinheiro, como estão as obras e fale com a prefeitura. Sem cadastro.
              </p>
              <div className="mt-8 max-w-[560px]">
                <SeletorMunicipio uf={uf} inicial={municipio} acao="/transparencia" rotuloBotao="Procurar" />
              </div>
            </Surgir>
            <div className="relative aspect-square w-full max-w-[460px] mx-auto lg:ml-auto" aria-hidden>
              <MapaVivo destaque={dados ? indiceNoMapa(dados.codigo) : null} className="w-full h-full" />
            </div>
          </div>
        </section>

        {/* ═══ A RESPOSTA ═══ */}
        {municipio && (
          <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-6">
            <Surgir>
              {portal ? (
                <div
                  className="rounded-[28px] border p-7 sm:p-10 flex flex-wrap items-center justify-between gap-6"
                  style={{
                    borderColor: "color-mix(in oklab, var(--brand) 45%, var(--border))",
                    background: "radial-gradient(70% 90% at 100% 0%, color-mix(in oklab, var(--brand) 26%, transparent), transparent 70%), var(--card)",
                    boxShadow: "0 30px 90px -40px var(--brand)",
                  }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--info)" }}>
                      ● Portal no ar
                    </p>
                    <p className="text-3xl sm:text-5xl font-semibold tracking-[-0.045em] leading-tight mt-2">
                      {municipio.nome} tem portal.
                    </p>
                    <p className="text-muted mt-2">As contas, as obras e o canal com a prefeitura estão lá.</p>
                  </div>
                  <Link
                    href={`/transparencia/${portal.slug}`}
                    className="rounded-full px-7 py-4 font-semibold text-white transition hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, var(--brand), var(--accent))", boxShadow: "0 14px 44px -12px var(--brand)" }}
                  >
                    Entrar no portal de {municipio.nome} →
                  </Link>
                </div>
              ) : (
                <div className="rounded-[28px] border border-border p-7 sm:p-10" style={{ background: "var(--card)" }}>
                  <p className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em] leading-tight">
                    {municipio.nome} ainda não tem portal no CidadeIA.
                  </p>
                  <p className="text-muted mt-3 max-w-[60ch] leading-relaxed">
                    A prefeitura pode ter outro site de transparência; procure no site oficial dela. Enquanto isso, dá para
                    fazer duas coisas agora:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 mt-7">
                    <Link
                      href={caminhoDoRaioX(dados!)}
                      className="rounded-2xl border border-border hover:border-brand p-5 transition"
                      style={{ background: "var(--superficie)" }}
                    >
                      <p className="font-semibold">Ver as contas de {dados!.nome} agora</p>
                      <p className="text-sm text-muted mt-1.5 leading-relaxed">
                        Quanto a prefeitura gasta com pessoal, saúde e educação, com os números que ela manda ao governo federal.
                      </p>
                    </Link>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(mensagemWhats)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl border p-5 transition hover:opacity-90"
                      style={{ borderColor: "color-mix(in oklab, var(--info) 45%, var(--border))", background: "color-mix(in oklab, var(--info) 8%, var(--superficie))" }}
                    >
                      <p className="font-semibold" style={{ color: "var(--info)" }}>
                        Pedir o portal à prefeitura pelo WhatsApp
                      </p>
                      <p className="text-sm text-muted mt-1.5 leading-relaxed">
                        A mensagem já vai pronta. Mande para o vereador, para a prefeitura ou para o grupo do bairro.
                      </p>
                    </a>
                  </div>
                </div>
              )}
            </Surgir>
          </section>
        )}

        {/* ═══ AS CIDADES COM PORTAL ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em]">
              {falhou
                ? "A lista de cidades não carregou agora"
                : portais.length > 0
                  ? `${portais.length} ${portais.length === 1 ? "cidade já tem" : "cidades já têm"} portal`
                  : "As primeiras cidades estão chegando"}
            </h2>
            <Link href="/transparencia/exemplo" className="text-sm hover:underline" style={{ color: "var(--brand-claro)" }}>
              Ver como é um portal (cidade de exemplo) →
            </Link>
          </div>
          {falhou && (
            <p className="text-muted">Se você já tem o endereço do portal da sua cidade, ele continua funcionando direto.</p>
          )}
          {portais.length > 0 && (
            <ul className="flex flex-wrap gap-2.5">
              {portais.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/transparencia/${p.slug}`}
                    className="inline-flex items-center gap-2.5 rounded-full border border-border hover:border-brand px-5 py-2.5 text-sm font-medium transition"
                    style={{ background: "var(--card)" }}
                  >
                    <span className="w-2 h-2 rounded-full portal-pulso" style={{ background: "var(--info)" }} />
                    {p.municipio} <span className="text-muted font-normal">· {p.estado}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ═══ O QUE É SEU POR DIREITO ═══
            A lei ao lado de cada item de propósito: para o prefeito é
            conformidade a cumprir, para o cidadão é direito que já tem. */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-20 pb-24">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] mb-6">O que é seu por direito</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {DIREITOS_CIDADAO.map((d, i) => {
              const Icone = d.icone;
              return (
                <Surgir key={d.titulo} atraso={i * 0.06}>
                  <div className="rounded-3xl border border-border p-6 h-full" style={{ background: "var(--card)" }}>
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
                    >
                      <Icone className="w-5 h-5" />
                    </span>
                    <h3 className="font-semibold text-lg leading-snug mt-4">{d.titulo}</h3>
                    <p className="text-sm text-muted mt-2 leading-relaxed">{d.texto}</p>
                    <p className="text-xs font-mono text-muted mt-3">{d.lei}</p>
                  </div>
                </Surgir>
              );
            })}
          </div>
          <p className="text-xs text-muted leading-relaxed mt-10 max-w-[60ch]">
            É servidor de uma prefeitura e quer o portal no seu município?{" "}
            <Link href="/#proposta" className="font-semibold hover:underline" style={{ color: "var(--brand-claro)" }}>
              Peça a proposta
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
