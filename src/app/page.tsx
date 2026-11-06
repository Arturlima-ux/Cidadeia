import type { Metadata } from "next";
import Link from "next/link";
import { compartilhamento, DESCRICAO_PADRAO, JsonLdScript, ldSite, TITULO_DO_SITE } from "@/lib/seo";
import { Suspense } from "react";
import { registrarEvento } from "@/lib/registrar-evento";
import type { PedidoDaHome } from "@/lib/home-montada";
import { LIMITE_DISPENSA } from "@/lib/contratacao";
import { listarPortaisPublicados } from "@/lib/portais";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import AcheSuaCidade from "@/components/morador/AcheSuaCidade";
import EsqueletoFato from "@/components/site/EsqueletoFato";
import PedirProjecao from "@/components/site/PedirProjecao";
import AvisoDaCidade from "@/components/site/AvisoDaCidade";
import ReguaLrf from "@/components/site/inicio/ReguaLrf";
import HidratarAoChegar from "@/components/site/inicio/HidratarAoChegar";
import ContarVisita from "@/components/site/inicio/ContarVisita";
import TopoBrasil from "@/components/site/inicio/TopoBrasil";
import RolarParaAqui from "@/components/site/inicio/RolarParaAqui";
import HomeMorador from "./_morador/HomeMorador";
import CarregaPessoal from "./_heroi/CarregaPessoal";
import CarregaRreo from "./_heroi/CarregaRreo";
import CarregaRegua from "./_heroi/CarregaRegua";
import { municipioDoParametro, municipioParaDados } from "@/lib/fatos-do-municipio";
import { sedeNoMapa } from "@/lib/sede-no-mapa";
import EstruturaD from "./_abaixo/EstruturaD";
import { AVISO_DF_COM_PESSOAL, ehDistritoFederal } from "@/lib/regioes-df";
import { ESTADOS } from "@/lib/estados";

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
  const cidadeDoMontador = municipio && !df ? { nome: municipio.nome, uf: municipio.uf } : undefined;
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

        {/* ── DO FIM DO MAPA PARA BAIXO (nov/2026) ──
            A estrutura D, aprovada pelo fundador: o mosaico, o carrossel dos
            módulos, o vídeo e a proposta (app/_abaixo). */}
        <EstruturaD cidade={cidadeDoMontador} chave={municipio?.codigo ?? "sem-municipio"} />

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
