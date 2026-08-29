import Link from "next/link";
import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/sessao";
import { PLANOS_ADDON } from "@/lib/planos";
import { LIMITE_DISPENSA, CAMINHOS } from "@/lib/contratacao";
import { formatarMoeda, formatarMoedaExata } from "@/lib/formatadores";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import MontadorProposta from "@/components/site/MontadorProposta";
import {
  IconCheck,
  IconAlertas,
  IconVisaoGeral,
  IconSaude,
  IconEducacao,
  IconObras,
  IconLicitacoes,
  IconDownload,
  IconIA,
  IconHistorico,
} from "@/components/icons";

// A ordem desta página é a ordem em que uma prefeitura decide comprar:
// 1. posso contratar? → 2. quanto custa? → 3. quem monta o processo? →
// 4. funciona mesmo? → 5. e as objeções? → 6. a lei está atendida?
// As incumbentes escondem preço e mandam "solicitar demonstração"; responder
// isso por escrito é o que temos de diferente.

const ICONE_ADDON: Record<string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  essencial: IconAlertas,
  gestao: IconVisaoGeral,
  saude: IconSaude,
  educacao: IconEducacao,
  obras: IconObras,
  licitacoes: IconLicitacoes,
};

const CANAIS_PUBLICOS = [
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
    texto: "Denúncia sem identificação, com protocolo não sequencial — como exige a lei.",
  },
];

const KIT = [
  { nome: "Termo de referência", detalhe: "Modelo pronto para editar", pronto: false },
  { nome: "Minuta de contrato", detalhe: "Com prazo, reajuste e rescisão", pronto: false },
  { nome: "Certidões de regularidade", detalhe: "Federal, FGTS, trabalhista e estadual", pronto: false },
  { nome: "Acordo de tratamento de dados", detalhe: "LGPD — município como controlador", pronto: false },
  { nome: "Acordo de nível de serviço", detalhe: "Disponibilidade e prazo de suporte", pronto: false },
  { nome: "Exportação dos dados", detalhe: "JSON e CSV, a qualquer momento", pronto: true },
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
      "A importação dos dados existentes é feita junto com a implantação. Não é preciso desligar o sistema antigo antes — os dois podem rodar em paralelo na transição.",
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
      "O município é o controlador dos dados; nós somos operadores. Os dados de cada município ficam isolados no próprio banco, não apenas na aplicação.",
  },
  {
    pergunta: "E se a prefeitura quiser sair?",
    resposta:
      "Rescisão prevista em contrato. Os dados saem inteiros, em formato aberto. Prender dado de município para segurar contrato é problema, não modelo de negócio.",
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
    entrega: "Dados de cada município isolados no banco, senhas com hash e acesso por perfil.",
  },
  {
    exigencia: "Prestação de contas",
    lei: "Tribunal de Contas do Estado",
    entrega: "Relatório executivo em PDF da prefeitura ou de uma secretaria, sem limite de geração.",
  },
];

const IMPLANTACAO = [
  { n: "1", titulo: "Processo montado", texto: "Com o termo de referência e as certidões do kit." },
  { n: "2", titulo: "Cadastro e módulos", texto: "CNPJ, dados do município e as áreas contratadas." },
  { n: "3", titulo: "Acessos e importação", texto: "Cada secretário na própria área; dados antigos importados." },
  { n: "4", titulo: "Portal no ar", texto: "O endereço de transparência do município passa a responder." },
];

export default async function LandingPage() {
  const sessao = await lerSessao();
  if (sessao) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SiteHeader />

      {/* ═══ HERO — responde "posso contratar?" antes de qualquer outra coisa ═══ */}
      <section className="relative overflow-hidden text-white" style={{ background: "var(--gradient-hero)" }}>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 w-[38rem] h-[38rem] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 65%)" }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-16 grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-12 items-center">
          <Reveal>
            <div className="flex flex-col gap-5">
              <span className="self-start text-xs font-bold uppercase tracking-[0.1em] rounded-full px-4 py-1.5 border border-white/25 bg-white/10">
                {LIMITE_DISPENSA.base}
              </span>
              <h1 className="font-serif text-[2.4rem] leading-[1.08] sm:text-5xl sm:leading-[1.07] font-extrabold tracking-[-0.035em]">
                Sua prefeitura pode contratar hoje, por dispensa de licitação.
              </h1>
              <p className="text-white/80 text-base sm:text-lg leading-relaxed max-w-xl">
                Abaixo do limite anual de dispensa, a contratação é direta — sem
                edital, sem pregão e sem esperar o próximo exercício. Monte a
                proposta da sua prefeitura e veja na hora se ela cabe no limite.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <Link
                  href="#proposta"
                  className="bg-white text-[color:var(--brand-profundo)] font-bold text-sm rounded-xl px-6 py-3.5 hover:opacity-90 transition"
                >
                  Montar minha proposta
                </Link>
                <Link
                  href="#kit"
                  className="border-[1.5px] border-white/35 font-semibold text-sm rounded-xl px-5 py-3.5 hover:bg-white/10 transition"
                >
                  Ver o kit de contratação
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Cartão do limite — o número que o secretário precisa citar. */}
          <Reveal delay={140}>
            <div className="bg-card text-foreground rounded-2xl p-6 shadow-[var(--shadow-lg)]">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Limite de dispensa em {LIMITE_DISPENSA.ano}
              </p>
              <p className="font-serif text-[2.35rem] leading-none font-extrabold tracking-[-0.04em] mt-3">
                {formatarMoedaExata(LIMITE_DISPENSA.valor)}
              </p>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                por contratação, no exercício — para serviços e compras em geral.
              </p>
              <div className="h-px bg-border my-4" />
              <ul className="flex flex-col gap-2">
                {["Sem edital e sem pregão", "Dispensa eletrônica, processo curto", "Termo de referência já pronto"].map(
                  (item) => (
                    <li key={item} className="flex gap-2.5 text-sm text-muted leading-snug">
                      <IconCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                      {item}
                    </li>
                  )
                )}
              </ul>
              <p className="text-xs text-muted leading-relaxed border-t border-border pt-3 mt-4">
                Valor atualizado pelo {LIMITE_DISPENSA.atualizadoPor}, vigente desde{" "}
                {LIMITE_DISPENSA.vigenteDesde} — reajustado todo ano. É vedado
                fracionar a despesa para caber no limite: o que conta é o total
                anual do objeto.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ COMO CONTRATAR ═══ */}
      <section id="como-contratar" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
        <Reveal>
          <div className="text-center flex flex-col items-center gap-3 mb-10">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand">Como contratar</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-[-0.03em]">
              Três caminhos legais, todos previstos em lei
            </h2>
            <p className="text-muted leading-relaxed max-w-2xl">
              Nenhuma prefeitura precisa inventar um processo para contratar o
              CidadeIA. Escolha o que cabe no orçamento e no calendário.
            </p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {CAMINHOS.map((c, i) => {
            const destaque = c.chave === "dispensa";
            return (
              <Reveal key={c.chave} delay={i * 90}>
                <div
                  className={`h-full flex flex-col gap-3 rounded-2xl border p-6 card-interactive ${
                    destaque ? "border-[color:var(--accent)] bg-accent-tint" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="w-11 h-11 arco-card-sm flex items-center justify-center text-white"
                      style={{ background: destaque ? "var(--accent)" : "var(--brand)" }}
                    >
                      {destaque ? <IconCheck className="w-5 h-5" /> : <IconLicitacoes className="w-5 h-5" />}
                    </span>
                    {destaque && (
                      <span
                        className="text-xs font-bold rounded-full px-3 py-1"
                        style={{ color: "var(--accent)", background: "var(--card)" }}
                      >
                        Mais rápido
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-xl font-bold">{c.nome}</h3>
                  <p className="text-sm text-muted leading-relaxed flex-1">{c.resumo}</p>
                  <p className="text-xs font-bold text-brand border-t border-border pt-3 mt-1">{c.base}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ═══ MONTADOR ═══ */}
      <section id="proposta" className="border-y border-border" style={{ background: "var(--superficie)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
          <Reveal>
            <div className="text-center flex flex-col items-center gap-3 mb-9">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand">Proposta</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-[-0.03em]">
                Monte a proposta e veja se cabe na dispensa
              </h2>
              <p className="text-muted leading-relaxed max-w-2xl">
                Porte do município mais os módulos que vão ser usados. O valor
                mensal e o total anual aparecem na hora.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <MontadorProposta />
          </Reveal>
        </div>
      </section>

      {/* ═══ KIT DE CONTRATAÇÃO ═══ */}
      <section id="kit" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
        <div className="grid lg:grid-cols-[380px_1fr] gap-10 lg:gap-14 items-center">
          <Reveal>
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand">Kit de contratação</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] leading-tight">
                O processo pronto, para o jurídico só conferir
              </h2>
              <p className="text-muted leading-relaxed">
                O que trava a assinatura quase nunca é a decisão — é o servidor
                que precisa montar o processo do zero. Então entregamos o
                processo montado.
              </p>
              <Link
                href="/suporte?assunto=kit"
                className="self-start bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-5 py-3 transition shadow-elevated mt-1"
              >
                Pedir o kit
              </Link>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-3">
            {KIT.map((item, i) => (
              <Reveal key={item.nome} delay={i * 60}>
                <div className="h-full bg-card border border-border rounded-2xl p-5 flex items-center gap-4 card-interactive">
                  <span
                    className="w-10 h-10 arco-card-sm flex items-center justify-center shrink-0"
                    style={{
                      background: item.pronto ? "var(--accent-tint)" : "var(--brand-tint)",
                      color: item.pronto ? "var(--accent)" : "var(--brand)",
                    }}
                  >
                    <IconDownload className="w-[18px] h-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{item.nome}</p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{item.detalhe}</p>
                  </div>
                  {item.pronto && (
                    <span
                      className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
                      style={{ color: "var(--accent)", background: "var(--accent-tint)" }}
                    >
                      No ar
                    </span>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PROVA ═══ */}
      <section className="text-white" style={{ background: "var(--brand-profundo)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20 grid lg:grid-cols-[400px_1fr] gap-10 lg:gap-14 items-center">
          <Reveal>
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "#6ee7b0" }}>
                Prova
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-[-0.03em]">
                Não peça fé. Abra e confira.
              </h2>
              <p className="text-white/75 leading-relaxed">
                Os três canais públicos estão no ar agora e abrem sem login.
                Antes de assinar qualquer coisa, o secretário pode entrar pelo
                celular e ver o sistema funcionando.
              </p>
              <Link
                href="/transparencia"
                className="self-start bg-white text-[color:var(--brand-profundo)] font-bold text-sm rounded-xl px-5 py-3 hover:opacity-90 transition mt-1"
              >
                Abrir um portal publicado
              </Link>
            </div>
          </Reveal>

          <div className="flex flex-col gap-3">
            {CANAIS_PUBLICOS.map((c, i) => (
              <Reveal key={c.titulo} delay={i * 90}>
                <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 flex items-center gap-4">
                  <span
                    className="w-11 h-11 arco-card-sm flex items-center justify-center shrink-0"
                    style={{ background: "rgba(110,231,176,0.14)", color: "#6ee7b0" }}
                  >
                    <IconCheck className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{c.titulo}</h3>
                    <p className="text-sm text-white/70 mt-1 leading-relaxed">{c.texto}</p>
                  </div>
                  <span
                    className="shrink-0 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#6ee7b0" }}
                  >
                    ● No ar
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOLUÇÕES ═══ */}
      <section id="solucoes" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand">Soluções</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-[-0.03em]">
                Um módulo para cada área
              </h2>
            </div>
            <p className="text-sm text-muted leading-relaxed max-w-sm">
              Contratação avulsa: um município de 8 mil habitantes não paga pelo
              que uma capital usa.
            </p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLANOS_ADDON.map((p, i) => {
            const Icone = ICONE_ADDON[p.chave];
            const destaque = p.chave === "essencial";
            return (
              <Reveal key={p.chave} delay={i * 60}>
                <div
                  className={`h-full flex flex-col gap-3 rounded-2xl border p-6 bg-card card-interactive ${
                    destaque ? "border-brand" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="w-11 h-11 arco-card-sm flex items-center justify-center"
                      style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                    >
                      <Icone className="w-5 h-5" />
                    </span>
                    {destaque && (
                      <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 bg-brand-tint text-brand">
                        Mais contratado
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-xl font-bold">{p.nome}</h3>
                  <p className="text-sm text-muted leading-relaxed flex-1">{p.descricao}</p>
                  <Link
                    href="#proposta"
                    className="text-sm font-bold text-brand hover:text-brand-dark transition border-t border-border pt-3 mt-1"
                  >
                    Ver na proposta →
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ═══ OBJEÇÕES ═══ */}
      <section className="border-y border-border" style={{ background: "var(--superficie)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
          <Reveal>
            <div className="text-center flex flex-col items-center gap-3 mb-10">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand">Antes de assinar</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-[-0.03em]">
                As seis perguntas que travam a contratação
              </h2>
              <p className="text-muted leading-relaxed max-w-2xl">
                Respondidas aqui, por escrito, para você não precisar de uma
                reunião só para ouvir isso.
              </p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-4">
            {OBJECOES.map((o, i) => (
              <Reveal key={o.pergunta} delay={i * 50}>
                <div className="h-full bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-semibold">{o.pergunta}</h3>
                  <p className="text-sm text-muted mt-2 leading-relaxed">{o.resposta}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CONFORMIDADE ═══ */}
      <section id="conformidade" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand">Conformidade legal</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-[-0.03em]">
                O que a lei exige, e o que o sistema entrega
              </h2>
            </div>
            <p className="text-sm text-muted leading-relaxed max-w-xs">
              A seção que o setor jurídico da prefeitura vai abrir antes de aprovar.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="border border-border rounded-2xl overflow-hidden bg-card">
            <div
              className="hidden md:grid grid-cols-[250px_1fr_120px] text-xs font-bold uppercase tracking-wider text-muted border-b border-border"
              style={{ background: "var(--superficie)" }}
            >
              <div className="px-5 py-3">Exigência</div>
              <div className="px-5 py-3">O que o CidadeIA faz</div>
              <div className="px-5 py-3">Situação</div>
            </div>
            {CONFORMIDADE.map((c) => (
              <div
                key={c.exigencia}
                className="grid md:grid-cols-[250px_1fr_120px] gap-1 md:gap-0 border-b border-border last:border-b-0 px-5 py-4 md:p-0"
              >
                <div className="md:px-5 md:py-4">
                  <p className="font-semibold text-sm">{c.exigencia}</p>
                  <p className="text-xs text-muted mt-0.5">{c.lei}</p>
                </div>
                <div className="md:px-5 md:py-4 text-sm text-muted leading-relaxed">{c.entrega}</div>
                <div className="md:px-5 md:py-4">
                  <span
                    className="inline-block text-xs font-bold rounded-full px-3 py-1"
                    style={{ color: "var(--accent)", background: "var(--accent-tint)" }}
                  >
                    No ar
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ═══ IMPLANTAÇÃO ═══ */}
      <section className="border-t border-border" style={{ background: "var(--superficie)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
          <Reveal>
            <div className="flex flex-col gap-3 mb-9">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand">Implantação</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-[-0.03em]">
                Da assinatura ao portal no ar
              </h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {IMPLANTACAO.map((p, i) => {
              const ultimo = i === IMPLANTACAO.length - 1;
              return (
                <Reveal key={p.n} delay={i * 100}>
                  <div
                    className={`h-full bg-card border rounded-2xl p-5 flex flex-col gap-3 ${
                      ultimo ? "border-[color:var(--accent)]" : "border-border"
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-[10px] text-white font-serif font-extrabold text-sm flex items-center justify-center"
                      style={{ background: ultimo ? "var(--accent)" : "var(--brand)" }}
                    >
                      {p.n}
                    </span>
                    <h3 className="font-semibold text-sm">{p.titulo}</h3>
                    <p className="text-sm text-muted leading-relaxed">{p.texto}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Números — só o que é verificável no próprio produto. Contagem de
              municípios atendidos fica de fora até existir contrato assinado. */}
          <Reveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-2xl overflow-hidden mt-6">
              {[
                { n: "6", label: "módulos contratáveis avulso", icone: IconVisaoGeral },
                { n: "3", label: "canais públicos ao cidadão", icone: IconCheck, acento: true },
                { n: "0", label: "servidores na prefeitura", icone: IconHistorico },
                { n: "0", label: "números inventados pela IA", icone: IconIA },
              ].map((item) => (
                <div key={item.label} className="bg-card p-5">
                  <p
                    className="font-serif text-3xl font-extrabold tracking-[-0.04em]"
                    style={{ color: item.acento ? "var(--accent)" : "var(--foreground)" }}
                  >
                    {item.n}
                  </p>
                  <p className="text-xs text-muted mt-1.5 leading-relaxed">{item.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="text-white" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
          <Reveal>
            <div className="flex flex-col gap-4 max-w-xl">
              <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-[-0.035em] leading-tight">
                Leve o processo pronto para a próxima reunião
              </h2>
              <p className="text-white/80 leading-relaxed">
                Você recebe a proposta com os módulos e o valor anual, o termo de
                referência, a minuta de contrato e as certidões — tudo no mesmo
                e-mail, sem precisar de reunião antes.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex flex-col gap-3 w-full sm:w-auto shrink-0">
              <Link
                href="/suporte?assunto=proposta"
                className="bg-white text-[color:var(--brand-profundo)] font-bold text-sm rounded-xl px-6 py-3.5 text-center hover:opacity-90 transition"
              >
                Receber proposta e kit
              </Link>
              <Link
                href="/cadastro"
                className="border-[1.5px] border-white/35 font-semibold text-sm rounded-xl px-6 py-3.5 text-center hover:bg-white/10 transition"
              >
                Criar conta e testar grátis
              </Link>
              <p className="text-xs text-white/60 text-center">
                Sem cartão de crédito · sem instalação
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
