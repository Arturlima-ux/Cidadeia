import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import BarrasPanorama from "@/components/site/BarrasPanorama";
import PecaUmaLigacao from "@/components/site/PecaUmaLigacao";
import { linkWhatsappComercial } from "@/lib/contato-comercial";
import { NOME_DOS_ESTADOS, doEstado, type Estado } from "@/lib/estados";
import { PANORAMA, dataDoPanorama, fracao, numeroBr, passaramDoAlerta, umaEmCada } from "@/lib/panorama";
import { compartilhamento } from "@/lib/seo";
import { registrarEvento } from "@/lib/registrar-evento";

// ── O PANORAMA DE CADA ESTADO ──
//
// Quem procura no Google é o secretário de finanças do Piauí, não "do
// Brasil": "despesa com pessoal prefeituras Piauí". Uma página por estado,
// com os números do próprio estado ao lado dos do país, responde a essa
// busca e serve de pauta para a imprensa local.
//
// Os números saem de dados/panorama-rgf.json, que a vigia semanal regrava
// toda segunda (scripts/vigia/panorama.ts). Cada regravação é um commit no
// main, e cada commit publica o site: a página se atualiza sozinha.
//
// Como no panorama nacional, nenhuma prefeitura é citada pelo nome. O link
// leva à lista do estado no Raio-X, onde cada cidade se vê.

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PANORAMA.porUf).map((uf) => ({ uf: uf.toLowerCase() }));
}

function ufDoParametro(uf: string): Estado | null {
  const sigla = uf.toUpperCase();
  return sigla in PANORAMA.porUf ? (sigla as Estado) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }) {
  const uf = ufDoParametro((await params).uf);
  if (!uf) return { title: "Estado não encontrado" };
  const c = PANORAMA.porUf[uf];
  return compartilhamento({
    titulo: `Despesa com pessoal das prefeituras ${doEstado(uf)}`,
    descricao: `${numeroBr(passaramDoAlerta(c))} das ${numeroBr(c.comNumero)} prefeituras ${doEstado(uf)} com RGF publicado já passaram do sinal de alerta da LRF. Conferência semanal no Tesouro Nacional, ${dataDoPanorama()}.`,
    caminho: `/panorama/${uf.toLowerCase()}`,
  });
}

export default async function PanoramaDoEstadoPage({ params }: { params: Promise<{ uf: string }> }) {
  const uf = ufDoParametro((await params).uf);
  if (!uf) notFound();
  await registrarEvento({ tipo: "visita", caminho: `/panorama/${uf.toLowerCase()}`, uf });

  const c = PANORAMA.porUf[uf];
  const b = PANORAMA.brasil;
  const passaram = passaramDoAlerta(c);
  const fracaoTexto = umaEmCada(passaram, c);
  const propEstado = passaram / Math.max(1, c.comNumero);
  const propBrasil = passaramDoAlerta(b) / Math.max(1, b.comNumero);

  // Posição entre os 26 estados (o DF fica de fora: tem limites de estado).
  const ranking = Object.entries(PANORAMA.porUf)
    .map(([sigla, x]) => ({ sigla, p: passaramDoAlerta(x) / Math.max(1, x.comNumero) }))
    .sort((a, z) => z.p - a.p);
  const posicao = ranking.findIndex((r) => r.sigla === uf) + 1;
  const comparacao =
    Math.abs(propEstado - propBrasil) < 0.01
      ? "praticamente igual à média do país"
      : propEstado > propBrasil
        ? "acima da média do país"
        : "abaixo da média do país";

  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 sm:pt-24 pb-12">
          <Olho>
            <Link href="/panorama" className="hover:underline">
              Panorama
            </Link>{" "}
            · {NOME_DOS_ESTADOS[uf]}
          </Olho>
          <h1 className="titulo-pagina mt-5 max-w-[22ch]">
            {numeroBr(passaram)} prefeituras {doEstado(uf)} já passaram do sinal de alerta da LRF.
          </h1>
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-[64ch]">
            {fracaoTexto ? `É ${fracaoTexto} das que têm o número publicado, ` : ""}
            {fracao(passaram, c)} contra {fracao(passaramDoAlerta(b), b)} no Brasil: {comparacao}. Entre os 26 estados,{" "}
            {NOME_DOS_ESTADOS[uf]} é o {posicao}º com a maior proporção de prefeituras nessa situação. Última
            conferência no Tesouro Nacional: {dataDoPanorama()}.
          </p>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-16">
          <BarrasPanorama contagem={c} onde={doEstado(uf)} comLinks={false} />
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
            <Link href={`/raio-x/${uf.toLowerCase()}`} className="inicio-sublinhado text-sm">
              Ver o Raio-X de cada município {doEstado(uf)}
            </Link>
            <Link href="/panorama" className="inicio-sublinhado text-sm text-muted">
              Comparar com os outros estados
            </Link>
          </div>
        </section>

        <section className="border-t border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16">
            <h2 className="inicio-h2 max-w-[18ch]">O que isso significa para a prefeitura.</h2>
            <ul className="grid gap-5 text-muted leading-relaxed">
              <li>
                <span className="text-foreground font-medium">No alerta (48,6%),</span> o Tribunal de Contas avisa
                formalmente o município (LRF, art. 59, § 1º, II).
              </li>
              <li>
                <span className="text-foreground font-medium">No prudencial (51,3%),</span> ficam proibidos reajuste,
                criação de cargo, nomeação e hora extra, salvo as exceções da lei (LRF, art. 22, parágrafo único).
              </li>
              <li>
                <span className="text-foreground font-medium">Acima do limite (54%),</span> o excesso tem de sair em
                dois quadrimestres, um terço no primeiro; sem isso, o município perde transferências voluntárias e
                crédito (LRF, art. 23).
              </li>
              <li>
                <span className="text-foreground font-medium">RGF atrasado</span> impede transferências voluntárias e
                operações de crédito até regularizar (LRF, art. 55, § 3º, com o art. 51, § 2º).
              </li>
            </ul>
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="inicio-h2 max-w-[16ch]">Saber antes do Tribunal.</h2>
              <p className="text-muted mt-5 leading-relaxed max-w-[44ch]">
                Com o módulo Gestão, o CidadeIA confere o Tesouro todo dia e avisa o prefeito antes do prazo, antes do
                limite e antes do apontamento.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link
                  href="/proposta?modulos=gestao"
                  className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5"
                >
                  Receber a proposta
                </Link>
                <Link href={`/raio-x/${uf.toLowerCase()}`} className="inicio-sublinhado text-muted">
                  Ver a minha cidade
                </Link>
              </div>
            </div>
            <div id="atendimento" className="scroll-mt-24">
              <PecaUmaLigacao
                origem={`Panorama ${uf}`}
                linkWhatsapp={linkWhatsappComercial(`Olá! Vi o panorama ${doEstado(uf)} no CidadeIA e queria conversar sobre a minha prefeitura.`)}
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
