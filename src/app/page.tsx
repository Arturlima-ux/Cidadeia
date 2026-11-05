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
import BarraConversao from "@/components/site/BarraConversao";
import AcheSuaCidade from "@/components/morador/AcheSuaCidade";
import EsqueletoFato from "@/components/site/EsqueletoFato";
import PedirProjecao from "@/components/site/PedirProjecao";
import AvisoDaCidade from "@/components/site/AvisoDaCidade";
import ReguaLrf from "@/components/site/inicio/ReguaLrf";
import MesaDeModulos from "@/components/site/inicio/MesaDeModulos";
import { modulosNaOrdemDaHome } from "@/lib/modulos-detalhe";
import HidratarAoChegar from "@/components/site/inicio/HidratarAoChegar";
import ComoFunciona from "@/components/site/inicio/ComoFunciona";
import ContarVisita from "@/components/site/inicio/ContarVisita";
import TopoBrasil from "@/components/site/inicio/TopoBrasil";
import RolarParaAqui from "@/components/site/inicio/RolarParaAqui";
import VideoExplicativo from "@/components/site/VideoExplicativo";
import CapitulosDoVideo from "@/components/site/inicio/CapitulosDoVideo";
import HomeMorador from "./_morador/HomeMorador";
import CarregaPessoal from "./_heroi/CarregaPessoal";
import CarregaRreo from "./_heroi/CarregaRreo";
import CarregaRegua from "./_heroi/CarregaRegua";
import { municipioDoParametro, municipioParaDados } from "@/lib/fatos-do-municipio";
import { sedeNoMapa } from "@/lib/sede-no-mapa";
import { CONTATO_PUBLICO } from "@/lib/contato-comercial";
import { AVISO_DF_COM_PESSOAL, ehDistritoFederal } from "@/lib/regioes-df";
import { ESTADOS } from "@/lib/estados";
import { LINK_DA_FONTE } from "@/lib/links-oficiais";

// ── A PÁGINA EM SEIS PARTES (enxuta, novembro de 2026) ──
//
// Topo com o mapa e a busca da cidade → de onde vem o dado → os seis módulos
// → como funciona, em três linhas → vídeo → proposta.
//
// Pedido do fundador: "está com muita informação". Eram dez seções, ~1.260
// palavras e 14,5 telas no celular. Saíram da home, e seguem nas próprias
// páginas e no menu: o portal do cidadão (já mostrado no módulo Essencial;
// /transparencia), o panorama nacional com as portas por cargo (/panorama,
// /para/...) e "O que pensamos" (/quem-somos). A proposta ficou com o
// formulário e duas linhas; a dispensa por inteiro está em /como-contratar.
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
// A home sai pronta do cache e é refeita no máximo uma vez por hora; desde
// que o portal saiu dela (nov/2026), só a versão do morador lê o banco (a
// lista de portais no ar). Antes, cada
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
  const sede = municipio ? sedeNoMapa(municipio.codigo) : null;
  const cidadeNoMapa = municipio && sede ? { nome: municipio.nome, uf: municipio.uf, ...sede } : null;
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

  // ── O MORADOR VÊ OUTRO SITE ──
  // Outra cor (tema-morador), outro cabeçalho e outra página inteira: a
  // cidade dele explicada em linguagem simples. Ver _morador/HomeMorador.tsx.
  if (morador) {
    // Os portais no ar, que o morador abre agora; sem nenhum, a cidade de exemplo.
    const { portais } = await listarPortaisPublicados();
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
        {/* ── O BRASIL EM RELEVO (novembro de 2026) ──
            No lugar do planeta: o Brasil esculpido em grafite, as capitais
            acendendo em roxo e o visitante em azul (TopoBrasil.tsx). O texto
            vem do servidor; o 3D chega depois do load. */}
        <TopoBrasil
          cidade={cidadeNoMapa}
          busca={
            <>
              <AcheSuaCidade
                key={municipio?.codigo ?? "sem-cidade"}
                destino="/?m="
                compacto
                empilhado
                localNoCampo
                idCampo="municipio-topo"
                rolarAoTopo={false}
                rolarPara="numeros-da-cidade"
                placeholder="Digite o nome do município"
                inicial={municipio ? `${municipio.nome}, ${municipio.uf}` : ""}
              />
              <p className="topo3d-busca-nota">
                Veja os números da sua prefeitura. Sem login, dado público do Tesouro Nacional, exercício de{" "}
                {LIMITE_DISPENSA.ano}.{" "}
                <noscript>
                  <Link href="/raio-x" className="underline">Escolher pela lista de estados</Link>
                </noscript>
              </p>
            </>
          }
        />

        <section className="relative">
          <div className="relative max-w-[1200px] mx-auto px-4 sm:px-8 pb-6 sm:pb-10">
            {/* Com município escolhido, a régua corre o número dele. */}
            {municipio && (
              <div id="numeros-da-cidade" className="mt-12 max-w-[760px] mx-auto scroll-mt-24">
                <RolarParaAqui key={municipio.codigo} id="numeros-da-cidade" />
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
            As nove bases numa linha reta entre dois fios (globals.css,
            .faixa-reta). Era uma faixa roxa inclinada que corria de lado; saiu
            no clima grafite (nov/2026). */}
        <section className="pt-16 sm:pt-24" aria-labelledby="titulo-fontes">
          <h2 id="titulo-fontes" className="inicio-sobre max-w-[1200px] mx-auto px-4 sm:px-8">
            <i aria-hidden />
            Lê direto das bases oficiais
          </h2>
          <div className="faixa-reta">
            <ul>
              {FONTES.map((f) => (
                <li key={f} className="text-lg sm:text-2xl font-medium tracking-[-0.03em]">
                  {/* Cada base leva ao próprio site: é onde conferir. */}
                  <a href={LINK_DA_FONTE[f]} target="_blank" rel="noopener noreferrer" className="inicio-fonte">
                    {f}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══ MÓDULOS ═══
            Cada módulo como o instrumento da parte da prefeitura que ele
            cuida, e não seis cartões iguais. Ver MesaDeModulos.tsx. */}
        <section id="solucoes" className="tela-adiada max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36 scroll-mt-24">
          <div className="surge grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:gap-16 items-end mb-10 sm:mb-12">
            <div>
              <p className="inicio-sobre"><i aria-hidden />Módulos</p>
              <h2 className="inicio-h2 max-w-[17ch]">Um módulo para cada parte da prefeitura.</h2>
            </div>
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
            Três passos, uma linha cada, sem nada a ligar no navegador
            (ComoFunciona.tsx). */}
        <ComoFunciona />

        {/* ═══ PROPOSTA ═══ */}
        {/* ═══ O VÍDEO, PARA REPASSAR ═══
            Voltou em formato menor: em prefeitura quem acha o site quase
            nunca é quem decide, e o vídeo é o que se manda adiante
            (revisão de outubro de 2026). Ver VideoExplicativo.tsx. */}
        <section id="video" className="tela-adiada pt-24 sm:pt-32 scroll-mt-24">
          <div className="surge max-w-[1200px] mx-auto px-4 sm:px-8 grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 lg:gap-16 items-end mb-10 sm:mb-12">
            <div>
              <p className="inicio-sobre"><i aria-hidden />Em vídeo</p>
              <h2 className="inicio-h2 max-w-[16ch]">O CidadeIA em 30 segundos.</h2>
            </div>
            <p className="text-muted leading-relaxed max-w-[40ch]">
              Do atendimento ao gabinete, do celular do morador às bases oficiais. Para assistir agora ou mandar para quem decide na prefeitura.
            </p>
          </div>
          {/* O vídeo ocupa a tela e chega recortado na largura da coluna; o
              recorte abre enquanto ele sobe (globals.css, .video-expande). */}
          <div className="video-expande">
            <HidratarAoChegar id="video">
              <VideoExplicativo
                id="video-cidadeia"
                src="/video/cidadeia-gestao.mp4"
                srcWebm="/video/cidadeia-gestao.webm"
                capa="/video/cidadeia-gestao-capa.jpg"
                titulo="O CidadeIA em 30 segundos: a gestão municipal inteira num lugar só, do gabinete ao celular do morador."
              />
            </HidratarAoChegar>
          </div>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
            <CapitulosDoVideo idVideo="video-cidadeia" />
          </div>
        </section>

        {/* O fecho tem peso de fecho: um bloco com fundo próprio, e não mais
            uma seção igual às outras (revisão de outubro de 2026). O fundo é
            o roxo profundo da marca, sem contorno: a única mudança de campo
            de cor da página, e ela marca a decisão. */}
        <section id="proposta" className="tela-adiada max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36 pb-10 scroll-mt-24">
          {/* Título, duas linhas e o montador, nessa ordem, em qualquer tela. */}
          <div className="inicio-fecho surge relative isolate rounded-[32px] px-3 py-9 sm:px-12 sm:py-14 grid gap-y-10 lg:gap-y-12 items-start">
            <div className="px-2 sm:px-0">
              <h2 className="inicio-h2 max-w-[16ch]">Proposta pronta em um dia útil.</h2>
              <p className="text-muted leading-relaxed mt-6 max-w-[46ch]">
                Escolha o município e os módulos. Valor, termo de referência e
                minuta de contrato chegam no mesmo e-mail, sem reunião antes.
              </p>
              {/* A dispensa em uma linha; por inteiro em /como-contratar e no kit. */}
              <p className="mt-3 text-sm text-muted leading-relaxed max-w-[52ch]">
                Cabe na dispensa por valor, até {formatarMoedaExata(LIMITE_DISPENSA.valor)} por ano ({LIMITE_DISPENSA.base}).{" "}
                {AVISO_FRACIONAMENTO.curto} <Link href="/como-contratar" className="underline underline-offset-2">Como contratar</Link>
              </p>
            </div>
          {/* ── O MUNICÍPIO SE ESCOLHE AQUI MESMO ──
              Era "Escolher o município no topo da página ↑": quem chegava à
              proposta subia a página inteira, escolhia, a home recarregava e
              a pessoa descia de novo procurando onde estava. No último passo
              antes do pedido, era o maior atrito do caminho (revisão de
              novembro de 2026). Agora o campo está no próprio montador; com
              município escolhido no topo, ele já vem preenchido. */}
          <div id="montar-proposta" className="min-w-0 scroll-mt-24">
            <HidratarAoChegar id="montador">
              <MontadorProposta key={municipio?.codigo ?? "sem-municipio"} resumoSobConsulta municipioInicial={municipio && !df ? { nome: municipio.nome, uf: municipio.uf } : undefined} />
            </HidratarAoChegar>
          </div>
          {/* ── ANTES DE ASSINAR (nov/2026) ──
              O painel simulado de 30 perfis de prefeitura travou menos no
              produto e mais na confiança: quem responde, se o contador perde
              o lugar e se dá para testar antes. Três respostas curtas, junto
              do botão de pedir. */}
          <dl className="fecho-confianca px-2 sm:px-0">
            <div>
              <dt>Piloto sem custo</dt>
              <dd>
                As primeiras prefeituras usam antes de contratar.{" "}
                <Link href="/fale-conosco" className="underline underline-offset-2">Pedir um piloto</Link>
              </dd>
            </div>
            <div>
              <dt>Quem responde</dt>
              <dd>
                A Equipe CidadeIA, em {CONTATO_PUBLICO}. A proposta chega em um dia útil.
              </dd>
            </div>
            <div>
              <dt>Ao lado do contador</dt>
              <dd>O CidadeIA confere e avisa. Quem lança e assina continua sendo a contabilidade da prefeitura.</dd>
            </div>
          </dl>
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
        <SiteFooter assinatura />
      </HidratarAoChegar>
    </div>
  );
}
