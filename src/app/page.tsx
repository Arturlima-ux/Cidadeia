import type { Metadata } from "next";
import Link from "next/link";
import { compartilhamento, DESCRICAO_PADRAO, JsonLdScript, ldSite, TITULO_DO_SITE } from "@/lib/seo";
import { FONTES_OFICIAIS } from "@/lib/fontes-oficiais";
import { Suspense } from "react";
import { registrarEvento } from "@/lib/registrar-evento";
import type { PedidoDaHome } from "@/lib/home-montada";
import { AVISO_FRACIONAMENTO, LIMITE_DISPENSA } from "@/lib/contratacao";
import { listarPortaisPublicados } from "@/lib/portais";
import { formatarMoedaExata } from "@/lib/formatadores";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MontadorProposta from "@/components/site/MontadorProposta";
import VitrinePortal from "@/components/site/VitrinePortal";
import BarraConversao from "@/components/site/BarraConversao";
import AcheSuaCidade from "@/components/morador/AcheSuaCidade";
import EsqueletoFato from "@/components/site/EsqueletoFato";
import PedirProjecao from "@/components/site/PedirProjecao";
import AvisoDaCidade from "@/components/site/AvisoDaCidade";
import ReguaLrf from "@/components/site/inicio/ReguaLrf";
import MesaDeModulos from "@/components/site/inicio/MesaDeModulos";
import { modulosNaOrdemDaHome } from "@/lib/modulos-detalhe";
import MapaVivoAdiado from "@/components/site/inicio/MapaVivoAdiado";
import HidratarAoChegar from "@/components/site/inicio/HidratarAoChegar";
import ComoFunciona from "@/components/site/inicio/ComoFunciona";
import ContarVisita from "@/components/site/inicio/ContarVisita";
import RevelarNoMouse from "@/components/site/inicio/RevelarNoMouse";
import Inclinar from "@/components/site/inicio/Inclinar";
import VideoExplicativo from "@/components/site/VideoExplicativo";
import { CARGOS } from "@/lib/cargos";
import HomeMorador from "./_morador/HomeMorador";
import { indiceNoMapa } from "@/lib/mapa-municipios-codigos";
import CarregaPessoal from "./_heroi/CarregaPessoal";
import CarregaRreo from "./_heroi/CarregaRreo";
import CarregaRegua from "./_heroi/CarregaRegua";
import { municipioDoParametro, municipioParaDados } from "@/lib/fatos-do-municipio";
import { AVISO_DF_COM_PESSOAL, ehDistritoFederal } from "@/lib/regioes-df";
import { ESTADOS } from "@/lib/estados";
import { PANORAMA, dataDoPanorama, faixasDoPanorama, numeroBr, passaramDoAlerta, umaEmCada } from "@/lib/panorama";
import { LINK_DA_FONTE } from "@/lib/links-oficiais";

// ── A PÁGINA EM SEIS PARTES ──
//
// Herói (a gestão municipal inteira, num lugar só) → de onde vem o dado → os
// seis módulos → como funciona → o portal do cidadão → as contas do país
// conferidas e as portas por cargo → vídeo → proposta e fecho.
//
// Até outubro de 2026 a página abria pela régua da LRF ("saiba o que o
// Tribunal vai apontar"), e o site inteiro parecia um sistema de alerta
// fiscal. O produto é a gestão inteira; a conformidade é uma parte dela.
//
// O redesenho de outubro cortou o texto pela metade. Saíram "Como a decisão
// acontece", "Um módulo por dentro" e "Como sai do papel": as três seguem
// inteiras em /solucoes, /modulos e /como-contratar, e a home aponta para lá.
// Saiu também a entrada animada de cada seção. Sobra um único momento de
// movimento, no topo.

// Bases que o produto de fato lê, cada uma com o arquivo que a consome em
// lib/: fatos-do-municipio (Tesouro), populacao-ibge, pncp, cnes, censo-escolar.
const FONTES = FONTES_OFICIAIS;


// ── A CANÔNICA DA HOME ──
// O seletor de cidade leva a /?m=<código IBGE>: são 5.570 endereços com o
// mesmo título e a mesma descrição. Sem canônica, cada um concorria com a
// home quando compartilhado ou rastreado. Todos apontam para "/".
export const metadata: Metadata = {
  ...compartilhamento({
    titulo: TITULO_DO_SITE,
    descricao: DESCRICAO_PADRAO,
    caminho: "/",
  }),
  title: { absolute: TITULO_DO_SITE },
};

// ── ESTÁTICA, COM UMA PORTA PARA A VERSÃO MONTADA ──
// A home sai pronta do cache e é refeita no máximo uma vez por hora (a lista
// de portais no ar é a única coisa dela que vem do banco). Antes, cada
// visita esperava sessão, banco e registro de evento antes do primeiro byte.
// Quem traz município (?m=), estado (?uf=), ?para= ou sessão é levado pelo
// proxy.ts a app/inicio, que monta esta mesma página com o pedido em mãos
// (lib/home-montada.ts). Sem `pedido`, nada aqui lê cabeçalho, cookie ou
// parâmetro: é isso que mantém a página estática.
export const revalidate = 3600;

export default async function LandingPage({ pedido }: { pedido?: PedidoDaHome }) {
  // Resolvido contra a lista local antes de qualquer rede: lixo na barra de
  // endereço vira a home inicial, não uma chamada à API do Tesouro.
  const parametros: Partial<PedidoDaHome> = pedido ?? {};
  const pedidoM = municipioDoParametro(parametros.m);
  const ufEscolhida =
    typeof parametros.uf === "string" && (ESTADOS as readonly string[]).includes(parametros.uf)
      ? parametros.uf
      : null;
  // Município de outra UF é resto de uma troca de estado, não uma escolha.
  const municipio = pedidoM && ufEscolhida && pedidoM.uf !== ufEscolhida ? null : pedidoM;
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
  // A visita: na versão montada, registrada aqui; na estática, pelo aviso
  // do navegador (ContarVisita, app/api/visita).
  if (pedido) {
    await registrarEvento({ tipo: "visita", caminho: "/" });
    // O Raio-X aberto aqui no topo conta como o da página própria: é o sinal
    // de interesse por cidade que a equipe vê em /admin/interessados.
    if (municipio && !df && !morador) {
      await registrarEvento({ tipo: "raio_x", caminho: "/", uf: municipio.uf, codigoIbge: municipio.codigo, municipio: municipio.nome });
    }
  }

  // A sessão é lida em app/inicio e chega pronta: ler cookie aqui tiraria a
  // home do cache. Quem tem sessão vê "Ir para o painel"; a de demonstração
  // não conta como cliente (tests/sessao-demo-nao-e-cliente.test.ts).
  const sessaoAtiva = pedido?.sessaoAtiva ?? false;

  // Prova verificável no lugar de muro de logos: portais que qualquer um
  // abre agora. Sem portal, a página mostra a cidade de exemplo.
  const { portais } = await listarPortaisPublicados();

  // ── O MORADOR VÊ OUTRO SITE ──
  // Outra cor (tema-morador), outro cabeçalho e outra página inteira: a
  // cidade dele explicada em linguagem simples. Ver _morador/HomeMorador.tsx.
  if (morador) {
    return (
      <div className="tema-noite tema-morador min-h-screen overflow-x-clip relative" style={{ background: "var(--background)" }}>
        <SiteHeader sessaoAtiva={sessaoAtiva} modo="morador" />
        <main id="conteudo">
          <HomeMorador municipio={municipio} dados={dados} portais={portais} linkPrefeitura={comPara("prefeitura")} />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="tema-noite pagina-inicial fundo-liso min-h-screen overflow-x-clip relative">
      {/* O brilho líquido do topo, atrás de tudo (globals.css, .fundo-liquido). */}
      <div className="fundo-liquido" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <JsonLdScript dados={ldSite()} />
      <SiteHeader sessaoAtiva={sessaoAtiva} />
      {!pedido && <ContarVisita />}

      <main id="conteudo">
        <BarraConversao />

        {/* ═══ HERÓI ═══ */}
        {/* ── SEM SUSPENSE EM VOLTA DO TOPO ──
            Cabeçalho, topo e bases oficiais chegaram a ir dentro de limites
            de Suspense, para o React ligá-los em fatias. Medido com o
            Lighthouse: o servidor às vezes mandava o cabeçalho depois do
            resto, e a página descia 71 px quando ele aparecia (CLS de 0,086).
            O que está na primeira tela vem inteiro, na ordem; só o que está
            abaixo dela é adiado (HidratarAoChegar). */}
        <section className="relative">
          {/* A grade de pontos atrás do topo, que o mouse acende em volta
              dele (RevelarNoMouse.tsx). */}
          <RevelarNoMouse />
          {/* O Brasil, um ponto por município. Fica à direita no desktop, atrás
              do título no celular, e some nas bordas para não brigar com o
              texto. Ver MapaVivo.tsx. */}
          <div className="inicio-mapa absolute pointer-events-none" aria-hidden>
            <MapaVivoAdiado destaque={dados ? indiceNoMapa(dados.codigo) : null} className="w-full h-full" />
            {/* A legenda amarra o mapa ao que a página faz: cada ponto é uma
                prefeitura que o CidadeIA lê. Só no computador e só sem cidade
                escolhida: com cidade, o quadro da régua ocupa este canto e o
                ponto dela acende no mapa. */}
            {!municipio && (
              <p className="hidden lg:flex items-center gap-2 absolute right-6 bottom-4 text-xs text-muted">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--muted)" }} />
                Um ponto para cada município do Brasil.
              </p>
            )}
          </div>

          <div className="relative max-w-[1200px] mx-auto px-4 sm:px-8 pt-16 sm:pt-28 lg:pt-20 pb-6 sm:pb-10">
            {/* Duas linhas a partir de 1024px ("…inteira," / "num lugar só."),
                três no celular. Em duas, o título baixa e a busca cabe inteira
                num notebook de 1366×768 (avaliação Impeccable, outubro de 2026).
                O aria-label dá o texto com espaços ao leitor de tela, que lia
                as linhas coladas ("municipalinteira,"). */}
            {/* Cada palavra existe uma vez só. Antes "inteira," estava escrita
                duas vezes (uma para o celular, outra para o computador), e o
                Google e o leitor de tela liam "inteira, inteira,". Agora, a
                partir de 1024px, as duas primeiras linhas viram inline-block e
                se juntam numa só (globals.css, .linha-junta). */}
            <h1 className="inicio-titulo max-w-[14ch] lg:max-w-none">
              <span className="linha linha-junta"><span style={{ "--i": 0 } as React.CSSProperties}>A gestão municipal</span></span>{" "}
              <span className="linha linha-junta"><span style={{ "--i": 1 } as React.CSSProperties}>inteira,</span></span>{" "}
              <span className="linha"><span style={{ "--i": 2 } as React.CSSProperties}>num lugar só.</span></span>
            </h1>

            <div className="mt-12 sm:mt-16 lg:mt-10 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 lg:gap-16 items-start">
              <div className="inicio-aparece" style={{ "--d": "420ms" } as React.CSSProperties}>
                {/* A chamada inteira em branco. "Alimentado sozinho" saiu
                    (revisão de outubro de 2026): estoque da UBS, merenda e
                    medição de obra são digitados pela equipe; só o que já é
                    público entra sem ninguém digitar. */}
                <p className="inicio-lead max-w-[40ch]">
                  Atendimento, secretarias, obras, saúde, educação e finanças num sistema que faz sozinho o que
                  hoje é feito à mão: lê as bases oficiais, conta os prazos e deixa prontos pedidos, ofícios e
                  relatórios.
                </p>

                {/* ── A AÇÃO, NA ORDEM EM QUE A PESSOA PENSA ──
                    O rótulo diz o que ela vai ver, a busca, a localização, a
                    garantia. A chave "Sou da prefeitura / Sou morador" pedia
                    que a pessoa dissesse quem é antes de ver qualquer coisa;
                    o morador agora tem um link no fim (?para=morador). */}
                <div className="mt-7">
                  <p className="text-[15px] font-medium mb-3">Digite o município e veja agora os números dele</p>
                  {/* ── UM CAMPO, NÃO DUAS LISTAS ──
                      A pessoa digita o nome (ou usa a localização) e a página
                      atualiza aqui mesmo, sem rolar. Sem JavaScript, /raio-x
                      tem a lista por estado. */}
                  <AcheSuaCidade
                    key={municipio?.codigo ?? "sem-cidade"}
                    destino="/?m="
                    compacto
                    empilhado
                    localNoCampo
                    idCampo="municipio-topo"
                    rolarAoTopo={false}
                    placeholder="Digite o nome do município"
                    inicial={municipio ? `${municipio.nome}, ${municipio.uf}` : ""}
                  />
                  <p className="text-[13px] mt-2" style={{ color: "color-mix(in oklab, var(--foreground) 70%, transparent)" }}>
                    Sem cadastro. Dado público do Tesouro Nacional, exercício de {LIMITE_DISPENSA.ano}.{" "}
                    <noscript>
                      <Link href="/raio-x" className="underline">Escolher pela lista de estados</Link>
                    </noscript>
                  </p>
                  {/* "É morador?" saiu daqui: a home é do gestor, e o topo tem
                      uma ação só (revisão de outubro de 2026). O morador entra
                      pelo rodapé, em "Portal da sua cidade". */}
                </div>
              </div>

              {/* Com município escolhido, a régua corre o número dele. Sem
                  cidade, o lado direito fica só com o mapa: o quadro das seis
                  áreas saiu daqui, porque a seção "Um módulo para cada parte
                  da prefeitura", logo abaixo, mostra os módulos funcionando
                  (pedido do fundador, outubro de 2026). */}
              {municipio && (
                <div className="inicio-aparece" style={{ "--d": "560ms" } as React.CSSProperties}>
                  {df ? (
                    <ReguaLrf dado={{ modo: "exemplo", aviso: "O DF segue limites da LRF de unidade da federação. Acima, um município de exemplo." }} />
                  ) : (
                    <Suspense
                      key={municipio.codigo}
                      fallback={<ReguaLrf dado={{ modo: "carregando", municipio: municipio.nome }} />}
                    >
                      <CarregaRegua codigoIbge={dados!.codigo} municipio={municipio.nome} />
                    </Suspense>
                  )}
                </div>
              )}
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
                {/* O aviso grátis: o motivo para voltar ao CidadeIA depois de
                    hoje (lib/aviso-da-cidade.ts). */}
                <div className="mt-4 max-w-2xl">
                  <AvisoDaCidade codigoIbge={dados!.codigo} municipio={dados!.nome} />
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

        {/* ═══ DE ONDE VEM O DADO ═══
            As nove bases numa faixa diagonal de margem a margem, que corre de
            lado enquanto a página desce (globals.css, .faixa-diagonal). A
            segunda volta da lista só existe para a faixa não acabar no meio:
            fica fora do leitor de tela e do Tab. */}
        <section className="pt-16 sm:pt-24" aria-labelledby="titulo-fontes">
          <h2 id="titulo-fontes" className="max-w-[1200px] mx-auto px-4 sm:px-8 text-sm text-muted">
            Lê direto das bases oficiais
          </h2>
          <div className="faixa-diagonal mt-8 sm:mt-10">
            <ul className="faixa-trilho">
              {[0, 1, 2].flatMap((volta) =>
                FONTES.map((f) => (
                  <li
                    key={`${volta}-${f}`}
                    className="text-xl sm:text-3xl font-medium tracking-[-0.03em]"
                    data-copia={volta > 0 ? "" : undefined}
                    aria-hidden={volta > 0 || undefined}
                  >
                    {/* Cada base leva ao próprio site: é onde conferir. */}
                    <a
                      href={LINK_DA_FONTE[f]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inicio-fonte"
                      tabIndex={volta > 0 ? -1 : undefined}
                    >
                      {f}
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        {/* ═══ MÓDULOS ═══
            Cada módulo como o instrumento da parte da prefeitura que ele
            cuida, e não seis cartões iguais. Ver MesaDeModulos.tsx. */}
        <section id="solucoes" className="tela-adiada max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36 scroll-mt-24">
          <div className="surge grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:gap-16 items-end mb-10 sm:mb-12">
            <h2 className="inicio-h2 max-w-[17ch]">Um módulo para cada parte da prefeitura.</h2>
            <p className="text-muted leading-relaxed max-w-[42ch]">
              Escolha uma pergunta e veja o módulo trabalhando. Cada um funciona sozinho: a prefeitura contrata só os que usa,
              sem pacote fechado e sem cobrança por usuário.
            </p>
          </div>
          <HidratarAoChegar id="mesa" className="surge">
            <MesaDeModulos
              limiteDispensa={LIMITE_DISPENSA.valor}
              modulos={modulosNaOrdemDaHome().map(({ chave, nome, detalhe }) => ({ chave, nome, capacidades: detalhe.capacidades }))}
            />
          </HidratarAoChegar>
        </section>

        {/* ═══ COMO FUNCIONA ═══
            Rolagem narrada no desktop, três blocos no celular. Ver
            ComoFunciona.tsx. */}
        <HidratarAoChegar id="como-funciona" className="tela-adiada">
          <ComoFunciona />
        </HidratarAoChegar>

        {/* ═══ O PORTAL DA TRANSPARÊNCIA ═══
            O que o cidadão recebe com o módulo Essencial, mostrado vivo: a
            janela com a cidade de exemplo (VitrinePortal.tsx), e embaixo as
            quatro coisas que o morador encontra. */}
        <section className="tela-adiada max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36 pb-16">
          <div className="surge grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:gap-16 items-end mb-10">
            <h2 className="inicio-h2 max-w-[17ch]">O portal do cidadão da sua cidade.</h2>
            <div>
              <p className="text-muted leading-relaxed max-w-[42ch]">
                Um site da prefeitura para o morador: ele vê as contas e as obras e
                fala com a prefeitura, em linguagem simples. Vem pronto no módulo
                Essencial. Soma ao Portal da Transparência que a lei exige, que
                continua saindo do sistema contábil.
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
                  </>
                )}
              </div>
            </div>
          </div>

          {/* A janela do portal chega deitada e se endireita ao subir
              (globals.css, .vista-3d). */}
          <div className="vista-3d">
            <HidratarAoChegar id="vitrine">
              <VitrinePortal />
            </HidratarAoChegar>
          </div>


        </section>

        {/* ═══ O PAÍS CONFERIDO ═══
            A prova de autoridade de uma empresa sem logo de cliente: o RGF
            de todas as prefeituras lido toda semana (lib/panorama.ts). Só
            agregados; cada cidade se vê no próprio Raio-X. Logo abaixo, a
            porta de cada uma das três pessoas que assinam o RGF. */}
        <HidratarAoChegar id="panorama">
        <section className="tela-adiada max-w-[1200px] mx-auto px-4 sm:px-8 pt-12 sm:pt-20">
          <div className="surge grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:gap-16 items-end">
            {/* Desceu do topo: as contas públicas são uma parte do produto, e
                não o produto inteiro. Aqui, a prova de que a parte fiscal é
                séria: o país inteiro conferido toda semana. */}
            <h2 className="inicio-h2 max-w-[19ch]">E as contas públicas, conferidas no país inteiro.</h2>
            <p className="text-muted leading-relaxed max-w-[44ch]">
              {(() => {
                const f = umaEmCada(passaramDoAlerta(PANORAMA.brasil), PANORAMA.brasil);
                return `${numeroBr(passaramDoAlerta(PANORAMA.brasil))} prefeituras já passaram do sinal de alerta${f ? ` (${f})` : ""}. `;
              })()}
              Toda semana lemos no Tesouro o RGF de cada prefeitura do país. Última conferência: {dataDoPanorama()}.
            </p>
          </div>
          <ul className="surge-lista mt-10 grid sm:grid-cols-3 gap-x-8 gap-y-6">
            {faixasDoPanorama(PANORAMA.brasil).map((f, i) => (
              <li key={f.chave} className="border-t border-border pt-5" style={{ "--i": i } as React.CSSProperties}>
                <p className="text-4xl sm:text-5xl font-semibold tabular-nums tracking-[-0.045em]" style={{ color: f.cor }}>
                  {numeroBr(f.valor)}
                </p>
                <p className="mt-2 font-medium">{f.rotulo}</p>
                <p className="text-sm text-muted leading-relaxed mt-1">{f.consequencia}</p>
              </li>
            ))}
          </ul>
          <Link href="/panorama" className="inicio-sublinhado inline-block mt-8 text-sm text-muted">
            Ver o panorama por estado
          </Link>

          {/* ── QUEM ASSINA O RGF ──
              Voltou, mais compacta: era o único ponto da home em que cada
              comprador se reconhecia (revisão de outubro de 2026). */}
          {/* Um campo de cor, e não três caixas de contorno: a porta de cada
              cargo é uma linha que acende ao passar o mouse. */}
          <div className="surge mt-16 rounded-[28px] px-5 py-7 sm:px-10 sm:py-9" style={{ background: "var(--card)" }}>
            <h3 className="text-xl sm:text-2xl font-semibold tracking-[-0.03em] max-w-[46ch] [text-wrap:balance]">
              Três pessoas assinam o RGF. Cada uma tem a sua página.
            </h3>
            <ul className="mt-6 grid md:grid-cols-3 gap-1 md:gap-3 -mx-3">
              {CARGOS.map((c) => (
                <li key={c.slug}>
                  <Link href={`/para/${c.slug}`} className="inicio-porta group block h-full rounded-2xl px-3 py-3.5">
                    <span className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
                      {c.rotulo}
                      <span aria-hidden className="inicio-porta-seta" style={{ color: "var(--brand-claro)" }}>
                        →
                      </span>
                    </span>
                    <span className="block text-sm text-muted leading-snug mt-1 max-w-[34ch]">{c.gancho}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </section>
        </HidratarAoChegar>


        {/* ═══ PROPOSTA ═══ */}
        {/* ═══ O VÍDEO, PARA REPASSAR ═══
            Voltou em formato menor: em prefeitura quem acha o site quase
            nunca é quem decide, e o vídeo é o que se manda adiante
            (revisão de outubro de 2026). Ver VideoExplicativo.tsx. */}
        <section className="tela-adiada pt-24 sm:pt-32">
          <div className="surge max-w-[1200px] mx-auto px-4 sm:px-8 grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:gap-16 items-end mb-10 sm:mb-12">
            <h2 className="inicio-h2 max-w-[16ch]">O CidadeIA em 30 segundos.</h2>
            <p className="text-muted leading-relaxed max-w-[40ch]">
              Para assistir agora, ou mandar para quem decide na prefeitura.
            </p>
          </div>
          {/* O vídeo ocupa a tela e chega recortado na largura da coluna; o
              recorte abre enquanto ele sobe (globals.css, .video-expande). */}
          <div className="video-expande">
            <HidratarAoChegar id="video">
              <VideoExplicativo
                src="/video/cidadeia-gestao.mp4"
                srcWebm="/video/cidadeia-gestao.webm"
                capa="/video/cidadeia-gestao-capa.jpg"
                titulo="O CidadeIA em 30 segundos: a gestão municipal inteira num lugar só, do gabinete ao celular do morador."
              />
            </HidratarAoChegar>
          </div>
        </section>

        {/* O fecho tem peso de fecho: um bloco com fundo próprio, e não mais
            uma seção igual às outras (revisão de outubro de 2026). O fundo é
            o roxo profundo da marca, sem contorno: a única mudança de campo
            de cor da página, e ela marca a decisão. */}
        <section id="proposta" className="tela-adiada max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36 pb-10 scroll-mt-24">
          {/* Uma grade só: no computador, título e dispensa lado a lado e o
              montador embaixo; no celular, o montador sobe logo depois do
              título e as notas da dispensa vão para o fim, para a ação não
              ficar atrás de três parágrafos de letra miúda. */}
          <div className="inicio-fecho surge relative isolate rounded-[32px] px-3 py-9 sm:px-12 sm:py-14 grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-x-16 gap-y-10 lg:gap-y-12 items-start">
            {/* O fundo do fecho: a grade de pontos e o brilho que se move,
                atrás do vidro do preço (globals.css, .fecho-fundo). Numa
                camada própria, e não no quadro, para o recorte não cortar o
                halo do montador. */}
            <div className="fecho-fundo" aria-hidden>
              <div className="grade-pontos" />
            </div>
            <div className="px-2 sm:px-0">
              {/* O título aceso como letreiro (globals.css, .fecho-neon): o
                  bloco de que o fundador gostou na landing de campanha. */}
              <h2 className="inicio-h2 fecho-neon max-w-[16ch]">Proposta pronta em um dia útil.</h2>
              <p className="text-muted leading-relaxed mt-6 max-w-[46ch]">
                Escolha o município e os módulos. Valor, termo de referência e
                minuta de contrato chegam no mesmo e-mail, sem reunião antes.
              </p>
            </div>
            <div className="order-3 lg:order-none px-2 sm:px-0 lg:border-l border-border lg:pl-10">
              {/* ── O PREÇO, EM VIDRO ──
                  "Sob consulta" no cartão de vidro sobre o brilho, e logo
                  abaixo como a prefeitura contrata esse valor. Era uma seção
                  própria ("Quanto custa"); veio para cá a pedido do fundador
                  (outubro de 2026). Fica nesta coluna, e não junto do título,
                  para no celular o montador continuar logo depois do título.
                  O texto repete só o que o site já afirma (valor por módulo,
                  pela faixa de habitantes do IBGE, sem cobrança por usuário). */}
              <Inclinar className="rounded-[24px] mb-9">
                <div className="preco-vidro rounded-[24px] px-6 py-7 sm:px-8 sm:py-8">
                  <p className="text-[2.4rem] sm:text-5xl font-semibold tracking-[-0.045em] leading-none">Sob consulta</p>
                  <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground) 78%, transparent)" }}>
                    Por módulo, por mês, pela faixa de habitantes do município, a população estimada pelo IBGE. Sem
                    cobrança por usuário.
                  </p>
                  {/* Leva ao montador, logo abaixo neste mesmo quadro. */}
                  <a
                    href="#montar-proposta"
                    className="mt-6 inline-flex items-center min-h-12 rounded-full px-6 text-[15px] font-semibold text-white bg-brand hover:bg-brand-dark transition-colors pressiona"
                  >
                    Receber proposta
                  </a>
                </div>
              </Inclinar>
              <p className="text-sm text-muted">Limite da dispensa de licitação por valor</p>
              <p className="mt-2 text-4xl sm:text-5xl font-semibold tabular-nums tracking-[-0.045em]">
                {formatarMoedaExata(LIMITE_DISPENSA.valor)}
              </p>
              <p className="mt-3 text-sm text-muted leading-relaxed max-w-[36ch]">
                por ano, em contratação direta. {LIMITE_DISPENSA.base}, valor do{" "}
                {LIMITE_DISPENSA.atualizadoPor}.
              </p>
              <p className="mt-3 text-sm text-muted leading-relaxed max-w-[36ch]">
                {AVISO_FRACIONAMENTO.curto} {AVISO_FRACIONAMENTO.base}.
              </p>
              {/* "Cabe na dispensa" dizia só metade: o valor abre a porta, mas
                  a dispensa ainda pede justificativa do preço e pesquisa com
                  outros fornecedores (art. 72), e o kit traz o modelo. */}
              <p className="mt-3 text-sm text-muted leading-relaxed max-w-[36ch]">
                O valor não basta: a dispensa pede estimativa de despesa, pesquisa de preço e justificativa da escolha
                (art. 72). O <Link href="/kit" className="underline underline-offset-2">kit de contratação</Link> traz o modelo.
              </p>
            </div>
          {/* ── O MUNICÍPIO SE ESCOLHE AQUI MESMO ──
              Era "Escolher o município no topo da página ↑": quem chegava à
              proposta subia a página inteira, escolhia, a home recarregava e
              a pessoa descia de novo procurando onde estava. No último passo
              antes do pedido, era o maior atrito do caminho (revisão de
              novembro de 2026). Agora o campo está no próprio montador; com
              município escolhido no topo, ele já vem preenchido. */}
          <div id="montar-proposta" className="order-2 lg:order-none lg:col-span-2 min-w-0 scroll-mt-24">
            <HidratarAoChegar id="montador">
              <MontadorProposta key={municipio?.codigo ?? "sem-municipio"} campoNoTopo municipioInicial={municipio && !df ? { nome: municipio.nome, uf: municipio.uf } : undefined} />
            </HidratarAoChegar>
          </div>
          </div>

          {/* ═══ O FECHO É O MONTADOR ═══
              O pedido de ligação saiu daqui em 14/10/2026: logo acima, o
              montador já termina no botão de pedir a proposta, e dois pedidos
              seguidos disputavam a mesma decisão. A ligação continua nas
              páginas por cargo, no panorama, no Raio-X e na /proposta. */}
        </section>

        <div className="pb-14 sm:pb-22" />

        {/* ═══ A PORTA DO CIDADÃO ═══
            Quem compra precisa saber que o outro lado existe; o morador tem a
            página dele em /transparencia e não precisa atravessar esta. */}
      </main>

      {/* O rodapé tem uns oitenta links e nenhum botão: liga quando a pessoa
          chega perto, e até lá cada link funciona como link comum. */}
      <HidratarAoChegar id="rodape" className="tela-adiada">
        <SiteFooter />
      </HidratarAoChegar>
    </div>
  );
}
