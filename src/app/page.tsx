import Link from "next/link";
import { Suspense } from "react";
import { registrarEvento } from "@/lib/registrar-evento";
import { lerSessao } from "@/lib/sessao";
import { LIMITE_DISPENSA } from "@/lib/contratacao";
import { listarPortaisPublicados } from "@/lib/portais";
import { formatarMoedaExata } from "@/lib/formatadores";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MontadorProposta from "@/components/site/MontadorProposta";
import BarraConversao from "@/components/site/BarraConversao";
import PainelDemonstracao from "@/components/site/PainelDemonstracao";
import SeletorMunicipio from "@/components/site/SeletorMunicipio";
import EsqueletoFato from "@/components/site/EsqueletoFato";
import PedirProjecao from "@/components/site/PedirProjecao";
import ReguaLrf from "@/components/site/inicio/ReguaLrf";
import IndiceModulos from "@/components/site/inicio/IndiceModulos";
import MapaVivo from "@/components/site/inicio/MapaVivo";
import { indiceNoMapa } from "@/lib/mapa-municipios-codigos";
import CarregaPessoal from "./_heroi/CarregaPessoal";
import CarregaRreo from "./_heroi/CarregaRreo";
import CarregaRegua from "./_heroi/CarregaRegua";
import { municipioDoParametro } from "@/lib/fatos-do-municipio";
import { ESTADOS } from "@/lib/estados";
import { Inclinavel } from "@/components/site/Ponteiro";

// ── A PÁGINA EM SEIS PARTES ──
//
// Herói (o que é, para quem, e a régua da LRF) → de onde vem o dado → os seis
// módulos → como funciona → o que dá para conferir → proposta e fecho.
//
// O redesenho de outubro cortou o texto pela metade. Saíram "Como a decisão
// acontece", "Um módulo por dentro" e "Como sai do papel": as três seguem
// inteiras em /solucoes, /modulos e /como-contratar, e a home aponta para lá.
// Saiu também a entrada animada de cada seção. Sobra um único momento de
// movimento, no topo.

// ── O QUE O VISITANTE CONSEGUE CONFERIR ──
//
// Cada linha aponta para algo que o visitante abre sozinho. É função, e não
// lista fixa, porque a primeira afirmação só pode aparecer quando houver
// portal publicado de verdade (tests/promessas-da-home.test.ts).
function autoridadeVerificavel(temPortalNoAr: boolean) {
  return [
    temPortalNoAr
      ? {
          titulo: "O portal já está no ar",
          texto: "Endereço público de um município real, aberto sem cadastro.",
        }
      : {
          titulo: "Teste com o seu município",
          texto: "O Raio-X lê o dado que a União publica sobre qualquer prefeitura e responde na hora.",
        },
    {
      titulo: "O contrato é público antes da venda",
      texto: "Termo de referência, minuta e acordo de dados baixam sem cadastro.",
    },
    {
      titulo: "A saída está escrita",
      texto: "Exportação em CSV e JSON quando quiser, sem custo e sem pedir licença.",
    },
    {
      titulo: "O diagnóstico diz o que não fazemos",
      texto: "O que continua com a prefeitura aparece no resultado, com o artigo da lei.",
    },
  ];
}

// Bases que o produto de fato lê, cada uma com o arquivo que a consome em
// lib/: fatos-do-municipio (Tesouro), populacao-ibge, pncp, cnes, censo-escolar.
const FONTES = ["Tesouro Nacional", "IBGE", "PNCP", "DataSUS", "INEP"];

const PASSOS = [
  {
    titulo: "Escolha o município",
    texto: "O que já é público entra sozinho. Não há nada para instalar na prefeitura.",
  },
  {
    titulo: "O sistema confere",
    texto: "Cada desvio aparece com o número, o prazo e o artigo de lei que ele fere.",
  },
  {
    titulo: "Quem decide é avisado",
    texto: "O aviso chega antes do relatório oficial, com o que fazer e a quem pedir.",
  },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; uf?: string }>;
}) {
  // Resolvido contra a lista local antes de qualquer rede: lixo na barra de
  // endereço vira a home inicial, não uma chamada à API do Tesouro.
  const parametros = await searchParams;
  const pedido = municipioDoParametro(parametros.m);
  const ufEscolhida =
    typeof parametros.uf === "string" && (ESTADOS as readonly string[]).includes(parametros.uf)
      ? parametros.uf
      : null;
  // Município de outra UF é resto de uma troca de estado, não uma escolha.
  const municipio = pedido && ufEscolhida && pedido.uf !== ufEscolhida ? null : pedido;
  await registrarEvento({ tipo: "visita", caminho: "/" });

  // A sessão é lida aqui e passada ao cabeçalho: ler cookie dentro dele
  // tiraria do cache todas as outras páginas que o usam. Quem tem sessão vê
  // "Ir para o painel"; a de demonstração não conta como cliente
  // (tests/sessao-demo-nao-e-cliente.test.ts).
  const sessao = await lerSessao();

  // Prova verificável no lugar de muro de logos: portais que qualquer um
  // abre agora. Sem portal, a página convida ao Raio-X.
  const { portais } = await listarPortaisPublicados();
  const portalVitrine = portais[0] ?? null;

  return (
    <div className="tema-noite pagina-inicial min-h-screen overflow-x-hidden relative">
      <SiteHeader sessaoAtiva={Boolean(sessao) && !sessao?.demo} />

      <main id="conteudo">
        <BarraConversao />

        {/* ═══ HERÓI ═══ */}
        <section className="relative">
          {/* O Brasil, um ponto por município. Fica à direita no desktop, atrás
              do título no celular, e some nas bordas para não brigar com o
              texto. Ver MapaVivo.tsx. */}
          <div className="inicio-mapa absolute pointer-events-none" aria-hidden>
            <MapaVivo destaque={municipio ? indiceNoMapa(municipio.codigo) : null} className="w-full h-full" />
          </div>

          <div className="relative max-w-[1200px] mx-auto px-4 sm:px-8 pt-16 sm:pt-28 pb-16 sm:pb-24">
            <h1 className="inicio-titulo max-w-[13ch]">
              <span className="linha"><span style={{ "--i": 0 } as React.CSSProperties}>Saiba o que o</span></span>
              <span className="linha"><span style={{ "--i": 1 } as React.CSSProperties}>Tribunal de Contas</span></span>
              <span className="linha"><span style={{ "--i": 2 } as React.CSSProperties}>vai apontar</span></span>
              <span className="linha"><span style={{ "--i": 3 } as React.CSSProperties}>antes dele.</span></span>
            </h1>

            <div className="mt-12 sm:mt-16 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 lg:gap-16 items-start">
              <div className="inicio-aparece" style={{ "--d": "420ms" } as React.CSSProperties}>
                <p className="inicio-lead text-muted max-w-[40ch]">
                  <span className="text-foreground">Software de conformidade para prefeituras.</span>{" "}
                  Ele lê o que o município já envia ao Tesouro e avisa antes de
                  um limite da lei estourar.
                </p>

                <div className="mt-9">
                  <p className="text-sm font-medium mb-3">Veja o Raio-X do seu município</p>
                  <SeletorMunicipio uf={ufEscolhida} inicial={municipio} />
                  <p className="text-xs text-muted mt-4">
                    Sem cadastro. Dado público do Tesouro Nacional, exercício de{" "}
                    {LIMITE_DISPENSA.ano}.
                  </p>
                </div>
              </div>

              <div className="inicio-aparece" style={{ "--d": "560ms" } as React.CSSProperties}>
                {/* Com município escolhido, a régua corre o número dele. */}
                {municipio ? (
                  <Suspense
                    key={municipio.codigo}
                    fallback={<ReguaLrf dado={{ modo: "carregando", municipio: municipio.nome }} />}
                  >
                    <CarregaRegua codigoIbge={municipio.codigo} municipio={municipio.nome} />
                  </Suspense>
                ) : (
                  <ReguaLrf />
                )}
              </div>
            </div>

            {municipio && (
              <div className="mt-16">
                <p className="text-sm font-medium text-muted">
                  {municipio.nome}, {municipio.uf}
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-3">
                  <Suspense fallback={<EsqueletoFato titulo="Despesa com pessoal" />}>
                    <CarregaPessoal codigoIbge={municipio.codigo} />
                  </Suspense>
                  <Suspense
                    fallback={
                      <>
                        <EsqueletoFato titulo="Aplicação em saúde e educação" />
                        <EsqueletoFato titulo="Relatórios obrigatórios" />
                      </>
                    }
                  >
                    <CarregaRreo municipio={municipio.nome} uf={municipio.uf} />
                  </Suspense>
                </div>

                {/* A trava: o que está acima é dado público e fica aberto;
                    a projeção é trabalho do software. */}
                <div className="mt-4 max-w-2xl">
                  <PedirProjecao codigoIbge={municipio.codigo} municipio={municipio.nome} />
                </div>

                <p className="text-xs text-muted mt-5 leading-relaxed max-w-[64ch]">
                  O CidadeIA não substitui o parecer da contabilidade interna nem a assessoria
                  jurídica do município. Ele aponta o desvio antes que vire apontamento formal.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ═══ O PRODUTO ═══
            O painel dentro de um aparelho, largo. É HTML de verdade, com os
            números do exemplo, e não uma imagem de marketing. */}
        <section className="relative max-w-[1200px] mx-auto px-4 sm:px-8">
          <div className="palco-produto">
            <Inclinavel intensidade={2} className="inclinavel-amplo">
              <div className="moldura-dispositivo">
                <PainelDemonstracao />
              </div>
            </Inclinavel>
          </div>
        </section>

        {/* ═══ DE ONDE VEM O DADO ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-20 sm:pt-28">
          <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-12 border-t border-border pt-8">
            <p className="text-sm text-muted shrink-0">Lê direto das bases oficiais</p>
            <ul className="flex flex-wrap gap-x-10 gap-y-3">
              {FONTES.map((f) => (
                <li key={f} className="text-lg sm:text-xl font-medium tracking-[-0.02em] text-foreground/80">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══ MÓDULOS ═══ */}
        <section id="solucoes" className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36 scroll-mt-24">
          <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:gap-16 items-end mb-12">
            <h2 className="inicio-h2 max-w-[16ch]">
              Seis áreas. Você contrata só as que usa.
            </h2>
            <p className="text-muted leading-relaxed max-w-[42ch]">
              Cada módulo funciona sozinho. Sem pacote fechado e sem cobrança por usuário.
            </p>
          </div>
          <IndiceModulos />
          <Link href="/solucoes" className="inicio-sublinhado inline-block mt-8 text-sm text-muted">
            Ver cada módulo em detalhe
          </Link>
        </section>

        {/* ═══ COMO FUNCIONA ═══
            Aqui a numeração é informação: são três passos em ordem. */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36">
          <h2 className="inicio-h2 max-w-[18ch]">Do dado público à decisão.</h2>
          <ol className="mt-14 grid md:grid-cols-3 gap-10 md:gap-8">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="border-t border-border pt-6">
                <span className="block text-5xl font-light tabular-nums tracking-[-0.05em] text-brand-claro">
                  {i + 1}
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-[-0.02em]">{p.titulo}</h3>
                <p className="mt-2 text-muted leading-relaxed max-w-[34ch]">{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ═══ O QUE DÁ PARA CONFERIR ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36">
          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 lg:gap-16">
            <div>
              <h2 className="inicio-h2">Não peça fé. Confira.</h2>
              <p className="text-muted leading-relaxed mt-6 max-w-[40ch]">
                O CidadeIA é novo e ainda não temos cem prefeituras para mostrar.
                Por isso, tudo ao lado você confere sem falar com ninguém.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-8">
                {portais.length > 0 ? (
                  <>
                    {portais.slice(0, 3).map((p) => (
                      <Link
                        key={p.slug}
                        href={`/transparencia/${p.slug}`}
                        className="inline-flex items-center gap-2.5 border border-border hover:border-brand font-medium text-sm rounded-full px-5 py-2.5 transition"
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--info)" }} />
                        {p.municipio}, {p.estado}
                      </Link>
                    ))}
                    <Link href="/transparencia" className="inicio-sublinhado text-sm text-muted">
                      {portais.length > 3 ? "Ver todos os portais" : "Abrir um portal"}
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/raio-x"
                    className="inline-flex items-center border border-border hover:border-brand font-medium text-sm rounded-full px-5 py-2.5 transition"
                  >
                    Ver o Raio-X do seu município
                  </Link>
                )}
              </div>
            </div>

            <ul className="border-t border-border">
              {autoridadeVerificavel(Boolean(portalVitrine)).map((a) => (
                <li
                  key={a.titulo}
                  className="grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-8 gap-y-1 py-6 border-b border-border"
                >
                  <p className="font-semibold tracking-[-0.01em]">{a.titulo}</p>
                  <p className="text-muted leading-relaxed">{a.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══ PROPOSTA ═══ */}
        <section id="proposta" className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36 scroll-mt-24">
          <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-10 lg:gap-16 items-end mb-12">
            <div>
              <h2 className="inicio-h2 max-w-[16ch]">Proposta pronta em um dia útil.</h2>
              <p className="text-muted leading-relaxed mt-6 max-w-[46ch]">
                Escolha o município e os módulos. Valor, termo de referência e
                minuta de contrato chegam no mesmo e-mail, sem reunião antes.
              </p>
            </div>
            <div className="lg:border-l border-border lg:pl-10">
              <p className="text-sm text-muted">Cabe na dispensa de licitação até</p>
              <p className="mt-2 text-4xl sm:text-5xl font-semibold tabular-nums tracking-[-0.045em]">
                {formatarMoedaExata(LIMITE_DISPENSA.valor)}
              </p>
              <p className="mt-3 text-sm text-muted leading-relaxed max-w-[36ch]">
                por ano, em contratação direta. {LIMITE_DISPENSA.base}, valor do{" "}
                {LIMITE_DISPENSA.atualizadoPor}.
              </p>
            </div>
          </div>
          <MontadorProposta />
        </section>

        {/* ═══ FECHO ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-28 sm:py-40">
          <h2 className="inicio-titulo max-w-[15ch]" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}>
            Leve o processo pronto para a próxima reunião.
          </h2>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/proposta"
              className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-8 py-4"
            >
              Receber proposta e kit
            </Link>
            <Link href="/kit" className="inicio-sublinhado text-muted">
              Baixar só o kit de contratação
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted">Sem compromisso. O kit baixa sem cadastro.</p>
        </section>

        {/* ═══ A PORTA DO CIDADÃO ═══
            Quem compra precisa saber que o outro lado existe; o morador tem a
            página dele em /transparencia e não precisa atravessar esta. */}
        <section className="border-t border-border">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 flex flex-wrap items-center justify-between gap-x-10 gap-y-3">
            <p className="text-sm text-muted max-w-[62ch]">
              <span className="text-foreground font-medium">É morador?</span> Veja para onde
              vai o dinheiro, acompanhe um pedido ou faça uma denúncia sem se identificar.
            </p>
            <Link href="/transparencia" className="inicio-sublinhado text-sm text-muted shrink-0">
              Portal do cidadão
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
