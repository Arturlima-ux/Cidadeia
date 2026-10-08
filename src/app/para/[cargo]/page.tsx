import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import PecaUmaLigacao from "@/components/site/PecaUmaLigacao";
import BarrasPanorama from "@/components/site/BarrasPanorama";
import { CARGOS, cargoPorSlug, ASSINATURAS_DO_RGF, type Cargo } from "@/lib/cargos";
import { PLANOS_ADDON } from "@/lib/planos";
import { linkWhatsappComercial } from "@/lib/contato-comercial";
import { PANORAMA, mesDoPanorama, numeroBr, passaramDoAlerta, umaEmCada } from "@/lib/panorama";
import { compartilhamento } from "@/lib/seo";
import { registrarEvento } from "@/lib/registrar-evento";

// ── UMA PÁGINA POR QUEM ASSINA O RGF ──
//
// Prefeito, finanças e controle interno chegam com perguntas diferentes, e
// a home não consegue responder às três ao mesmo tempo. Cada página fala com
// uma pessoa: o que está em jogo para ela (com o artigo), o que o CidadeIA
// faz, as objeções que ela costuma ter, e os dois caminhos — a proposta já
// com os módulos certos marcados, ou a equipe ligando. Texto em lib/cargos.ts.

export const dynamicParams = false;

export function generateStaticParams() {
  return CARGOS.map((c) => ({ cargo: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ cargo: string }> }) {
  const { cargo } = await params;
  const c = cargoPorSlug(cargo);
  if (!c) return { title: "Página não encontrada" };
  return compartilhamento({
    titulo: `CidadeIA para ${c.publico.toLowerCase()}`,
    descricao: c.descricaoSeo,
    caminho: `/para/${c.slug}`,
  });
}

/** O número do panorama que mais pesa para cada cargo. */
function provaDoCargo(c: Cargo): { numero: string; texto: string } {
  const b = PANORAMA.brasil;
  const mes = mesDoPanorama();
  if (c.slug === "financas") {
    return {
      numero: numeroBr(b.rgfAtrasado),
      texto: `prefeituras estavam com o RGF seguinte vencido e ainda não entregue ao Tesouro, na conferência de ${mes}. Outras ${numeroBr(b.numerosQueNaoFecham)} tinham, no RGF, números que não fecham.`,
    };
  }
  const passaram = passaramDoAlerta(b);
  const fracao = umaEmCada(passaram, b);
  if (c.slug === "controle") {
    return {
      numero: numeroBr(b.acimaDoLimite),
      texto: `prefeituras declararam ao Tesouro despesa com pessoal acima do limite da LRF, na conferência de ${mes}. Em cada uma, o controle interno assina o mesmo RGF.`,
    };
  }
  return {
    numero: numeroBr(passaram),
    texto: `prefeituras${fracao ? ` (${fracao})` : ""} já tinham passado do sinal de alerta da despesa com pessoal na conferência de ${mes}.`,
  };
}

export default async function CargoPage({ params }: { params: Promise<{ cargo: string }> }) {
  const { cargo } = await params;
  const c = cargoPorSlug(cargo);
  if (!c) notFound();
  await registrarEvento({ tipo: "visita", caminho: `/para/${c.slug}` });

  const prova = provaDoCargo(c);
  const modulos = PLANOS_ADDON.filter((p) => c.modulos.includes(p.chave));
  const linkProposta = `/proposta?modulos=${c.modulos.join(",")}`;
  const outros = CARGOS.filter((x) => x.slug !== c.slug);

  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        {/* ═══ TOPO ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 sm:pt-24 pb-14">
          <Olho>Para {c.publico.toLowerCase()}</Olho>
          <h1 className="titulo-pagina mt-5 max-w-[22ch]">{c.titulo}</h1>
          <div className="mt-10 grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-10 lg:gap-16 items-start">
            <div>
              <p className="text-lg text-muted leading-relaxed max-w-[56ch]">{c.lead}</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link
                  href={linkProposta}
                  className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5"
                >
                  Receber a proposta
                </Link>
                <a href="#atendimento" className="inicio-sublinhado text-muted">
                  Prefiro que a equipe ligue
                </a>
              </div>
              <p className="mt-4 text-sm text-muted">Proposta em um dia útil, com o processo de contratação pronto.</p>
            </div>
            <div className="lg:border-l border-border lg:pl-10">
              <p className="text-5xl sm:text-6xl font-semibold tabular-nums tracking-[-0.045em]">{prova.numero}</p>
              <p className="mt-3 text-muted leading-relaxed max-w-[40ch]">{prova.texto}</p>
              <p className="mt-4 text-xs text-muted">
                Fonte: Tesouro Nacional (Siconfi), conferido pelo CidadeIA.{" "}
                <Link href="/panorama" className="underline underline-offset-2 hover:text-foreground">
                  Ver o panorama
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ═══ O QUE ESTÁ EM JOGO ═══ */}
        <section className="border-t border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <h2 className="inicio-h2 max-w-[18ch]">O que está em jogo para você.</h2>
            <p className="text-muted mt-4 max-w-[60ch] leading-relaxed">
              Cada ponto com o artigo que o cria. O RGF é assinado pelo prefeito, pela administração financeira e
              pelo controle interno ({ASSINATURAS_DO_RGF}).
            </p>
            <ol className="mt-10 grid md:grid-cols-2 gap-x-10 gap-y-8">
              {c.riscos.map((r, i) => (
                <li key={r.base} className="flex gap-4 border-t border-border pt-5">
                  <span className="text-sm font-semibold tabular-nums text-muted w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <p className="leading-relaxed">{r.texto}</p>
                    <p className="mt-2 text-xs font-medium" style={{ color: "var(--brand-claro)" }}>
                      {r.base}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══ O QUE O CIDADEIA FAZ ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-16">
            <div>
              <h2 className="inicio-h2 max-w-[14ch]">O que o CidadeIA faz.</h2>
              <p className="text-muted mt-4 leading-relaxed max-w-[42ch]">
                Ele lê o que o município já envia ao Tesouro. Não pede acesso ao sistema contábil e não instala nada.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {modulos.map((m) => (
                  <Link
                    key={m.chave}
                    href={`/modulos/${m.chave}`}
                    className="rounded-full border border-border hover:border-brand px-4 py-2 text-sm font-medium transition"
                  >
                    Módulo {m.nome}
                  </Link>
                ))}
              </div>
            </div>
            <ul className="grid gap-4">
              {c.faz.map((f) => (
                <li key={f} className="flex gap-3 rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
                  <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--brand)" }} />
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══ O BRASIL, NA RÉGUA DA LRF ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
          <BarrasPanorama />
        </section>

        {/* ═══ OBJEÇÕES ═══ */}
        <section className="border-t border-border">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <h2 className="inicio-h2 max-w-[18ch]">O que costumam perguntar.</h2>
            <dl className="mt-10 grid md:grid-cols-3 gap-8">
              {c.objecoes.map((o) => (
                <div key={o.pergunta} className="border-t border-border pt-5">
                  <dt className="font-semibold tracking-[-0.01em]">{o.pergunta}</dt>
                  <dd className="text-muted leading-relaxed mt-2">{o.resposta}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ═══ OS DOIS CAMINHOS ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-20 sm:pb-28">
          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="inicio-h2 max-w-[16ch]">Dois caminhos. Os dois sem compromisso.</h2>
              <p className="text-muted mt-5 leading-relaxed max-w-[44ch]">
                A proposta chega em um dia útil, com valor, termo de referência e minuta de contrato, já com{" "}
                {modulos.map((m) => m.nome).join(" e ")} marcados. Ou deixe o telefone e a equipe liga no horário
                que você escolher.
              </p>
              <Link href={linkProposta} className="inicio-sublinhado inline-block mt-6">
                Montar a proposta agora
              </Link>
              <p className="mt-10 text-sm text-muted">Também na prefeitura:</p>
              <ul className="mt-2 grid gap-1.5">
                {outros.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/para/${o.slug}`} className="inicio-sublinhado text-sm text-muted">
                      {o.rotulo}: {o.chamada.charAt(0).toLowerCase() + o.chamada.slice(1)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div id="atendimento" className="scroll-mt-24">
              <PecaUmaLigacao
                origem={`Página para ${c.rotulo}`}
                cargoInicial={c.cargoLigacao}
                linkWhatsapp={linkWhatsappComercial(`Olá! Sou da área de ${c.rotulo.toLowerCase()} de uma prefeitura e quero conhecer o CidadeIA.`)}
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
