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
import VideoExplicativo from "@/components/site/VideoExplicativo";
import VitrinePortal from "@/components/site/VitrinePortal";
import BarraConversao from "@/components/site/BarraConversao";
import SeletorMunicipio from "@/components/site/SeletorMunicipio";
import EsqueletoFato from "@/components/site/EsqueletoFato";
import PedirProjecao from "@/components/site/PedirProjecao";
import ReguaLrf from "@/components/site/inicio/ReguaLrf";
import IndiceModulos from "@/components/site/inicio/IndiceModulos";
import MapaVivo from "@/components/site/inicio/MapaVivo";
import ComoFunciona from "@/components/site/inicio/ComoFunciona";
import { indiceNoMapa } from "@/lib/mapa-municipios-codigos";
import CarregaPessoal from "./_heroi/CarregaPessoal";
import CarregaRreo from "./_heroi/CarregaRreo";
import CarregaRegua from "./_heroi/CarregaRegua";
import { municipioDoParametro, municipioParaDados } from "@/lib/fatos-do-municipio";
import { AVISO_DF_COM_PESSOAL, ehDistritoFederal } from "@/lib/regioes-df";
import { ESTADOS } from "@/lib/estados";

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
  // O portal da transparência que o módulo Essencial põe no ar, dito como o
  // cidadão vê: sem sigla e sem nome técnico. Cada linha é uma parte que
  // existe de verdade em /transparencia/[slug].
  return [
    ...(temPortalNoAr
      ? [
          {
            titulo: "O portal já está no ar",
            texto: "Já tem cidade usando. Abra e veja funcionando, sem cadastro.",
          },
        ]
      : []),
    {
      titulo: "Para onde vai o dinheiro",
      texto: "Quanto a prefeitura recebeu e quanto gastou, com os números que ela já manda ao governo federal.",
    },
    {
      titulo: "Obras e compras à vista",
      texto: "Cada obra com o andamento, e cada licitação aberta para qualquer pessoa conferir.",
    },
    {
      titulo: "Pedido com número de protocolo",
      texto: "O morador pede um serviço, reclama, sugere ou denuncia (até sem se identificar) e acompanha a resposta pelo número.",
    },
    {
      titulo: "No celular, sem cadastro",
      texto: "Qualquer pessoa abre e entende. E a prefeitura mostra, na prática, que não tem nada a esconder.",
    },
  ];
}

// Bases que o produto de fato lê, cada uma com o arquivo que a consome em
// lib/: fatos-do-municipio (Tesouro), populacao-ibge, pncp, cnes, censo-escolar.
const FONTES = ["Tesouro Nacional", "IBGE", "PNCP", "DataSUS", "INEP"];


export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; uf?: string; para?: string }>;
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
  // Quem está olhando: a prefeitura (padrão, o funil de venda) ou o morador
  // (a porta do portal do cidadão). A chave fica no topo, ao lado da busca.
  const morador = parametros.para === "morador";
  const comPara = (para: "prefeitura" | "morador") => {
    const q = new URLSearchParams();
    if (ufEscolhida) q.set("uf", ufEscolhida);
    if (municipio) q.set("m", municipio.codigo);
    if (para === "morador") q.set("para", "morador");
    const s = q.toString();
    return s ? `/?${s}` : "/";
  };
  // Região administrativa do DF: o nome escolhido fica na tela, e os números
  // são os do Distrito Federal inteiro, que é quem reporta ao Tesouro.
  const dados = municipio ? municipioParaDados(municipio) : null;
  const df = ehDistritoFederal(municipio?.uf);
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
    <div className="tema-noite pagina-inicial min-h-screen overflow-x-clip relative">
      <SiteHeader sessaoAtiva={Boolean(sessao) && !sessao?.demo} />

      <main id="conteudo">
        <BarraConversao />

        {/* ═══ HERÓI ═══ */}
        <section className="relative">
          {/* O Brasil, um ponto por município. Fica à direita no desktop, atrás
              do título no celular, e some nas bordas para não brigar com o
              texto. Ver MapaVivo.tsx. */}
          <div className="inicio-mapa absolute pointer-events-none" aria-hidden>
            <MapaVivo destaque={dados ? indiceNoMapa(dados.codigo) : null} className="w-full h-full" />
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
                  {/* ── A CHAVE DOS DOIS PÚBLICOS ──
                      Mesma busca, dois destinos: a prefeitura vê o Raio-X
                      aqui mesmo; o morador vai ao portal da cidade dele.
                      É link (?para=morador), funciona sem JavaScript. */}
                  <div role="tablist" aria-label="Quem está procurando" className="inline-flex rounded-full border border-border p-1 mb-5" style={{ background: "var(--card)" }}>
                    {(["prefeitura", "morador"] as const).map((para) => {
                      const ativo = (para === "morador") === morador;
                      return (
                        <Link
                          key={para}
                          href={comPara(para)}
                          scroll={false}
                          role="tab"
                          aria-selected={ativo}
                          className="rounded-full px-4 py-2 text-sm font-medium transition"
                          style={
                            ativo
                              ? { background: para === "morador" ? "color-mix(in oklab, var(--info) 18%, transparent)" : "var(--brand-tint)", color: para === "morador" ? "var(--info)" : "var(--brand-claro)" }
                              : { color: "var(--muted)" }
                          }
                        >
                          {para === "prefeitura" ? "Sou da prefeitura" : "Sou morador"}
                        </Link>
                      );
                    })}
                  </div>
                  {morador ? (
                    <>
                      <p className="text-sm font-medium mb-3">Encontre o portal da sua cidade</p>
                      <SeletorMunicipio uf={ufEscolhida} inicial={municipio} acao="/transparencia" rotuloBotao="Procurar portal" contorno />
                      <p className="text-xs text-muted mt-4">
                        Para onde vai o dinheiro, as obras e um canal com a prefeitura. Sem cadastro.{" "}
                        <Link href="/transparencia/exemplo" className="inicio-sublinhado">
                          Ver uma cidade de exemplo
                        </Link>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-3">Veja o Raio-X do seu município</p>
                      <SeletorMunicipio uf={ufEscolhida} inicial={municipio} />
                      <p className="text-xs text-muted mt-4">
                        Sem cadastro. Dado público do Tesouro Nacional, exercício de{" "}
                        {LIMITE_DISPENSA.ano}.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="inicio-aparece" style={{ "--d": "560ms" } as React.CSSProperties}>
                {/* Com município escolhido, a régua corre o número dele. */}
                {municipio && df ? (
                  <ReguaLrf dado={{ modo: "exemplo", aviso: "O DF segue limites da LRF de unidade da federação. Acima, um município de exemplo." }} />
                ) : municipio ? (
                  <Suspense
                    key={municipio.codigo}
                    fallback={<ReguaLrf dado={{ modo: "carregando", municipio: municipio.nome }} />}
                  >
                    <CarregaRegua codigoIbge={dados!.codigo} municipio={municipio.nome} />
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

                {df ? (
                  // O DF presta contas como unidade da federação. A despesa com
                  // pessoal do Governo do Distrito Federal é lida no RGF dele
                  // (código 53, lib/siconfi-tipos.ts); o resto do Raio-X
                  // municipal não se aplica.
                  <>
                    <div className="grid md:grid-cols-3 gap-4 mt-3">
                      <Suspense fallback={<EsqueletoFato titulo="Despesa com pessoal" />}>
                        <CarregaPessoal codigoIbge={dados!.codigo} />
                      </Suspense>
                    </div>
                    <p
                      className="mt-4 max-w-[72ch] rounded-2xl border px-5 py-4 text-sm leading-relaxed"
                      style={{ borderColor: "var(--info-borda)", background: "var(--info-tint)" }}
                    >
                      {AVISO_DF_COM_PESSOAL}
                    </p>
                  </>
                ) : (
                  <>
                <div className="grid md:grid-cols-3 gap-4 mt-3">
                  <Suspense fallback={<EsqueletoFato titulo="Despesa com pessoal" />}>
                    <CarregaPessoal codigoIbge={dados!.codigo} />
                  </Suspense>
                  <Suspense
                    fallback={
                      <>
                        <EsqueletoFato titulo="Aplicação em saúde e educação" />
                        <EsqueletoFato titulo="Relatórios obrigatórios" />
                      </>
                    }
                  >
                    <CarregaRreo municipio={dados!.nome} uf={dados!.uf} />
                  </Suspense>
                </div>

                {/* A trava: o que está acima é dado público e fica aberto;
                    a projeção é trabalho do software. */}
                <div className="mt-4 max-w-2xl">
                  <PedirProjecao codigoIbge={dados!.codigo} municipio={dados!.nome} />
                </div>

                  </>
                )}

                <p className="text-xs text-muted mt-5 leading-relaxed max-w-[64ch]">
                  O CidadeIA não substitui o parecer da contabilidade interna nem a assessoria
                  jurídica do município. Ele aponta o desvio antes que vire apontamento formal.
                </p>
              </div>
            )}
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
            Rolagem narrada no desktop, três blocos no celular. Ver
            ComoFunciona.tsx. */}
        <ComoFunciona />

        {/* ═══ O PORTAL DA TRANSPARÊNCIA ═══
            O que o cidadão recebe com o módulo Essencial, mostrado vivo: a
            janela com a cidade de exemplo (VitrinePortal.tsx), e embaixo as
            quatro coisas que o morador encontra. */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36">
          <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:gap-16 items-end mb-10">
            <h2 className="inicio-h2 max-w-[17ch]">O portal da transparência da sua cidade.</h2>
            <div>
              <p className="text-muted leading-relaxed max-w-[42ch]">
                Um site da prefeitura para o morador: ele vê as contas e as obras e
                fala com a prefeitura, em linguagem simples. Vem pronto no módulo
                Essencial.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-6">
                {portais.length > 0 ? (
                  <>
                    {portais.slice(0, 3).map((p) => (
                      <Link
                        key={p.slug}
                        href={`/transparencia/${p.slug}`}
                        className="inline-flex items-center gap-2.5 border border-border hover:border-brand font-medium text-sm rounded-full px-5 py-2.5 transition"
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 portal-pulso" style={{ background: "var(--info)" }} />
                        {p.municipio}, {p.estado}
                      </Link>
                    ))}
                    <Link href="/transparencia/exemplo" className="inicio-sublinhado text-sm text-muted">
                      Ver a cidade de exemplo
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/transparencia/exemplo"
                      className="inline-flex items-center border border-border hover:border-brand font-medium text-sm rounded-full px-5 py-2.5 transition"
                    >
                      Ver como é o portal
                    </Link>
                    <Link href="/raio-x" className="inicio-sublinhado text-sm text-muted">
                      Ver o Raio-X do seu município
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <VitrinePortal />

          <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 mt-10">
            {autoridadeVerificavel(Boolean(portalVitrine)).filter((a) => a.titulo !== "O portal já está no ar").map((a) => (
              <li key={a.titulo} className="border-t border-border pt-5">
                <p className="font-semibold tracking-[-0.01em]">{a.titulo}</p>
                <p className="text-sm text-muted leading-relaxed mt-1.5">{a.texto}</p>
              </li>
            ))}
          </ul>

        </section>

        {/* ═══ O VÍDEO ═══
            Trinta segundos, entre a prova e o pedido: o último empurrão, e o
            que o secretário manda para o prefeito. Ver VideoExplicativo.tsx. */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36">
          <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
            <h2 className="inicio-h2 max-w-[18ch]">O CidadeIA em 30 segundos.</h2>
            <p className="text-muted leading-relaxed max-w-[40ch]">
              Para assistir agora, ou mandar para quem decide.
            </p>
          </div>
          <VideoExplicativo
            src="/video/cidadeia-explicativo.mp4"
            srcWebm="/video/cidadeia-explicativo.webm"
            capa="/video/cidadeia-explicativo.jpg"
            titulo="O CidadeIA em 30 segundos: o aviso antes do limite da LRF, os seis módulos e a proposta em um dia útil."
          />
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
      </main>

      <SiteFooter />
    </div>
  );
}
