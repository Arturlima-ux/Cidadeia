import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import BarraConversao from "@/components/site/BarraConversao";
import FormularioRaioX from "@/app/raio-x/FormularioRaioX";
import { registrarEvento } from "@/lib/registrar-evento";
import PecaUmaLigacao from "@/components/site/PecaUmaLigacao";
import { linkWhatsappComercial } from "@/lib/contato-comercial";
import { CARGOS } from "@/lib/cargos";
import { compartilhamento } from "@/lib/seo";
import { PANORAMA, mesDoPanorama, numeroBr, passaramDoAlerta } from "@/lib/panorama";

export const metadata = compartilhamento({
  titulo: "Quem somos",
  descricao:
    "A história do CidadeIA: por que nasceu, o que encontrou ao conferir as 5.570 prefeituras no Tesouro Nacional, o que já construiu e as regras que não negocia.",
  caminho: "/quem-somos",
});

// ── QUEM SOMOS: A HISTÓRIA, SEM INVENTAR UMA LINHA ──
//
// A página antiga dizia o que o produto faz, mas não de onde ele veio, e
// uma prefeitura compra de quem ela entende. Aqui a história é contada pelo
// que se pode conferir: a lei que criou o problema, o dado público que ele
// deixa, o que a empresa encontrou ao ler esse dado do país inteiro e o que
// construiu mês a mês. Os números do capítulo de outubro vêm do panorama
// (dados/panorama-rgf.json) e se atualizam sozinhos toda semana.
//
// O fundador não aparece por nome: decisão dele. A empresa fala por si.
//
// ── E A PÁGINA VENDE ──
// Quem abre "Quem somos" está decidindo se confia. Então a história leva a
// uma ação em cada ponto em que a confiança sobe: proposta e Raio-X já na
// abertura, o Raio-X da própria cidade logo depois do capítulo em que o país
// inteiro foi conferido, o que torna a contratação segura, as dúvidas que
// travam a compra e, no fim, proposta ou ligação. A barra de proposta da home
// volta quando a pessoa rola.

const FONTES = [
  "Tesouro Nacional",
  "IBGE",
  "PNCP",
  "DataSUS",
  "INEP",
  "FNDE",
  "Fiocruz",
  "ObrasGov",
  "Transferegov",
];

const ANTES_E_DEPOIS = [
  {
    tema: "Despesa com pessoal",
    sem: "A prefeitura descobre que entrou no limite prudencial quando o alerta do Tribunal chega, e as nomeações já estavam feitas.",
    com: "A régua da LRF a cada RGF, com as vedações que já valem na faixa e o cronograma de recondução quando passa do limite.",
  },
  {
    tema: "Prazos do RREO e do RGF",
    sem: "O atraso aparece quando a transferência voluntária trava.",
    com: "Conferência diária no Tesouro e aviso por e-mail 15 dias antes do prazo e no dia em que atrasar.",
  },
  {
    tema: "Números do relatório",
    sem: "Número que não fecha vira apontamento e retificação.",
    com: "O aviso chega antes, enquanto a correção ainda é um assunto interno.",
  },
  {
    tema: "Saúde e educação",
    sem: "Os mínimos de 15% e 25% conferidos em dezembro, sem tempo de ajustar.",
    com: "Quanto falta aplicar e quanto o ritmo mensal precisa subir, durante o ano.",
  },
  {
    tema: "Transparência e ouvidoria",
    sem: "Portal atualizado à mão quando sobra tempo, e prazo da LAI contado no calendário de parede.",
    com: "Portal no ar e cada manifestação com protocolo e prazo legal contado, com aviso antes de vencer.",
  },
];

const VALORES = [
  {
    titulo: "Só dado oficial",
    texto: "Quando a fonte não responde, a tela diz isso. O vazio nunca é preenchido com estimativa.",
  },
  {
    titulo: "Regra com o artigo ao lado",
    texto: "Todo aviso fiscal sai de regra fixa, com a base legal escrita. Quem decide continua sendo a prefeitura.",
  },
  {
    titulo: "A IA sugere, a pessoa decide",
    texto: "Nenhuma sugestão da inteligência artificial vira alerta oficial sem alguém aprovar.",
  },
  {
    titulo: "Sem vender o que não existe",
    texto: "Cada módulo do site funciona hoje, e qualquer um confere antes de contratar, sem cadastro.",
  },
  {
    titulo: "Feito para a prefeitura pequena",
    texto: "Funciona no navegador, sem instalar nada e sem pedir acesso ao sistema contábil.",
  },
];

const SEGURO = [
  {
    titulo: "Cabe na dispensa de licitação",
    texto: "O processo vai pronto para o jurídico: termo de referência, minuta de contrato, acordo de tratamento de dados e acordo de nível de serviço.",
  },
  {
    titulo: "Mensal, por módulo, sem fidelidade",
    texto: "A prefeitura contrata só o que precisa e encerra qualquer módulo com aviso de 30 dias.",
  },
  {
    titulo: "Nada para instalar",
    texto: "Funciona no navegador e não pede acesso ao sistema contábil: lê o dado público que o município já enviou.",
  },
  {
    titulo: "Proposta em um dia útil",
    texto: "Com o valor de cada módulo e o processo de contratação. Sem reunião obrigatória e sem apresentação de vendas.",
  },
];

const DUVIDAS = [
  {
    pergunta: "Já temos contador e sistema de contabilidade.",
    resposta:
      "O CidadeIA não substitui nenhum dos dois. Ele confere o que o sistema contábil já enviou ao Tesouro: prazo, limite e coerência dos números, todo dia, sem depender de alguém lembrar.",
  },
  {
    pergunta: "Uma empresa nova é segura para a prefeitura?",
    resposta:
      "Tudo o que o site promete pode ser conferido antes de contratar: o Raio-X da sua cidade, a demonstração completa e o panorama do país, sem cadastro. E o contrato é mensal, sem fidelidade.",
  },
  {
    pergunta: "O alerta vai direto para o Tribunal de Contas?",
    resposta:
      "Não. O CidadeIA avisa a prefeitura, e só ela. Nada é publicado nem enviado a órgão de controle; a decisão continua com quem tem a competência.",
  },
  {
    pergunta: "Não temos equipe de TI.",
    resposta:
      "Não precisa. Os dados entram sozinhos das bases oficiais, e cada secretário tem o próprio acesso, só à sua área.",
  },
];

export default async function QuemSomosPage() {
  await registrarEvento({ tipo: "visita", caminho: "/quem-somos" });
  const b = PANORAMA.brasil;
  const mes = mesDoPanorama();
  const passaram = passaramDoAlerta(b);

  // A trajetória. Cada capítulo é verificável: a lei pela data, os números
  // pelo panorama público, o produto pelo próprio site.
  const CAPITULOS = [
    {
      quando: "2000",
      titulo: "A lei cria a régua",
      texto:
        "A Lei de Responsabilidade Fiscal estabelece os limites da despesa com pessoal, os prazos do RREO e do RGF e as três assinaturas que respondem por eles: prefeito, finanças e controle interno.",
    },
    {
      quando: "Desde então",
      titulo: "O dado fica público, e ninguém olha a tempo",
      texto:
        "Tudo o que a prefeitura declara vai para o Tesouro Nacional e fica aberto a qualquer um. Mas quem confere de verdade é o Tribunal de Contas, e ele julga depois que o exercício fechou: quando o limite já estourou e o prazo já venceu.",
    },
    {
      quando: "2026",
      titulo: "O CidadeIA começa com uma pergunta",
      texto:
        "Se o dado já é público, por que a prefeitura só descobre o problema pelo apontamento? A resposta virou o produto: ler o que o município já envia ao Tesouro, todo dia, e avisar enquanto ainda dá para corrigir.",
    },
    {
      quando: `Outubro de 2026`,
      titulo: "O país inteiro conferido",
      texto: `Lemos o RGF das ${numeroBr(b.municipios)} prefeituras do país. Na conferência de ${mes}, ${numeroBr(
        passaram
      )} já tinham passado do sinal de alerta da despesa com pessoal, ${numeroBr(b.acimaDoLimite)} estavam acima do limite da lei, ${numeroBr(
        b.rgfAtrasado
      )} tinham o RGF vencido sem entrega e ${numeroBr(b.numerosQueNaoFecham)} declararam números que não fecham. O problema não era hipótese.`,
      link: { href: "/panorama", rotulo: "Ver o panorama" },
    },
    {
      quando: "Outubro de 2026",
      titulo: "Seis módulos que trabalham sozinhos",
      texto:
        "Essencial, Gestão, Saúde, Educação, Obras e Licitações passam a ler as bases oficiais toda semana, sem ninguém digitar: entregas e despesa com pessoal no Tesouro, contratos no PNCP, unidades no DataSUS, mínimos da educação no FNDE, dengue na Fiocruz e obras federais no ObrasGov.",
      link: { href: "/solucoes", rotulo: "Conhecer os módulos" },
    },
    {
      quando: "Outubro de 2026",
      titulo: "O morador entra na conversa",
      texto:
        "O portal do cidadão ganha protocolo e ouvidoria com prazo legal contado, a pergunta respondida em uma frase, o serviço mais perto de casa e a avaliação de cada resposta da prefeitura.",
      link: { href: "/transparencia", rotulo: "Abrir o portal" },
    },
    {
      quando: "Agora",
      titulo: "O próximo capítulo é com as prefeituras",
      texto:
        "Cada prefeitura que entra muda o produto: é assim que os avisos ficam mais certeiros e as telas, mais simples. O que mudou fica registrado, com data, nas notícias.",
      link: { href: "/noticias", rotulo: "Ver as notícias" },
    },
  ];

  const NUMEROS = [
    { valor: numeroBr(b.municipios), texto: "prefeituras conferidas no Tesouro toda semana" },
    { valor: numeroBr(passaram), texto: `já passaram do alerta da despesa com pessoal (${mes})` },
    { valor: String(FONTES.length), texto: "bases oficiais lidas, sem digitação" },
    { valor: "0", texto: "programas para instalar na prefeitura" },
  ];

  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        {/* ═══ ABERTURA ═══
            As ações ficam ao lado do texto, e não embaixo das fontes: num
            notebook com zoom, embaixo era a segunda tela, e a primeira
            terminava sem nenhum botão. */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-10 sm:pt-14 pb-16">
          <Olho>Quem somos</Olho>
          <h1 className="titulo-pagina mt-4 max-w-[24ch]">
            Nascemos de uma pergunta: por que a prefeitura só descobre o problema quando o Tribunal aponta?
          </h1>
          <div className="mt-7 grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-10 lg:gap-16">
            <div>
              <p className="text-lg text-muted leading-relaxed max-w-[60ch]">
                Somos uma empresa brasileira de tecnologia para a gestão municipal. Lemos o que cada prefeitura já declara
                ao Tesouro Nacional e avisamos antes do limite, do prazo e do apontamento, com o artigo de lei ao lado.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link
                  href="/proposta"
                  className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5"
                >
                  Receber a proposta
                </Link>
                <a href="#raio-x" className="inicio-sublinhado text-muted">
                  Ver o que o Tesouro mostra da minha cidade
                </a>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                {["Proposta em um dia útil", "Cabe na dispensa de licitação", "Mensal, sem fidelidade", "Nada para instalar"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--info)" }} aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:border-l border-border lg:pl-10 self-start">
              <p className="text-sm text-muted">Lemos direto de</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {FONTES.map((f) => (
                  <li key={f} className="rounded-full border border-border px-3 py-1.5 text-sm">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ═══ NOSSA HISTÓRIA ═══ */}
        <section className="border-t border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-10 lg:gap-16">
              <div className="lg:sticky lg:top-28 self-start">
                <h2 className="inicio-h2 max-w-[14ch]">Nossa história.</h2>
                <p className="text-muted mt-4 leading-relaxed max-w-[40ch]">
                  Da lei de 2000 ao painel de hoje. Cada passo pode ser conferido: a lei pela data, os números pelo
                  panorama público, o produto pelo próprio site.
                </p>
              </div>
              <ol className="relative">
                {/* O fio da linha do tempo. */}
                <span className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: "var(--border)" }} aria-hidden />
                {CAPITULOS.map((c, i) => (
                  <li key={c.titulo} className="relative pl-10 pb-10 last:pb-0">
                    <span
                      className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2"
                      style={{
                        borderColor: "var(--brand)",
                        background: i === CAPITULOS.length - 1 ? "var(--brand)" : "var(--superficie)",
                      }}
                      aria-hidden
                    />
                    <p className="text-sm font-medium tabular-nums" style={{ color: "var(--brand-claro)" }}>
                      {c.quando}
                    </p>
                    <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em]">{c.titulo}</h3>
                    <p className="mt-2 text-muted leading-relaxed max-w-[62ch]">{c.texto}</p>
                    {c.link && (
                      <Link href={c.link.href} className="inicio-sublinhado inline-block mt-3 text-sm">
                        {c.link.rotulo}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ═══ E A SUA CIDADE? ═══
            O capítulo de outubro termina com o país inteiro conferido. A
            pergunta seguinte é a do visitante, e a resposta sai aqui mesmo,
            sem trocar de página: o Raio-X da cidade dele, com o pedido de
            contato e as soluções que o próprio resultado sugere. */}
        <section id="raio-x" className="scroll-mt-24 max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="inicio-h2 max-w-[14ch]">E a sua cidade?</h2>
              <p className="text-muted mt-4 leading-relaxed max-w-[40ch]">
                Veja agora o que a sua prefeitura já publicou no Tesouro: receita, aplicação em saúde, educação e obras,
                e os relatórios que faltam. Sem cadastro, em alguns segundos.
              </p>
            </div>
            <div className="min-w-0">
              <FormularioRaioX />
            </div>
          </div>
        </section>

        {/* ═══ EM NÚMEROS ═══ */}
        <section className="border-t border-border" style={{ background: "var(--superficie)" }}>
         <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <h2 className="inicio-h2 max-w-[18ch]">Em números.</h2>
          <p className="text-muted mt-4 max-w-[60ch] leading-relaxed">
            Nenhum número de vitrine: cada um vem do Tesouro Nacional e se confere no panorama, com data e fonte.
          </p>
          <ul className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {NUMEROS.map((n) => (
              <li key={n.texto} className="border-t border-border pt-5">
                <p className="text-4xl sm:text-5xl font-semibold tabular-nums tracking-[-0.045em]">{n.valor}</p>
                <p className="mt-2 text-sm text-muted leading-relaxed max-w-[26ch]">{n.texto}</p>
              </li>
            ))}
          </ul>
          <Link href="/panorama" className="inicio-sublinhado inline-block mt-10 text-sm">
            Ver o panorama completo, por estado
          </Link>
         </div>
        </section>

        {/* ═══ O QUE MUDA ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <h2 className="inicio-h2 max-w-[20ch]">O que muda na prefeitura.</h2>
          <div className="mt-10 rounded-[28px] border border-border overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,4fr)] text-sm text-muted" style={{ background: "var(--superficie)" }}>
              <p className="px-6 py-4">Onde</p>
              <p className="px-6 py-4">Sem aviso</p>
              <p className="px-6 py-4" style={{ color: "var(--brand-claro)" }}>
                Com o CidadeIA
              </p>
            </div>
            {ANTES_E_DEPOIS.map((l) => (
              <div
                key={l.tema}
                className="grid md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,4fr)] border-t border-border first:border-t-0 md:first:border-t"
              >
                <p className="px-6 pt-5 md:py-5 font-semibold tracking-[-0.01em]">{l.tema}</p>
                <p className="px-6 pt-2 md:py-5 text-muted leading-relaxed">
                  <span className="md:hidden text-xs uppercase tracking-wide block mb-1">Sem aviso</span>
                  {l.sem}
                </p>
                <p className="px-6 pt-3 pb-5 md:py-5 leading-relaxed">
                  <span className="md:hidden text-xs uppercase tracking-wide block mb-1" style={{ color: "var(--brand-claro)" }}>
                    Com o CidadeIA
                  </span>
                  {l.com}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ POR QUE É SEGURO COMEÇAR ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
          <div className="rounded-[28px] border border-border p-6 sm:p-10" style={{ background: "var(--card)" }}>
            <h2 className="inicio-h2 max-w-[20ch]">Por que é seguro começar.</h2>
            <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
              {SEGURO.map((x) => (
                <li key={x.titulo} className="border-t border-border pt-5">
                  <p className="font-semibold tracking-[-0.01em]">{x.titulo}</p>
                  <p className="text-sm text-muted leading-relaxed mt-2">{x.texto}</p>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link
                href="/proposta"
                className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5"
              >
                Receber a proposta
              </Link>
              <Link href="/kit" className="inicio-sublinhado text-muted">
                Ver o kit de contratação
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ MISSÃO, VISÃO, VALORES ═══ */}
        <section className="border-t border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-[24px] border border-border p-7 sm:p-9" style={{ background: "var(--card)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--brand-claro)" }}>
                  Missão
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.025em] leading-snug">
                  Avisar a prefeitura antes do limite, do prazo e do apontamento, com o dado público que ela já envia.
                </p>
              </div>
              <div className="rounded-[24px] border border-border p-7 sm:p-9" style={{ background: "var(--card)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--brand-claro)" }}>
                  Visão
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.025em] leading-snug">
                  Que nenhuma prefeitura brasileira descubra pelo Tribunal de Contas o que o próprio dado já mostrava.
                </p>
              </div>
            </div>
            <h2 className="inicio-h2 max-w-[18ch] mt-16">O que a gente não negocia.</h2>
            <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-8">
              {VALORES.map((v) => (
                <li key={v.titulo} className="border-t border-border pt-5">
                  <p className="font-semibold tracking-[-0.01em]">{v.titulo}</p>
                  <p className="text-sm text-muted leading-relaxed mt-2">{v.texto}</p>
                </li>
              ))}
            </ul>
            <Link href="/governanca" className="inicio-sublinhado inline-block mt-10 text-sm">
              Ver as regras e os documentos em Governança
            </Link>
          </div>
        </section>

        {/* ═══ DÚVIDAS QUE TRAVAM A COMPRA ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <h2 className="inicio-h2 max-w-[18ch]">O que costumam perguntar.</h2>
          <dl className="mt-10 grid md:grid-cols-2 gap-x-10 gap-y-8">
            {DUVIDAS.map((d) => (
              <div key={d.pergunta} className="border-t border-border pt-5">
                <dt className="font-semibold tracking-[-0.01em]">{d.pergunta}</dt>
                <dd className="text-muted leading-relaxed mt-2">{d.resposta}</dd>
              </div>
            ))}
          </dl>
          <Link href="/faq" className="inicio-sublinhado inline-block mt-10 text-sm">
            Todas as perguntas frequentes
          </Link>
        </section>

        {/* ═══ PARA QUEM ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
          <h2 className="inicio-h2 max-w-[18ch]">Para quem trabalhamos.</h2>
          <p className="text-muted mt-4 max-w-[60ch] leading-relaxed">
            Três pessoas assinam o RGF: o prefeito, quem responde pelas finanças e o controle interno (LRF, art. 54). E
            o morador, que é para quem a prefeitura existe.
          </p>
          <ul className="mt-8 grid md:grid-cols-3 gap-4">
            {CARGOS.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/para/${c.slug}`}
                  className="group block h-full rounded-2xl border border-border hover:border-brand p-6 transition"
                  style={{ background: "var(--card)" }}
                >
                  <p className="font-semibold">{c.rotulo}</p>
                  <p className="text-sm text-muted leading-relaxed mt-2">{c.chamada}</p>
                  <p className="text-sm mt-4" style={{ color: "var(--brand-claro)" }}>
                    Ver a página <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ═══ FECHO ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-20 sm:pb-28">
          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="inicio-h2 max-w-[16ch]">Comece pelo número da sua cidade.</h2>
              <p className="text-muted mt-5 leading-relaxed max-w-[44ch]">
                O Raio-X é aberto e não pede cadastro. Quando quiser o processo de contratação, a proposta chega em um
                dia útil.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link
                  href="/proposta"
                  className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5"
                >
                  Receber a proposta
                </Link>
                <Link href="/raio-x" className="inicio-sublinhado text-muted">
                  Ver o Raio-X
                </Link>
              </div>
            </div>
            <div id="atendimento" className="scroll-mt-24">
              <PecaUmaLigacao
                origem="Quem somos"
                linkWhatsapp={linkWhatsappComercial("Olá! Vim pelo site do CidadeIA e queria conversar sobre a minha prefeitura.")}
              />
            </div>
          </div>
        </section>
        <BarraConversao atalho={{ href: "#raio-x", rotulo: "Raio-X da minha cidade" }} />
      </main>
      <SiteFooter />
    </div>
  );
}
