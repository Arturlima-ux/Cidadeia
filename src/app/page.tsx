import Link from "next/link";
import { lerSessao } from "@/lib/sessao";
import { PLANOS_ADDON } from "@/lib/planos";
import { LIMITE_DISPENSA, CAMINHOS } from "@/lib/contratacao";
import { DOCUMENTOS } from "@/lib/kit-contratacao";
import { EXIGENCIAS, BLOCOS, NOME_BLOCO, exigenciasDoBloco } from "@/lib/diagnostico";
import { modulosNaOrdemDaHome } from "@/lib/modulos-detalhe";
import { listarPortaisPublicados } from "@/lib/portais";
import { formatarMoedaExata } from "@/lib/formatadores";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import MontadorProposta from "@/components/site/MontadorProposta";
import BarraConversao from "@/components/site/BarraConversao";
import PainelDemonstracao from "@/components/site/PainelDemonstracao";
import {
  IconCheck,
  IconAlertas,
  IconVisaoGeral,
  IconSaude,
  IconEducacao,
  IconObras,
  IconLicitacoes,
  IconDownload,
  IconHistorico,
} from "@/components/icons";

// ── A ORDEM DA PÁGINA ──
//
// O que é → o que faz → por que não a incumbente → quanto custa → funciona
// mesmo → quem está do outro lado → como se contrata → a lei está atendida.
//
// O detalhe dos módulos ficava na nona seção, DEPOIS do preço. Quem chegava
// sem saber o que é o CidadeIA — um vereador, um assessor, alguém que não é o
// jurídico — via o valor antes de entender o que estava comprando, e a página
// só fazia sentido para quem já sabia. Agora o produto vem antes da conta.

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

// O que o morador pode fazer, com a lei que garante cada coisa.
//
// A lei aparece de propósito: para o prefeito ela é conformidade a cumprir,
// para o cidadão é o direito que ele tem. Mesmo artigo, leitura oposta — e
// citá-lo aqui muda o tom de "serviço que a prefeitura oferece" para "coisa
// que já é sua".
const DIREITOS_CIDADAO = [
  {
    icone: IconVisaoGeral,
    titulo: "Ver para onde vai o dinheiro",
    texto:
      "Receita, despesa, obras em andamento e licitações do seu município, numa página que abre sem cadastro.",
    lei: "Lei 12.527/2011 · art. 8º",
  },
  {
    icone: IconHistorico,
    titulo: "Acompanhar seu pedido pelo número",
    texto:
      "Abriu um protocolo? Recebe número e chave na hora e acompanha o andamento sozinho, sem ligar para a prefeitura.",
    lei: "Lei 13.460/2017 · art. 10, VI",
  },
  {
    icone: IconAlertas,
    titulo: "Denunciar sem dizer quem você é",
    texto:
      "A ouvidoria aceita manifestação anônima, e o protocolo é aleatório — ninguém consegue descobrir quantas denúncias existem nem chegar às vizinhas.",
    lei: "Lei 13.460/2017 · art. 10",
  },
];

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

const OBJECOES = [
  {
    pergunta: "E se mudar o prefeito?",
    resposta:
      "O contrato é da prefeitura, não da gestão. E os dados são do município: exportação completa em formato aberto a qualquer momento, sem custo e sem pedir autorização.",
  },
  {
    pergunta: "E o que já está no sistema atual?",
    resposta:
      "Importação por planilha, feita junto com a implantação. Não é preciso desligar o sistema antigo antes — os dois rodam em paralelo durante a transição.",
  },
  {
    pergunta: "Quem responde se o sistema cair?",
    resposta:
      "O acordo de nível de serviço vai anexo ao contrato, com disponibilidade e prazo de atendimento definidos, e um canal de suporte nomeado.",
  },
  {
    pergunta: "Precisa de servidor e equipe de TI?",
    resposta:
      "Não. Roda no navegador. Sem servidor na prefeitura, sem licença de sistema operacional, sem licitação de infraestrutura e sem TI dedicada.",
  },
  {
    pergunta: "Como fica a LGPD?",
    resposta:
      "O município é o controlador dos dados; nós somos operadores. O acordo de tratamento vai no kit, e os dados de cada município ficam isolados.",
  },
  {
    pergunta: "E o secretário, vê tudo?",
    resposta:
      "Não. Cada secretário enxerga apenas a própria área. O financeiro consolidado e a administração de usuários ficam restritos ao prefeito.",
  },
];

const CONFORMIDADE = [
  {
    exigencia: "Transparência ativa",
    lei: "Lei 12.527/2011 (LAI)",
    entrega: "Portal público com endereço próprio do município, acessível sem cadastro.",
  },
  {
    exigencia: "Manifestação anônima",
    lei: "Lei 13.460/2017, art. 10",
    entrega:
      "Ouvidoria aceita denúncia sem identificação, com protocolo aleatório — não dá para enumerar denúncias em sequência.",
  },
  {
    exigencia: "Acompanhamento do pedido",
    lei: "Lei 13.460/2017, art. 10, VI",
    entrega: "Número de protocolo e chave privada na hora; o cidadão consulta o andamento sozinho.",
  },
  {
    exigencia: "Proteção de dados",
    lei: "Lei 13.709/2018 (LGPD)",
    entrega: "Dados de cada município isolados, senhas com hash e acesso por perfil.",
  },
  {
    exigencia: "Prestação de contas",
    lei: "Tribunal de Contas do Estado",
    entrega: "Relatório executivo em PDF da prefeitura ou de uma secretaria, sem limite de geração.",
  },
];

const IMPLANTACAO = [
  {
    n: "01",
    titulo: "Processo montado",
    texto: "Com o termo de referência e as certidões que vão no kit.",
  },
  {
    n: "02",
    titulo: "Cadastro e módulos",
    texto: "CNPJ, dados do município e as áreas que a prefeitura vai usar.",
  },
  {
    n: "03",
    titulo: "Acessos e importação",
    texto: "Cada secretário na própria área; os dados do sistema antigo entram por planilha.",
  },
  {
    n: "04",
    titulo: "Portal no ar",
    texto: "O endereço de transparência do município passa a responder.",
    fim: true,
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

  const kitBaixavel = DOCUMENTOS.filter((d) => d.geramos);

  // Prova social é o eixo de conversão de toda govtech estabelecida, e é
  // exatamente o que não temos. O substituto é prova VERIFICÁVEL: em vez de
  // afirmar quantos clientes existem, mostramos portais que qualquer um abre
  // agora. O número sai do banco — nunca é escrito à mão — e quando não há
  // portal (ou o banco não responde) a página convida a conferir sem
  // prometer quantidade nenhuma.
  const { portais } = await listarPortaisPublicados();
  const portalVitrine = portais[0] ?? null;

  // Derivado, nunca escrito à mão: se alguém marcar mais uma exigência como
  // não resolvida, o texto da home acompanha em vez de mentir.
  const naoResolvemos = EXIGENCIAS.filter((e) => !e.resolvemos);
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
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-14 items-center">
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
                  Conformidade · exercício de {LIMITE_DISPENSA.ano}
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
                  Seu município já descumpre a LAI?
                </h1>

                {/* O que o herói NÃO dizia: o que o produto é. Quem lia só a
                    primeira dobra saía achando que o CidadeIA é ferramenta de
                    compliance, e não um sistema de gestão — o gancho da
                    conformidade estava vendendo risco jurídico no lugar da
                    plataforma. O nome do produto agora aparece antes do
                    gancho, e o gancho vira o primeiro passo dentro dele. */}
                <p className="text-foreground text-base sm:text-lg leading-relaxed mt-6 max-w-[50ch]">
                  O CidadeIA é o sistema de gestão da prefeitura: saúde,
                  educação, obras, licitações, transparência e ouvidoria numa
                  base só, com alerta automático por secretaria.
                </p>

                <p className="text-muted text-base leading-relaxed mt-4 max-w-[50ch]">
                  Comece pelo que já está em jogo — {EXIGENCIAS.length}{" "}
                  exigências da LAI, da Lei 13.460, da LRF e da LGPD, cada
                  pendência com o artigo que a cria. Antes de aparecer no
                  parecer do Tribunal de Contas.
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

            {/* O cartão exibia R$ 65.492,11 em corpo 43 — o maior elemento
                da tela era um número que NÃO é o preço do produto. Quem passa
                o olho lê "custa 65 mil". Agora o número grande é a contagem
                de exigências: não é dinheiro, e não dá para ler errado. */}
            <Reveal delay={140}>
              <div className="vidro rounded-2xl p-7">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  O que é verificado
                </p>
                <p className="font-serif text-[3.2rem] leading-none font-extrabold tracking-[-0.05em] mt-3 tabular-nums">
                  {EXIGENCIAS.length}
                </p>
                <p className="text-sm text-muted mt-2">exigências, em quatro blocos</p>

                <ul className="flex flex-col gap-3 mt-6">
                  {BLOCOS.map((b) => {
                    const doBloco = exigenciasDoBloco(b);
                    return (
                      <li key={b} className="flex items-baseline justify-between gap-4">
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold leading-snug">
                            {NOME_BLOCO[b]}
                          </span>
                          <span className="block text-xs font-mono text-muted mt-0.5">
                            {doBloco[0]?.lei.replace(/\s*\(.*\)$/, "")}
                          </span>
                        </span>
                        <span
                          className="text-sm font-bold tabular-nums shrink-0"
                          style={{ color: "var(--accent-claro)" }}
                        >
                          {doBloco.length}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <p className="text-xs text-muted leading-relaxed border-t border-border pt-4 mt-6">
                  {naoResolvemos.length} delas continuam com a prefeitura mesmo
                  contratando o CidadeIA — e estão na lista assim mesmo.
                </p>
              </div>
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

        {/* ═══ O PAINEL ═══
            A página explicava o produto inteiro por texto. Quem chegava sem
            saber o que é o CidadeIA lia sobre conformidade, preço e base legal
            sem nunca ver a tela que está comprando. Aqui ela aparece — e antes
            do detalhe dos módulos, porque a forma vem antes da lista. */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-14 items-center">
            <Reveal>
              <div>
                <Olho>A tela do prefeito</Olho>
                <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[18ch]">
                  Abre mostrando o que precisa de decisão.
                </h2>
                <p className="text-muted leading-relaxed mt-5 max-w-[46ch]">
                  Não é um relatório para procurar. É uma lista curta do que
                  está fora do lugar hoje — com o número, o artigo da lei e o
                  atalho para a tela onde se resolve.
                </p>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <PainelDemonstracao />
            </Reveal>
          </div>
        </section>

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
                    href="/suporte?assunto=proposta"
                    className="text-sm font-semibold text-muted hover:text-foreground transition"
                  >
                    Falar com quem construiu
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>


        {/* ═══ PARA O CIDADÃO ═══
            A página inteira fala com quem compra. Só que o produto tem um
            segundo público que não decide nada e usa mais: o morador que abre
            o portal para consultar um protocolo ou registrar uma denúncia.

            Ele chegava aqui e não encontrava porta — o único caminho era um
            link pequeno na barra utilitária do topo. Esta seção existe para
            ele, e por isso muda de tom: não vende, não cita preço e não pede
            cadastro. Só diz o que dá para fazer e abre a porta.

            Fica DEPOIS da prova de propósito. Quem está avaliando a compra
            acabou de ver os canais funcionando; ver a quem eles servem, em
            seguida, reforça o argumento em vez de interromper. */}
        <section className="border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-center">
              <Reveal>
                <div>
                  <Olho>Para o cidadão</Olho>
                  <h2 className="font-serif text-3xl sm:text-[2.6rem] font-extrabold tracking-[-0.035em] leading-[1.05] mt-5 max-w-[18ch]">
                    Você mora numa cidade que usa o CidadeIA?
                  </h2>
                  <p className="text-muted leading-relaxed mt-5 max-w-[50ch]">
                    Então três coisas são suas por direito, e nenhuma delas
                    depende de pedir favor a ninguém: ver para onde vai o
                    dinheiro, acompanhar um pedido pelo número, e denunciar sem
                    dizer quem você é.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-8">
                    <Link
                      href="/transparencia"
                      className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-7 py-4 transition shadow-elevated"
                    >
                      Abrir o portal da minha cidade&nbsp;&nbsp;→
                    </Link>
                    {portalVitrine && (
                      <Link
                        href={`/transparencia/${portalVitrine.slug}`}
                        className="inline-flex items-center gap-2.5 text-sm font-semibold text-muted hover:text-foreground transition"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse-soft"
                          style={{ background: "var(--accent)" }}
                        />
                        Ver um exemplo: {portalVitrine.municipio}
                      </Link>
                    )}
                  </div>

                  <p className="text-xs text-muted mt-5">
                    Sem cadastro · sem login · sem instalar aplicativo
                  </p>
                </div>
              </Reveal>

              <div className="flex flex-col gap-3">
                {DIREITOS_CIDADAO.map((d, i) => {
                  const Icone = d.icone;
                  return (
                    <Reveal key={d.titulo} delay={i * 80}>
                      <div
                        className="flex gap-4 rounded-2xl border border-border p-5 sm:p-6"
                        style={{ background: "var(--card)" }}
                      >
                        <span
                          className="w-11 h-11 arco-card-sm flex items-center justify-center shrink-0"
                          style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
                        >
                          <Icone className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-semibold leading-snug">{d.titulo}</h3>
                          <p className="text-sm text-muted mt-1.5 leading-relaxed">{d.texto}</p>
                          <p className="text-xs font-mono text-muted mt-2.5">{d.lei}</p>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ DIAGNÓSTICO — lembrete ═══
            Era uma seção inteira, com um cartão que repetia quase palavra por
            palavra o do herói. Agora que a oferta do diagnóstico ABRE a
            página, aqui basta a porta: quem desceu até o preço e não converteu
            ainda tem para onde ir. */}
        <section className="border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
                <div>
                  <Olho>Diagnóstico gratuito</Olho>
                  <h2 className="font-serif text-2xl sm:text-[2rem] font-extrabold tracking-[-0.035em] leading-[1.1] mt-4 max-w-[22ch]">
                    Ainda em dúvida? Comece descobrindo o que já falta.
                  </h2>
                  <p className="text-sm text-muted leading-relaxed mt-3 max-w-[58ch]">
                    {EXIGENCIAS.length} exigências, dois minutos, sem cadastro —
                    inclusive as {naoResolvemos.length} que continuam com a
                    prefeitura mesmo contratando o CidadeIA. Um diagnóstico em
                    que tudo por acaso é resolvido por quem o publicou não é
                    diagnóstico, é proposta comercial disfarçada.
                  </p>
                </div>
                {/* Contornado, não cheio: é o MESMO destino do botão do herói.
                    Repetir o botão cheio faz a página parecer ter dois começos
                    e apaga a hierarquia — sobram só três ações principais na
                    home, cada uma com um trabalho distinto. */}
                <Link
                  href="/diagnostico"
                  className="shrink-0 border border-border font-semibold text-sm rounded-xl px-7 py-4 transition hover:border-brand hover:text-brand-claro"
                >
                  Fazer o diagnóstico&nbsp;&nbsp;→
                </Link>
              </div>
            </Reveal>
          </div>
        </section>


        {/* ═══ KIT ═══ */}
        <section id="kit" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[380px_1fr] gap-10 lg:gap-14 items-center">
            <Reveal>
              <div>
                <Olho>Kit de contratação</Olho>
                <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[16ch]">
                  O jurídico só confere. Não redige.
                </h2>
                <p className="text-muted leading-relaxed mt-5">
                  O que trava a assinatura quase nunca é a decisão — é o servidor
                  que precisa montar o processo do zero. Baixe sem cadastro, leve
                  para a reunião, volte se fizer sentido.
                </p>
                {/* Também contornado: o kit é apoio ao processo, não o passo
                    do funil. O fecho da página é que carrega a ação de
                    converter, e ele já entrega o kit junto da proposta. */}
                <Link
                  href="/kit"
                  className="inline-block mt-6 border border-border font-semibold text-sm rounded-xl px-6 py-3.5 transition hover:border-brand hover:text-brand-claro"
                >
                  Abrir o kit completo
                </Link>
              </div>
            </Reveal>

            <div className="grid sm:grid-cols-2 gap-3">
              {kitBaixavel.map((d, i) => (
                <Reveal key={d.chave} delay={i * 60}>
                  <Link
                    href={`/kit#${d.chave}`}
                    className="h-full flex items-center gap-4 rounded-2xl border border-border p-5 card-interactive hover:border-brand transition"
                    style={{ background: "var(--card)" }}
                  >
                    <span
                      className="w-10 h-10 arco-card-sm flex items-center justify-center shrink-0"
                      style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
                    >
                      <IconDownload className="w-[18px] h-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-sm">{d.nome}</span>
                      <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                        {d.subtitulo}
                      </span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ OBJEÇÕES ═══ */}
        <section className="border-y border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <Reveal>
              <div className="text-center flex flex-col items-center gap-4 mb-10">
                <Olho centrado>Antes de assinar</Olho>
                <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02]">
                  As perguntas que sempre voltam.
                </h2>
                <p className="text-muted leading-relaxed max-w-[52ch]">
                  Respondidas aqui, por escrito, para você não precisar de uma
                  reunião só para ouvir isso.
                </p>
              </div>
            </Reveal>
            {/* Eram seis cartões abertos numa grade, ocupando uma tela inteira
                de respostas que a maioria não estava procurando. Objeção é
                assim: cada leitor tem uma ou duas, não as seis — e quem não
                tem nenhuma só precisa passar por cima.

                Fechadas, a seção cabe em meia tela e as perguntas viram um
                índice varrível. Quem tem a dúvida abre a dela; quem não tem
                rola direto. O conteúdo continua inteiro na página, inclusive
                para busca do navegador, porque <details> não esconde do Ctrl+F
                nem do leitor de tela. */}
            <div className="max-w-3xl mx-auto border-t border-border">
              {OBJECOES.map((o) => (
                <details
                  key={o.pergunta}
                  className="group border-b border-border"
                >
                  <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none font-semibold text-sm sm:text-base hover:text-brand-claro transition">
                    {o.pergunta}
                    <span
                      aria-hidden
                      className="shrink-0 text-lg leading-none transition-transform group-open:rotate-45"
                      style={{ color: "var(--muted)" }}
                    >
                      +
                    </span>
                  </summary>
                  <p className="text-sm text-muted leading-relaxed pb-5 pr-8 -mt-1">
                    {o.resposta}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ COMO CONTRATAR ═══ */}
        <section id="como-contratar" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <Reveal>
            <div className="max-w-2xl">
              <Olho>Como contratar</Olho>
              <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[20ch]">
                Três caminhos legais. Nenhum processo inventado.
              </h2>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-4 mt-10">
            {CAMINHOS.map((c, i) => {
              const destaque = c.chave === "dispensa";
              return (
                <Reveal key={c.chave} delay={i * 80}>
                  <div
                    className="h-full flex flex-col gap-3 rounded-2xl border p-6 card-interactive"
                    style={{
                      background: destaque ? "var(--accent-tint)" : "var(--card)",
                      borderColor: destaque ? "var(--info-borda)" : "var(--border)",
                    }}
                  >
                    {destaque && (
                      <span
                        className="self-start text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
                        style={{ background: "var(--card)", color: "var(--accent-claro)" }}
                      >
                        Mais rápido
                      </span>
                    )}
                    <h3 className="font-serif text-xl font-bold">{c.nome}</h3>
                    <p className="text-sm text-muted leading-relaxed flex-1">{c.resumo}</p>
                    <p
                      className="text-xs font-bold border-t border-border pt-3 mt-1"
                      style={{ color: destaque ? "var(--accent-claro)" : "var(--brand-claro)" }}
                    >
                      {c.base}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ═══ CONFORMIDADE ═══ */}
        <section id="conformidade" className="border-y border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
                <div>
                  <Olho>Conformidade legal</Olho>
                  <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[20ch]">
                    O que a lei exige, e o que o sistema entrega.
                  </h2>
                </div>
                <p className="text-sm text-muted leading-relaxed max-w-xs">
                  A seção que o setor jurídico da prefeitura abre antes de
                  aprovar a contratação.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div className="border border-border rounded-2xl overflow-hidden" style={{ background: "var(--card)" }}>
                <div
                  className="hidden md:grid grid-cols-[260px_1fr_120px] text-xs font-mono uppercase tracking-wider text-muted border-b border-border"
                  style={{ background: "var(--superficie)" }}
                >
                  <div className="px-5 py-3">Exigência</div>
                  <div className="px-5 py-3">O que o CidadeIA faz</div>
                  <div className="px-5 py-3">Situação</div>
                </div>
                {CONFORMIDADE.map((c) => (
                  <div
                    key={c.exigencia}
                    className="grid md:grid-cols-[260px_1fr_120px] gap-1 md:gap-0 px-5 py-4 md:p-0 border-b border-border last:border-b-0"
                  >
                    <div className="md:px-5 md:py-4">
                      <p className="font-semibold text-sm">{c.exigencia}</p>
                      <p className="text-xs text-muted mt-0.5 font-mono">{c.lei}</p>
                    </div>
                    <div className="md:px-5 md:py-4 text-sm text-muted leading-relaxed">
                      {c.entrega}
                    </div>
                    <div className="md:px-5 md:py-4">
                      <span
                        className="inline-block text-xs font-bold rounded-full px-3 py-1"
                        style={{
                          color: "var(--accent-claro)",
                          background: "var(--accent-tint)",
                          border: "1px solid var(--info-borda)",
                        }}
                      >
                        No ar
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ IMPLANTAÇÃO ═══ */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <Reveal>
            <div className="max-w-2xl">
              <Olho>Implantação</Olho>
              <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[18ch]">
                Da assinatura ao portal no ar.
              </h2>
              <p className="text-muted leading-relaxed mt-5 max-w-[52ch]">
                Sem licitação de infraestrutura, sem servidor na prefeitura e sem
                equipe de tecnologia dedicada.
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
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
                  href="/suporte?assunto=proposta"
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
function Olho({ children, centrado }: { children: React.ReactNode; centrado?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-xs font-mono uppercase tracking-[0.16em] ${
        centrado ? "justify-center" : ""
      }`}
      style={{ color: "var(--brand-claro)" }}
    >
      <span className="block w-6 h-px" style={{ background: "currentColor" }} />
      {children}
    </span>
  );
}
