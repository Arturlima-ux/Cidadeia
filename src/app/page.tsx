import Link from "next/link";
import { lerSessao } from "@/lib/sessao";
import { LIMITE_DISPENSA } from "@/lib/contratacao";
import { EXIGENCIAS } from "@/lib/diagnostico";
import { modulosNaOrdemDaHome } from "@/lib/modulos-detalhe";
import { listarPortaisPublicados } from "@/lib/portais";
import { formatarMoedaExata } from "@/lib/formatadores";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import MontadorProposta from "@/components/site/MontadorProposta";
import BarraConversao from "@/components/site/BarraConversao";
import PainelDemonstracao from "@/components/site/PainelDemonstracao";
import Olho from "@/components/site/Olho";
import { IMPLANTACAO } from "@/lib/textos-contratacao";
import {
  IconCheck,
  IconAlertas,
  IconVisaoGeral,
  IconSaude,
  IconEducacao,
  IconObras,
  IconLicitacoes,
} from "@/components/icons";

// ── A ORDEM DA PÁGINA ──
//
// O que é → o que faz → por que não a incumbente → quanto custa → dá para
// conferir → como sai do papel → antes de assinar.
//
// O detalhe dos módulos ficava na nona seção, DEPOIS do preço. Quem chegava
// sem saber o que é o CidadeIA — um vereador, um assessor, alguém que não é o
// jurídico — via o valor antes de entender o que estava comprando, e a página
// só fazia sentido para quem já sabia. Agora o produto vem antes da conta.
//
// ── POR QUE 11 BLOCOS, E NÃO 15 ──
//
// A página cresceu por acréscimo, e três histórias tinham chegado partidas:
//
// "Kit de contratação", "Como contratar" e "Implantação" eram seções seguidas
// contando pedaços da MESMA resposta — como isso sai do papel. Viraram uma só,
// em três bandas na ordem em que acontece: decidir o caminho, montar o
// processo, entrar no ar.
//
// "Objeções" e "Conformidade" serviam o mesmo leitor, o que confere antes de
// assinar, e estavam separadas por uma terceira seção no meio. "E a LGPD?" é a
// versão informal de uma linha da tabela de conformidade; responder nos dois
// lugares, longe um do outro, fazia a página parecer desorganizada.
//
// "Diagnóstico — lembrete" repetia a oferta que ABRE a página, e o argumento
// de honestidade que ela carregava já vive na lista de provas verificáveis.
// Saiu inteira.
//
// "Para o cidadão" era uma seção com título grande, três cartões de direitos e
// botão próprio, no meio do funil comercial. O morador precisava atravessar
// hero de risco fiscal, módulos, tabela comparativa e calculadora de preço
// para achar o que é dele — e dois públicos disputavam a mesma rolagem, sem
// caminho claro para nenhum. O conteúdo mudou para /transparencia, que é a
// página que ele de fato abre; aqui ficou uma faixa de duas linhas, porque
// quem COMPRA também precisa saber que existe o outro lado.

const ICONE_ADDON: Record<string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  essencial: IconAlertas,
  gestao: IconVisaoGeral,
  saude: IconSaude,
  educacao: IconEducacao,
  obras: IconObras,
  licitacoes: IconLicitacoes,
};

// ── O QUE O VISITANTE CONSEGUE CONFERIR AGORA ──
//
// Sinais de que existe alguém do outro lado, sem inventar credencial que não
// temos. Cada linha aponta para algo que o visitante abre e confere sozinho —
// a única forma de autoridade disponível para quem ainda não tem carteira de
// clientes para exibir.
//
// É uma FUNÇÃO, e não uma lista fixa, por causa do primeiro item. Ele afirmava
// "O portal já está no ar — endereço público de um município real" mesmo sem
// nenhum portal publicado, e os botões ao lado levavam a uma página que
// respondia "Nenhum portal publicado ainda".
//
// Era o pior defeito possível nesta seção: ela existe justamente para dizer
// "não peça fé, confira" — e a conferência levava dez segundos e desmentia a
// promessa. Um servidor cético não faz a segunda checagem depois dessa.
//
// Enquanto não houver o primeiro município no ar, o item sai. No lugar entra o
// Raio-X, que é prova de verdade: lê dado federal público de QUALQUER
// município e responde na hora, inclusive o de quem está lendo.
function autoridadeVerificavel(temPortalNoAr: boolean) {
  return [
    temPortalNoAr
      ? {
          titulo: "O portal já está no ar",
          texto:
            "Endereço público de um município real, aberto sem cadastro. Não é ambiente de demonstração montado para a visita.",
        }
      : {
          titulo: "Confira com o seu próprio município",
          texto:
            "O Raio-X lê os dados que a União já publica sobre qualquer prefeitura do país e responde na hora. Digite a sua e veja o que sai — sem cadastro, sem conversa com vendedor.",
        },
    {
      titulo: "O contrato é público antes da venda",
      texto:
        "Termo de referência, minuta e acordo de tratamento de dados ficam para download sem cadastro. Dá para o jurídico reprovar antes de você falar com a gente.",
    },
    {
      titulo: "A saída está escrita",
      texto:
        "Exportação em CSV e JSON a qualquer momento, sem custo e sem pedir autorização. Quem prende cliente por dificuldade de sair não escreve isso na home.",
    },
    {
      titulo: "O diagnóstico admite o que não fazemos",
      texto:
        "Parte das exigências continua com a prefeitura mesmo contratando o sistema, e elas aparecem no resultado com nome e artigo.",
    },
  ];
}


// A comparação é o argumento mais forte da página: o visitante sente o que
// perde ao escolher a alternativa. Cada linha é verificável.
const VERSUS = [
  {
    pergunta: "Quanto custa",
    eles: "Reunião com o comercial antes de qualquer número",
    nos: "Nesta página, por módulo e por porte do município",
  },
  {
    pergunta: "Como contratar legalmente",
    eles: "Você descobre com o seu jurídico",
    nos: "Três caminhos descritos, com a base legal de cada um",
  },
  {
    pergunta: "Quem monta o processo",
    eles: "O servidor, do zero",
    nos: "Vai pronto: termo de referência, minuta, LGPD e nível de serviço",
  },
  {
    // Dizia "Abra e confira — três canais no ar, sem login", e os três canais
    // são do portal do cidadão. Sem nenhum portal publicado, era a mesma
    // promessa vazia da seção de prova, num lugar em que ninguém procuraria.
    //
    // O Raio-X substitui porque cumpre o mesmo papel — o cético confere sem
    // pedir nada a ninguém — e funciona hoje, para qualquer município.
    pergunta: "Se funciona mesmo",
    eles: "Slide e vídeo gravado",
    nos: "Abra o Raio-X do seu município e confira, sem login",
  },
  {
    pergunta: "E se quiser sair",
    eles: "Exportação sob análise",
    nos: "JSON e CSV a qualquer momento, sem custo e sem autorização",
  },
];


export default async function LandingPage() {
  // Aqui havia `if (sessao) redirect("/dashboard")`, e ele custava caro: quem
  // já era cliente NÃO CONSEGUIA MAIS VER O SITE. Nem para conferir a própria
  // página de transparência, nem para mostrar a um secretário, nem para
  // revisar o que a página promete antes de uma reunião. Digitar o domínio
  // levava ao painel, sempre, sem escapatória.
  //
  // A conveniência era real — cliente que digita o endereço quer o painel —
  // mas virou prisão. Agora ela vive no cabeçalho: quem tem sessão vê "Ir
  // para o painel" no lugar de "Entrar". Oferta em vez de imposição.
  //
  // A sessão é lida AQUI e passada ao cabeçalho, em vez de lida dentro dele:
  // ler cookie no componente compartilhado tornaria dinâmica toda página que
  // o usa — preços, FAQ, sobre, kit —, tirando todas do cache do CDN por
  // causa do rótulo de um botão. Esta página já é dinâmica porque lista os
  // portais publicados, então aqui a leitura não custa nada.
  const sessao = await lerSessao();

  // Prova social é o eixo de conversão de toda govtech estabelecida, e é
  // exatamente o que não temos. O substituto é prova VERIFICÁVEL: em vez de
  // afirmar quantos clientes existem, mostramos portais que qualquer um abre
  // agora. O número sai do banco — nunca é escrito à mão — e quando não há
  // portal (ou o banco não responde) a página convida a conferir sem
  // prometer quantidade nenhuma.
  const { portais } = await listarPortaisPublicados();
  const portalVitrine = portais[0] ?? null;
  const modulos = modulosNaOrdemDaHome();

  // A leitura por IA depende da chave da Anthropic no ambiente. Sem ela as
  // funções de insight devolvem erro em vez de resposta, então a home não
  // anuncia o recurso — prometer na página o que o servidor não executa é o
  // tipo de furo que o primeiro cliente descobre sozinho, no pior momento.
  const iaAtiva = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="tema-noite min-h-screen overflow-x-hidden relative">
      {/* ── atmosfera ──
          Eram dois círculos de 736px e 608px com `filter: blur(90px)`, numa
          camada fixa. O comentário antigo os chamava de "profundidade barata";
          eram o oposto: blur de 90px sobre elemento desse tamanho aloca uma
          textura enorme e a convolução ficava viva durante toda a rolagem,
          porque a camada é position:fixed.

          Gradiente radial produz a mesma mancha suave — é literalmente uma
          interpolação de cor — e custa uma pintura só, sem filtro nenhum. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-64 -left-40 w-[46rem] h-[46rem]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(61,134,240,0.20) 0%, rgba(61,134,240,0.10) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-56 -right-32 w-[38rem] h-[38rem]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(47,191,135,0.14) 0%, rgba(47,191,135,0.07) 40%, transparent 70%)",
          }}
        />
        {/* A malha ficava desbotada por `mask-image`. Máscara obriga o
            navegador a manter uma camada de composição separada e a recompor a
            cada quadro — caro, e nesta camada fixa ficava caro o tempo todo.

            Duas camadas planas fazem o mesmo: a grade inteira, e por cima um
            degradê da cor de fundo que a apaga descendo. É só pintura. */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, var(--background) 55%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <SiteHeader sessaoAtiva={Boolean(sessao)} />
        <BarraConversao />

        {/* ═══ HERÓI — a oferta antes da descrição ═══ */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-16 sm:pb-20">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-14 items-center">
            <Reveal>
              <div>
                <span
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] rounded-full px-4 py-2 border"
                  style={{
                    color: "var(--accent-claro)",
                    background: "var(--accent-tint)",
                    borderColor: "var(--info-borda)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-tint)" }}
                  />
                  Sistema operacional da prefeitura · {LIMITE_DISPENSA.ano}
                </span>

                {/* A dobra abria com COMO COMPRAR — dispensa, limite, valor —
                    e a primeira coisa que o prefeito lia era um convite a
                    gastar sem licitar. Correto pelo art. 75, II, e mesmo
                    assim o pior som possível para quem vive com medo de
                    improbidade. Pior: ele descia a tela inteira sem descobrir
                    o que o sistema faz.

                    Agora abre pelo risco que ele já corre com ou sem a gente.
                    A dispensa continua na página — desceu para junto do
                    preço, que é onde ela remove objeção em vez de criar. */}
                <h1 className="font-serif text-[2.9rem] leading-[1.0] sm:text-[3.8rem] sm:leading-[0.98] font-extrabold tracking-[-0.035em] mt-6 max-w-[16ch] [text-wrap:balance]">
                  A prefeitura inteira numa tela que diz o que decidir.
                </h1>

                {/* O que o herói NÃO dizia: o que o produto é. Quem lia só a
                    primeira dobra saía achando que o CidadeIA é ferramenta de
                    compliance, e não um sistema de gestão — o gancho da
                    conformidade estava vendendo risco jurídico no lugar da
                    plataforma. O nome do produto agora aparece antes do
                    gancho, e o gancho vira o primeiro passo dentro dele. */}
                {/* "Sistema operacional" era o slogan e ninguém explicava por
                    quê. A frase seguinte é a explicação: um ambiente só para
                    enxergar, analisar e agir. O gancho da LAI, que abria a
                    página, desce para segundo parágrafo — continua sendo o
                    primeiro passo, mas depois de a pessoa saber o que é isto. */}
                <p className="text-foreground text-base sm:text-lg leading-relaxed mt-6 max-w-[50ch]">
                  Um único ambiente para enxergar, analisar e agir: saúde,
                  educação, obras, licitações, transparência e ouvidoria numa
                  base só — e a IA dizendo o que mudou e o que fazer.
                </p>

                <p className="text-muted text-base leading-relaxed mt-4 max-w-[50ch]">
                  Comece pelo diagnóstico gratuito: {EXIGENCIAS.length}{" "}
                  exigências da LAI, da Lei 13.460, da LRF e da LGPD conferidas
                  contra o seu município, cada pendência com o artigo que a
                  cria.
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-8">
                  <Link
                    href="/diagnostico"
                    className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-7 py-4 transition shadow-elevated"
                  >
                    Fazer o diagnóstico&nbsp;&nbsp;→
                  </Link>
                  <Link
                    href="#proposta"
                    className="border border-border bg-white/[0.03] hover:bg-white/[0.07] font-semibold text-sm rounded-xl px-6 py-4 transition"
                  >
                    Ver quanto custa
                  </Link>
                </div>

                <p className="text-xs text-muted mt-4">
                  Dois minutos · sem cadastro · nada é enviado
                </p>

                {/* A prova sobe para o herói. Ficava na quarta seção, depois
                    do preço — quem desistia antes nunca via que dá para
                    conferir. Nas govtechs estabelecidas a prova abre a
                    página; a delas é logo de cliente, a nossa é um endereço
                    que abre. */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8 pt-7 border-t border-border">
                  {/* Sem portal no ar, este link dizia "Ver um portal
                      publicado", com bolinha verde pulsando e "abra sem
                      login" — e levava a uma página que responde "Nenhum
                      portal publicado ainda". A prova mais visível da página
                      provava o contrário do que prometia, em dez segundos.

                      O Raio-X ocupa o lugar porque é conferível de verdade
                      hoje: lê dado federal público de qualquer município,
                      inclusive o de quem está lendo. A bolinha pulsando só
                      aparece quando há de fato um endereço no ar. */}
                  <Link
                    href={portalVitrine ? `/transparencia/${portalVitrine.slug}` : "/raio-x"}
                    className="group inline-flex items-center gap-2.5 text-sm font-semibold hover:text-brand-claro transition"
                  >
                    {portalVitrine && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse-soft"
                        style={{ background: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-tint)" }}
                      />
                    )}
                    {portalVitrine
                      ? `Portal de ${portalVitrine.municipio} · ${portalVitrine.estado}`
                      : "Ver o Raio-X do seu município"}
                    <span className="text-muted font-normal group-hover:text-brand-claro transition">
                      {portalVitrine ? "— abra sem login" : "— dado federal, sem cadastro"}
                    </span>
                  </Link>

                </div>
              </div>
            </Reveal>
            {/* Aqui ficava o cartão das ${EXIGENCIAS.length} exigências — o
                diagnóstico resumido. Ele foi para /conformidade, onde é o
                resumo da tabela. No herói entra o produto: a Visão Geral
                desenhada em HTML, com os mesmos tokens do painel. Quem chega
                vê a tela que está comprando antes de ler qualquer argumento. */}
            <Reveal delay={140}>
              <PainelDemonstracao />
            </Reveal>
          </div>
        </section>

        {/* ═══ O SISTEMA ═══
            Aqui havia uma tarja de quatro leis, que repetia o cartão do herói
            — ele já mostra a lei de cada bloco do diagnóstico. O espaço logo
            abaixo da dobra passa a responder a pergunta que ela deixava em
            aberto: afinal, o que é isto? */}
        <div className="border-y border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted">
              Um sistema, seis áreas
            </span>
            {modulos.map(({ chave, nome }) => {
              const Icone = ICONE_ADDON[chave];
              return (
                <Link
                  key={chave}
                  href="#solucoes"
                  className="flex items-center gap-2 text-sm font-semibold hover:text-brand-claro transition"
                >
                  <Icone className="w-4 h-4 shrink-0" style={{ color: "var(--brand-claro)" }} />
                  {nome}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ═══ SOLUÇÕES ═══ */}
        <section id="solucoes" className="border-y border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <Olho>Módulos</Olho>
                  <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[16ch]">
                    Contrate por área, não por pacote.
                  </h2>
                </div>
                <p className="text-sm text-muted leading-relaxed max-w-sm">
                  Um município de 8 mil habitantes não paga pelo que uma capital
                  usa. Sem limite de relatórios e sem cobrança por usuário.
                </p>
              </div>
            </Reveal>

            {/* Cada módulo era uma frase de uma linha. Um comprador público
                conservador não consegue defender uma contratação internamente
                com uma frase — ele precisa de superfície suficiente para
                montar a justificativa. Cada item abaixo corresponde a um
                campo que existe no banco ou a uma regra que roda no código
                (ver lib/modulos-detalhe.ts).

                O selo "Mais contratado" saiu do Essencial: afirmava um dado
                de venda comparativo que não temos. */}
            <div className="grid md:grid-cols-2 gap-4 mt-10">
              {modulos.map(({ chave, nome, detalhe }, i) => {
                const Icone = ICONE_ADDON[chave];
                return (
                  <Reveal key={chave} delay={i * 60}>
                    <div
                      className="h-full flex flex-col gap-4 rounded-2xl border border-border p-6 sm:p-7 card-interactive"
                      style={{ background: "var(--card)" }}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className="w-11 h-11 arco-card-sm flex items-center justify-center shrink-0"
                          style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
                        >
                          <Icone className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-serif text-xl font-bold leading-tight">{nome}</h3>
                          <p className="text-sm text-muted leading-relaxed mt-1">
                            {detalhe.resumo}
                          </p>
                        </div>
                      </div>

                      <ul className="flex flex-col gap-2 flex-1">
                        {detalhe.capacidades.map((c) => (
                          <li key={c} className="flex gap-2.5 text-sm leading-snug">
                            <IconCheck
                              className="w-4 h-4 shrink-0 mt-0.5"
                              style={{ color: "var(--accent)" }}
                            />
                            <span className="text-muted">{c}</span>
                          </li>
                        ))}
                      </ul>

                      {detalhe.automacao && (
                        <SeloLinha rotulo="Automático" tom="accent">
                          {detalhe.automacao}
                        </SeloLinha>
                      )}
                      {/* A linha de IA só aparece quando o ambiente tem a
                          chave da Anthropic. Sem ela as funções devolvem erro
                          explicando isso, e anunciar na home um recurso que o
                          servidor não consegue executar seria vender o que
                          não é entregue. Configurada a chave, o texto volta
                          sozinho — aqui e no resto da página. */}
                      {iaAtiva && detalhe.ia && (
                        <SeloLinha rotulo="IA" tom="brand">
                          {detalhe.ia}
                        </SeloLinha>
                      )}

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4">
                        <Link
                          href="#proposta"
                          className="text-sm font-bold text-brand hover:text-brand-claro transition"
                        >
                          Ver na proposta →
                        </Link>
                        {detalhe.noPortal && portalVitrine && (
                          <Link
                            href={`/transparencia/${portalVitrine.slug}`}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground transition"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: "var(--accent)" }}
                            />
                            Conferir no portal
                          </Link>
                        )}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══ VERSUS ═══ */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <Reveal>
            <div className="max-w-2xl">
              <Olho>A diferença</Olho>
              <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[18ch]">
                Todo mundo manda “solicitar demonstração”.
              </h2>
              <p className="text-muted leading-relaxed mt-5 max-w-[52ch]">
                É assim que se esconde preço. Aqui a conta está aberta — e o
                processo também.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-10 border border-border rounded-2xl overflow-hidden">
              <div
                className="hidden md:grid grid-cols-[1.1fr_1fr_1fr] text-xs font-mono uppercase tracking-wider text-muted border-b border-border"
                style={{ background: "var(--card)" }}
              >
                <div className="px-5 py-3">Você quer saber</div>
                <div className="px-5 py-3 border-l border-border">Nas incumbentes</div>
                <div
                  className="px-5 py-3 border-l border-border"
                  style={{ color: "var(--accent-claro)" }}
                >
                  No CidadeIA
                </div>
              </div>

              {VERSUS.map((v) => (
                <div
                  key={v.pergunta}
                  className="grid md:grid-cols-[1.1fr_1fr_1fr] border-b border-border last:border-b-0"
                >
                  <div className="px-5 py-4 font-semibold text-sm">{v.pergunta}</div>
                  <div className="px-5 py-4 text-sm text-muted leading-relaxed md:border-l border-border">
                    {v.eles}
                  </div>
                  <div
                    className="px-5 py-4 text-sm leading-relaxed md:border-l border-border"
                    style={{ background: "var(--accent-tint)" }}
                  >
                    {v.nos}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══ PROPOSTA ═══ */}
        <section id="proposta" className="border-y border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <Reveal>
              <div className="text-center flex flex-col items-center gap-4 mb-10">
                <Olho centrado>Proposta</Olho>
                <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02]">
                  Monte a sua e veja se cabe na dispensa.
                </h2>
                <p className="text-muted leading-relaxed max-w-[52ch]">
                  Porte do município mais os módulos que vão ser usados. O total
                  anual aparece na hora — é ele que decide o caminho da
                  contratação, não o mensal.
                </p>
              </div>
            </Reveal>
            {/* Todo o conteúdo do antigo cartão do herói, inteiro, no lugar
                onde ele trabalha: encostado no preço. Aqui o limite responde
                "e eu posso comprar isso?"; lá em cima ele perguntava "quer
                gastar 65 mil sem licitar?" antes de dizer o que o produto é. */}
            <Reveal delay={80}>
              <div className="vidro rounded-2xl p-6 sm:p-7 mb-6 grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-8">
                <div className="shrink-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">
                    Limite de dispensa · {LIMITE_DISPENSA.ano}
                  </p>
                  <p className="font-serif text-[2.4rem] leading-none font-extrabold tracking-[-0.05em] mt-2.5 tabular-nums">
                    {formatarMoedaExata(LIMITE_DISPENSA.valor)}
                  </p>
                  <p className="text-xs text-muted mt-2">por contratação, no exercício</p>
                </div>

                <div className="sm:border-l border-border sm:pl-8">
                  <ul className="flex flex-col gap-2.5">
                    {[
                      "Contratação direta, sem edital",
                      "Termo de referência já redigido",
                      LIMITE_DISPENSA.base,
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm leading-snug">
                        <IconCheck
                          className="w-4 h-4 shrink-0 mt-0.5"
                          style={{ color: "var(--accent)" }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted leading-relaxed border-t border-border pt-4 mt-4">
                    Atualizado pelo {LIMITE_DISPENSA.atualizadoPor}, vigente desde{" "}
                    {LIMITE_DISPENSA.vigenteDesde} e reajustado todo ano. É vedado
                    fracionar a despesa para caber no limite: o que conta é o total
                    anual do objeto.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <MontadorProposta />
            </Reveal>
          </div>
        </section>

        {/* ═══ PROVA E AUTORIDADE ═══
            Eram DUAS seções separadas — "Não peça fé, abra e confira" e "Não
            temos cem prefeituras para mostrar" — dizendo a mesma coisa com
            palavras diferentes, e ainda separadas por uma terceira seção no
            meio, o que fazia a repetição parecer desorganização.

            Fundidas: uma admissão, uma prova clicável e uma lista do que dá
            para conferir. Saíram junto os três cartões de canais, que
            repetiam o que as capacidades do módulo Essencial já detalham logo
            acima.

            O formato também muda de propósito. Depois de quatro seções em
            grade de cartões, mais uma grade some no meio das outras — aqui é
            lista, para o olho ter onde descansar. */}
        <section className="border-y border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <div className="grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16">
              <Reveal>
                <div>
                  <Olho>Quem está do outro lado</Olho>
                  <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[18ch]">
                    Não temos cem prefeituras para mostrar.
                  </h2>
                  <p className="text-muted leading-relaxed mt-5 max-w-[46ch]">
                    O CidadeIA é novo, e não vamos pendurar aqui logotipo de
                    município que não é cliente. Autoridade emprestada quebra na
                    primeira checagem do jurídico. Em vez disso: abra e confira.
                  </p>

                  {/* A prova clicável fica junto da admissão, não numa seção
                      própria. Município de verdade, nome na tela, endereço que
                      responde — o mais perto de um muro de logos que dá para
                      fazer com honestidade. */}
                  {/* Sem nenhum portal, isto virava um "abrir um portal →"
                      solto apontando para a página vazia. A seção inteira
                      dizia "abra e confira" e entregava nada para abrir.

                      Enquanto o primeiro município não sobe, o convite é o
                      Raio-X — que responde de verdade, sobre a prefeitura de
                      quem está lendo. */}
                  <div className="flex flex-wrap items-center gap-3 mt-7">
                    {portais.length > 0 ? (
                      <>
                        {portais.slice(0, 3).map((p) => (
                          <Link
                            key={p.slug}
                            href={`/transparencia/${p.slug}`}
                            className="inline-flex items-center gap-2.5 border border-border bg-white/[0.03] hover:bg-white/[0.07] hover:border-brand font-semibold text-sm rounded-xl px-5 py-3 transition"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse-soft"
                              style={{ background: "var(--accent)" }}
                            />
                            {p.municipio} · {p.estado}
                          </Link>
                        ))}
                        <Link
                          href="/transparencia"
                          className="text-sm font-semibold text-muted hover:text-foreground transition"
                        >
                          {portais.length > 3 ? "ver todos" : "abrir um portal"} →
                        </Link>
                      </>
                    ) : (
                      <Link
                        href="/raio-x"
                        className="inline-flex items-center gap-2.5 border border-border bg-white/[0.03] hover:bg-white/[0.07] hover:border-brand font-semibold text-sm rounded-xl px-5 py-3 transition"
                      >
                        Ver o Raio-X do seu município →
                      </Link>
                    )}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <ul className="flex flex-col">
                  {autoridadeVerificavel(Boolean(portalVitrine)).map((a) => (
                    <li
                      key={a.titulo}
                      className="flex gap-3.5 py-4 border-b border-border last:border-b-0 first:pt-0"
                    >
                      <IconCheck
                        className="w-4 h-4 shrink-0 mt-1"
                        style={{ color: "var(--accent)" }}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-snug">{a.titulo}</p>
                        <p className="text-sm text-muted mt-1 leading-relaxed">{a.texto}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6">
                  <Link
                    href="/por-que-cidadeia"
                    className="text-sm font-bold text-brand hover:text-brand-claro transition"
                  >
                    Por que o CidadeIA existe →
                  </Link>
                  <Link
                    href="/proposta"
                    className="text-sm font-semibold text-muted hover:text-foreground transition"
                  >
                    Falar com quem construiu
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>


        {/* ═══ A PORTA DO CIDADÃO ═══
            Era uma SEÇÃO INTEIRA, com título grande, três cartões de direitos
            e botão próprio. Duas coisas erradas nisso.

            A primeira: o morador não deveria precisar atravessar hero de risco
            fiscal, módulos, tabela comparativa e calculadora de preço para
            achar o que é dele. O conteúdo mudou para /transparencia, que é a
            página que ele de fato abre — os três direitos, com a lei ao lado,
            agora aparecem ANTES da lista de municípios.

            A segunda: dois públicos disputavam a mesma rolagem. O secretário
            de fazenda e o morador liam a mesma página, e nenhum dos dois tinha
            caminho claro. Separar deu a cada um o seu.

            Sobra aqui esta faixa, e ela tem trabalho: quem compra precisa
            saber que existe o outro lado — é metade do argumento de
            conformidade. Uma faixa diz isso em duas linhas; uma seção gastava
            uma tela inteira para dizer o mesmo. */}
        <section className="border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-4">
                <p className="text-sm text-muted leading-relaxed max-w-[62ch]">
                  <span className="text-foreground font-semibold">
                    O morador tem entrada própria.
                  </span>{" "}
                  Ver para onde vai o dinheiro, acompanhar um pedido pelo número
                  e denunciar sem se identificar — sem cadastro, sem login e sem
                  passar por esta página de vendas.
                </p>
                <Link
                  href="/transparencia"
                  className="shrink-0 text-sm font-semibold text-muted hover:text-brand-claro transition"
                >
                  Portal do cidadão&nbsp;&nbsp;→
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ COMO SAI DO PAPEL — resumo ═══
            Aqui havia uma tela e meia: os três caminhos legais, o kit
            baixável e os quatro passos da implantação. Tudo isso continua
            existindo, em /como-contratar. A home fica com os quatro passos,
            que respondem à única pergunta que cabe aqui — "e depois que eu
            decidir?" — e manda para a página quem quiser o resto. */}
        <section id="como-contratar" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 mb-8">
              <div>
                <Olho>Como sai do papel</Olho>
                <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[20ch]">
                  Da assinatura ao portal no ar.
                </h2>
              </div>
              <p className="text-sm text-muted leading-relaxed max-w-xs">
                Sem licitação de infraestrutura, sem servidor na prefeitura e
                sem equipe de tecnologia dedicada.
              </p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {IMPLANTACAO.map((p, i) => (
              <Reveal key={p.n} delay={i * 90}>
                <div
                  className="h-full border rounded-2xl p-6 flex flex-col gap-3"
                  style={{
                    background: p.fim ? "var(--accent-tint)" : "var(--card)",
                    borderColor: p.fim ? "var(--info-borda)" : "var(--border)",
                  }}
                >
                  <span
                    className="font-serif text-sm font-extrabold tracking-widest"
                    style={{ color: p.fim ? "var(--accent-claro)" : "var(--brand-claro)" }}
                  >
                    {p.n}
                  </span>
                  <h3 className="font-semibold text-sm">{p.titulo}</h3>
                  <p className="text-sm text-muted leading-relaxed">{p.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-8 text-sm font-semibold">
              <Link href="/como-contratar" className="text-muted hover:text-brand-claro transition">
                Os três caminhos legais e o kit pronto&nbsp;&nbsp;→
              </Link>
              <Link href="/conformidade" className="text-muted hover:text-brand-claro transition">
                O que a lei exige, exigência por exigência&nbsp;&nbsp;→
              </Link>
            </div>
          </Reveal>
        </section>
        {/* ═══ FECHO ═══ */}
        <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-20 sm:pb-28">
          <Reveal>
            <div className="vidro rounded-3xl p-10 sm:p-14 text-center">
              <span
                className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.12em] rounded-full px-4 py-2 border mb-6"
                style={{
                  color: "var(--medio)",
                  background: "var(--medio-tint)",
                  borderColor: "var(--medio-borda)",
                }}
              >
                O exercício de {LIMITE_DISPENSA.ano} não espera
              </span>

              <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] max-w-[20ch] mx-auto">
                Leve o processo pronto para a próxima reunião.
              </h2>

              <p className="text-muted leading-relaxed mt-5 max-w-[46ch] mx-auto">
                Proposta com o valor anual, termo de referência, minuta de
                contrato e certidões — no mesmo e-mail, sem reunião antes.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                <Link
                  href="/proposta"
                  className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-7 py-4 transition shadow-elevated"
                >
                  Receber proposta e kit&nbsp;&nbsp;→
                </Link>
                {/* Aqui havia "Criar conta grátis". A conta é criada mesmo,
                    mas nasce sem nenhum módulo, e o botão de ativar aponta
                    para um checkout que ainda não existe
                    (VARIAVEL_AMBIENTE_POR_PLANO em lib/planos.ts cai numa URL
                    de exemplo). Era a segunda ação mais visível da página
                    levando a um beco sem saída. Volta quando o checkout
                    estiver configurado. */}
                <Link
                  href="/kit"
                  className="border border-border bg-white/[0.03] hover:bg-white/[0.07] font-semibold text-sm rounded-xl px-6 py-4 transition"
                >
                  Só o kit, por enquanto
                </Link>
              </div>

              <p className="text-xs text-muted mt-5">
                Sem compromisso · o kit baixa sem cadastro
              </p>
            </div>
          </Reveal>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}

/**
 * Linha etiquetada dentro do card de módulo.
 *
 * Separa visualmente o que é regra determinística ("Automático") do que é
 * chamada ao modelo ("IA"). Fundir as duas na mesma frase venderia um `if`
 * como inteligência artificial.
 */
function SeloLinha({
  rotulo,
  tom,
  children,
}: {
  rotulo: string;
  tom: "accent" | "brand";
  children: React.ReactNode;
}) {
  const cor = tom === "accent" ? "var(--accent-claro)" : "var(--brand-claro)";
  const fundo = tom === "accent" ? "var(--accent-tint)" : "var(--brand-tint)";
  return (
    <div className="flex gap-3 items-start">
      <span
        className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 shrink-0"
        style={{ background: fundo, color: cor }}
      >
        {rotulo}
      </span>
      <p className="text-sm text-muted leading-relaxed">{children}</p>
    </div>
  );
}

/** Olho editorial: rótulo curto com um traço, marcando o início da seção. */
