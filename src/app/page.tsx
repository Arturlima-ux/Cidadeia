import Link from "next/link";
import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/sessao";
import { PLANOS_ADDON } from "@/lib/planos";
import { LIMITE_DISPENSA, CAMINHOS } from "@/lib/contratacao";
import { DOCUMENTOS } from "@/lib/kit-contratacao";
import { EXIGENCIAS, BLOCOS, NOME_BLOCO, exigenciasDoBloco } from "@/lib/diagnostico";
import { listarPortaisPublicados } from "@/lib/portais";
import { formatarMoedaExata } from "@/lib/formatadores";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import MontadorProposta from "@/components/site/MontadorProposta";
import BarraConversao from "@/components/site/BarraConversao";
import {
  IconCheck,
  IconAlertas,
  IconVisaoGeral,
  IconSaude,
  IconEducacao,
  IconObras,
  IconLicitacoes,
  IconDownload,
} from "@/components/icons";

// A página responde, na ordem, o que trava uma compra em prefeitura:
// posso contratar? → por que não com a incumbente? → quanto custa? →
// funciona mesmo? → o que exatamente eu levo? → quem monta o processo? →
// e as objeções? → a lei está atendida? → como implanta?
//
// A oferta abre a página em vez de fechá-la: quem chega quer saber se PODE
// comprar antes de saber o que está comprando.

const ICONE_ADDON: Record<string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  essencial: IconAlertas,
  gestao: IconVisaoGeral,
  saude: IconSaude,
  educacao: IconEducacao,
  obras: IconObras,
  licitacoes: IconLicitacoes,
};

// As mesmas quatro leis que o herói nomeia, na ordem em que ele as nomeia.
const CONFORMIDADE_TOPO = [
  "Lei 12.527/2011 · LAI",
  "Lei 13.460/2017 · Ouvidoria",
  "LC 101/2000 · LRF",
  "Lei 13.709/2018 · LGPD",
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
    pergunta: "Se funciona mesmo",
    eles: "Slide e vídeo gravado",
    nos: "Abra e confira — três canais no ar, sem login",
  },
  {
    pergunta: "E se quiser sair",
    eles: "Exportação sob análise",
    nos: "JSON e CSV a qualquer momento, sem custo e sem autorização",
  },
];

const CANAIS = [
  {
    titulo: "Portal da Transparência",
    texto: "Endereço público próprio do município, com receita, despesa e investimentos.",
  },
  {
    titulo: "Protocolo com consulta",
    texto: "Número e chave privada na hora. O cidadão acompanha sozinho, sem ligar.",
  },
  {
    titulo: "Ouvidoria anônima",
    texto: "Denúncia sem identificação e protocolo não sequencial — como exige a lei.",
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
  const sessao = await lerSessao();
  if (sessao) redirect("/dashboard");

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

  return (
    <div className="tema-noite min-h-screen overflow-x-hidden relative">
      {/* atmosfera — profundidade barata, só dois borrões e uma malha */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-64 -left-40 w-[46rem] h-[46rem] rounded-full"
          style={{ background: "rgba(61,134,240,0.18)", filter: "blur(90px)" }}
        />
        <div
          className="absolute -bottom-56 -right-32 w-[38rem] h-[38rem] rounded-full"
          style={{ background: "rgba(47,191,135,0.12)", filter: "blur(90px)" }}
        />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 70% 46% at 50% 0%, #000 10%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 46% at 50% 0%, #000 10%, transparent 72%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <SiteHeader />
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

                <p className="text-muted text-base sm:text-lg leading-relaxed mt-6 max-w-[48ch]">
                  {EXIGENCIAS.length} exigências da Lei de Acesso à Informação,
                  da Lei 13.460, da Lei de Responsabilidade Fiscal e da LGPD.
                  Responda em dois minutos e veja quais o seu município atende —
                  cada pendência sai com o artigo que a cria, antes de aparecer
                  no parecer do Tribunal de Contas.
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
                  <Link
                    href={portalVitrine ? `/transparencia/${portalVitrine.slug}` : "/transparencia"}
                    className="group inline-flex items-center gap-2.5 text-sm font-semibold hover:text-brand-claro transition"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse-soft"
                      style={{ background: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-tint)" }}
                    />
                    {portalVitrine
                      ? `Portal de ${portalVitrine.municipio} · ${portalVitrine.estado}`
                      : "Ver um portal publicado"}
                    <span className="text-muted font-normal group-hover:text-brand-claro transition">
                      — abra sem login
                    </span>
                  </Link>

                  {/* Todas as quatro govtechs que estudamos oferecem falar
                      com gente na primeira dobra. Vender por autoatendimento
                      não significa esconder a pessoa: numa decisão que passa
                      por jurídico e Tribunal de Contas, alguém vai querer
                      perguntar antes de assinar. */}
                  <Link
                    href="/suporte?assunto=proposta"
                    className="text-sm font-semibold text-muted hover:text-foreground transition"
                  >
                    Prefere falar com alguém? →
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

        {/* ═══ SELOS ═══ */}
        <div className="border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {CONFORMIDADE_TOPO.map((s) => (
              <span key={s} className="flex items-center gap-2 text-xs text-muted font-mono">
                <span
                  className="w-[5px] h-[5px] rounded-full shrink-0"
                  style={{ background: "var(--accent)" }}
                />
                {s}
              </span>
            ))}
          </div>
        </div>

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

        {/* ═══ PROVA ═══ */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <Reveal>
            <div className="max-w-2xl">
              <Olho>Prova</Olho>
              <h2 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[20ch]">
                Não peça fé. Abra pelo celular, agora.
              </h2>
              <p className="text-muted leading-relaxed mt-5 max-w-[52ch]">
                Os três canais públicos estão no ar e abrem sem login. Antes de
                assinar qualquer coisa, o secretário confere.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4 mt-10">
            {CANAIS.map((c, i) => (
              <Reveal key={c.titulo} delay={i * 90}>
                <div className="vidro rounded-2xl p-6 h-full">
                  <span
                    className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider"
                    style={{ color: "var(--accent-claro)" }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
                      style={{ background: "var(--accent)" }}
                    />
                    No ar
                  </span>
                  <h3 className="font-serif text-lg font-bold mt-4">{c.titulo}</h3>
                  <p className="text-sm text-muted mt-2 leading-relaxed">{c.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {/* Município de verdade, nome na tela, endereço que responde.
                  É o mais perto de um muro de logos que dá para fazer com
                  honestidade antes de existir uma carteira de clientes. */}
              {portais.slice(0, 4).map((p) => (
                <Link
                  key={p.slug}
                  href={`/transparencia/${p.slug}`}
                  className="inline-flex items-center gap-2.5 border border-border bg-white/[0.03] hover:bg-white/[0.07] hover:border-brand font-semibold text-sm rounded-xl px-5 py-3.5 transition"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "var(--accent)" }}
                  />
                  {p.municipio} · {p.estado}
                </Link>
              ))}
              <Link
                href="/transparencia"
                className="inline-block border border-border bg-white/[0.03] hover:bg-white/[0.07] font-semibold text-sm rounded-xl px-6 py-3.5 transition"
              >
                {portais.length > 4 ? "Ver todos os portais" : "Abrir um portal publicado"}
              </Link>
            </div>
          </Reveal>
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
                <Link
                  href="/diagnostico"
                  className="shrink-0 bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-7 py-4 transition shadow-elevated"
                >
                  Fazer o diagnóstico&nbsp;&nbsp;→
                </Link>
              </div>
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

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
              {PLANOS_ADDON.map((p, i) => {
                const Icone = ICONE_ADDON[p.chave];
                const destaque = p.chave === "essencial";
                return (
                  <Reveal key={p.chave} delay={i * 60}>
                    <div
                      className={`h-full flex flex-col gap-3 rounded-2xl border p-6 card-interactive ${
                        destaque ? "border-brand" : "border-border"
                      }`}
                      style={{ background: "var(--card)" }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="w-11 h-11 arco-card-sm flex items-center justify-center"
                          style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
                        >
                          <Icone className="w-5 h-5" />
                        </span>
                        {destaque && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
                            style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
                          >
                            Mais contratado
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif text-xl font-bold">{p.nome}</h3>
                      <p className="text-sm text-muted leading-relaxed flex-1">{p.descricao}</p>
                      <Link
                        href="#proposta"
                        className="text-sm font-bold text-brand hover:text-brand-claro transition border-t border-border pt-3 mt-1"
                      >
                        Ver na proposta →
                      </Link>
                    </div>
                  </Reveal>
                );
              })}
            </div>
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
                <Link
                  href="/kit"
                  className="inline-block mt-6 bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-6 py-3.5 transition shadow-elevated"
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
            <div className="grid md:grid-cols-2 gap-4">
              {OBJECOES.map((o, i) => (
                <Reveal key={o.pergunta} delay={i * 50}>
                  <div
                    className="h-full border border-border rounded-2xl p-6"
                    style={{ background: "var(--card)" }}
                  >
                    <h3 className="font-semibold">{o.pergunta}</h3>
                    <p className="text-sm text-muted mt-2.5 leading-relaxed">{o.resposta}</p>
                  </div>
                </Reveal>
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
                <Link
                  href="/cadastro"
                  className="border border-border bg-white/[0.03] hover:bg-white/[0.07] font-semibold text-sm rounded-xl px-6 py-4 transition"
                >
                  Criar conta grátis
                </Link>
              </div>

              <p className="text-xs text-muted mt-5">
                Sem cartão de crédito · leva poucos minutos
              </p>
            </div>
          </Reveal>
        </section>

        <SiteFooter />
      </div>
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
