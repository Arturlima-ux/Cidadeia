import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import BarraConversao from "@/components/site/BarraConversao";
import FormularioRaioX from "@/app/raio-x/FormularioRaioX";
import QuemVoceE from "@/components/site/quem-somos/QuemVoceE";
import TempoQueVolta from "@/components/site/quem-somos/TempoQueVolta";
import PecaUmaLigacao from "@/components/site/PecaUmaLigacao";
import { registrarEvento } from "@/lib/registrar-evento";
import { linkWhatsappComercial } from "@/lib/contato-comercial";
import { compartilhamento } from "@/lib/seo";
import { PANORAMA, mesDoPanorama, numeroBr, passaramDoAlerta } from "@/lib/panorama";
import { todosOsMunicipios, ANO_ESTIMATIVA_POPULACAO } from "@/lib/municipios";

export const metadata = compartilhamento({
  titulo: "Quem somos",
  descricao:
    "O CidadeIA nasceu para automatizar a prefeitura brasileira: o que é repetitivo vira sistema, e a equipe volta para o que só gente faz — decidir e atender o cidadão.",
  caminho: "/quem-somos",
});

// ── QUEM SOMOS ──
//
// A história é firme e é a de verdade: o CidadeIA nasceu para automatizar os
// serviços da prefeitura. O centro dela são as pessoas — a equipe pequena que
// faz tudo à mão e o morador que espera do outro lado do balcão —, e a página
// conversa com quem lê: escolha quem você é e veja o seu dia; faça a conta do
// tempo da sua equipe; veja agora a sua cidade.
//
// Tudo o que é número vem de dado público (IBGE, Tesouro) e se recalcula
// sozinho. As cenas descrevem o que o sistema já faz hoje. O fundador não
// aparece por nome: decisão dele.

const FONTES = ["Tesouro Nacional", "IBGE", "PNCP", "DataSUS", "INEP", "FNDE", "Fiocruz", "ObrasGov", "Transferegov"];

const VALORES = [
  { titulo: "Gente primeiro", texto: "Automatizamos o repetitivo para devolver tempo a quem trabalha na prefeitura, não para substituí-lo." },
  { titulo: "Só dado oficial", texto: "Quando a fonte não responde, a tela diz isso. O vazio nunca é preenchido com estimativa." },
  { titulo: "Regra com o artigo ao lado", texto: "Todo aviso fiscal sai de regra fixa, com a base legal escrita. Quem decide é a prefeitura." },
  { titulo: "A IA sugere, a pessoa decide", texto: "Nenhuma sugestão da inteligência artificial vira alerta oficial sem alguém aprovar." },
  { titulo: "Sem vender o que não existe", texto: "Cada módulo do site funciona hoje, e qualquer um confere antes de contratar, sem cadastro." },
];

const SEGURO = [
  {
    titulo: "Cabe na dispensa de licitação",
    texto: "O processo vai pronto para o jurídico: termo de referência, minuta de contrato, acordo de tratamento de dados e de nível de serviço.",
  },
  { titulo: "Mensal, por módulo, sem fidelidade", texto: "A prefeitura contrata só o que precisa e encerra qualquer módulo com aviso de 30 dias." },
  { titulo: "Nada para instalar", texto: "Funciona no navegador e não pede acesso ao sistema contábil: lê o dado público que o município já enviou." },
  { titulo: "Proposta em um dia útil", texto: "Com o valor de cada módulo e o processo de contratação. Sem reunião obrigatória e sem apresentação de vendas." },
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
      "Tudo o que o site promete se confere antes de contratar: o Raio-X da sua cidade, a demonstração completa e o panorama do país, sem cadastro. E o contrato é mensal, sem fidelidade.",
  },
  {
    pergunta: "O alerta vai direto para o Tribunal de Contas?",
    resposta:
      "Não. O CidadeIA avisa a prefeitura, e só ela. Nada é publicado nem enviado a órgão de controle; a decisão continua com quem tem a competência.",
  },
  {
    pergunta: "Não temos equipe de TI.",
    resposta: "Não precisa. Os dados entram sozinhos das bases oficiais, e cada secretário tem o próprio acesso, só à sua área.",
  },
];

export default async function QuemSomosPage() {
  await registrarEvento({ tipo: "visita", caminho: "/quem-somos" });

  const b = PANORAMA.brasil;
  const mes = mesDoPanorama();
  const passaram = passaramDoAlerta(b);
  const municipios = todosOsMunicipios();
  const pequenas = municipios.filter((m) => m.populacao !== null && m.populacao <= 20_000).length;
  const pctPequenas = Math.round((pequenas / municipios.length) * 100);

  const CAPITULOS = [
    {
      quando: "Antes de nós",
      titulo: "A prefeitura fazia tudo à mão",
      texto: `Desde a Lei de Responsabilidade Fiscal, de 2000, cada prefeitura entrega relatório a cada dois e a cada quatro meses, conta prazo de ouvidoria, acompanha os mínimos de saúde e educação e mede obra. ${numeroBr(
        pequenas
      )} das ${numeroBr(municipios.length)} cidades do país têm até 20 mil habitantes (IBGE, ${ANO_ESTIMATIVA_POPULACAO}), e nelas a mesma equipe pequena faz isso em planilha, entre um atendimento e outro no balcão.`,
    },
    {
      quando: "2026",
      titulo: "Nascemos para automatizar a prefeitura",
      texto:
        "O CidadeIA começa com uma decisão clara: tudo o que é repetitivo vira sistema. Ler o Tesouro, contar prazo, somar limite, avisar quem precisa resolver. Todo dia, sem ninguém precisar lembrar. Não para substituir quem trabalha na prefeitura, e sim para devolver a essa gente o tempo de decidir e de atender.",
    },
    {
      quando: "Outubro de 2026",
      titulo: "Fomos olhar o Brasil inteiro",
      texto: `Lemos o RGF das ${numeroBr(b.municipios)} prefeituras do país. Na conferência de ${mes}, ${numeroBr(
        passaram
      )} já tinham passado do sinal de alerta da despesa com pessoal, ${numeroBr(b.acimaDoLimite)} estavam acima do limite da lei e ${numeroBr(
        b.rgfAtrasado
      )} tinham o RGF vencido sem entrega. Não faltava lei nem dado. Faltava alguém olhar a tempo.`,
      link: { href: "/panorama", rotulo: "Ver o panorama do seu estado" },
    },
    {
      quando: "Outubro de 2026",
      titulo: "Seis módulos trabalhando sozinhos",
      texto:
        "Essencial, Gestão, Saúde, Educação, Obras e Licitações passam a ler as bases oficiais toda semana, sem ninguém digitar, e o aviso vai direto para quem resolve: o urgente ao prefeito, o de cada área ao seu secretário.",
      link: { href: "/solucoes", rotulo: "Conhecer os módulos" },
    },
    {
      quando: "Outubro de 2026",
      titulo: "E o morador entra na conversa",
      texto:
        "O portal do cidadão ganha a pergunta respondida em uma frase, o serviço mais perto de casa, o protocolo com prazo legal contado e a chance de dizer se a resposta resolveu.",
      link: { href: "/transparencia", rotulo: "Abrir o portal" },
    },
    {
      quando: "Agora",
      titulo: "O próximo capítulo é o da sua prefeitura",
      texto:
        "Cada prefeitura que entra muda o produto: é assim que os avisos ficam mais certeiros e as telas, mais simples. A próxima pode ser a sua.",
      link: { href: "#raio-x", rotulo: "Ver o que o Tesouro mostra da minha cidade" },
    },
  ];

  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        {/* ═══ ABERTURA ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-10 sm:pt-14 pb-16">
          <Olho>Quem somos</Olho>
          <h1 className="titulo-pagina mt-4 max-w-[17ch]">Nascemos para automatizar a prefeitura brasileira.</h1>
          <div className="mt-7 grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-10 lg:gap-16">
            <div>
              <p className="text-lg text-muted leading-relaxed max-w-[58ch]">
                O que é repetitivo vira sistema: ler o Tesouro, contar prazo, somar limite, avisar quem precisa. A equipe da
                prefeitura volta para o que só gente faz, que é decidir e atender o cidadão.
              </p>
              {/* Sem "Receber a proposta" aqui: quem abre "Quem somos" está
                  conhecendo a empresa, e a primeira ação da página é conhecer
                  mais — o próprio dia, depois a história. O pedido de proposta
                  vem depois da calculadora, nas garantias e no fecho. */}
              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
                <a
                  href="#quem-e-voce"
                  className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5"
                >
                  Ver como fica o seu dia
                </a>
                <a href="#historia" className="inicio-sublinhado text-muted">
                  Conhecer a nossa história
                </a>
              </div>
            </div>
            {/* O retrato do país que justifica a empresa, em três números. */}
            <dl className="lg:border-l border-border lg:pl-10 self-start grid grid-cols-3 lg:grid-cols-1 gap-6">
              <div className="flex flex-col">
                <dt className="order-2 text-sm text-muted leading-snug">cidades com até 20 mil habitantes</dt>
                <dd className="order-1 text-3xl sm:text-4xl font-semibold tabular-nums tracking-[-0.04em]">{pctPequenas}%</dd>
              </div>
              <div className="flex flex-col">
                <dt className="order-2 text-sm text-muted leading-snug">prefeituras já passaram do alerta da LRF</dt>
                <dd className="order-1 text-3xl sm:text-4xl font-semibold tabular-nums tracking-[-0.04em]">{numeroBr(passaram)}</dd>
              </div>
              <div className="flex flex-col">
                <dt className="order-2 text-sm text-muted leading-snug">programas para instalar na prefeitura</dt>
                <dd className="order-1 text-3xl sm:text-4xl font-semibold tabular-nums tracking-[-0.04em]">0</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ═══ NOSSA HISTÓRIA ═══ */}
        <section id="historia" className="scroll-mt-20 border-t border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-10 lg:gap-16">
              <div className="lg:sticky lg:top-28 self-start">
                <h2 className="inicio-h2 max-w-[14ch]">Nossa história.</h2>
                <p className="text-muted mt-4 leading-relaxed max-w-[40ch]">
                  Uma empresa nova, com um objetivo antigo de quem sempre esteve por dentro da prefeitura: parar de fazer à
                  mão o que uma máquina faz melhor.
                </p>
                <p className="mt-6 text-sm text-muted">Lemos direto de</p>
                <ul className="mt-3 flex flex-wrap gap-2 max-w-[360px]">
                  {FONTES.map((f) => (
                    <li key={f} className="rounded-full border border-border px-3 py-1 text-xs">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <ol className="relative">
                <span className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: "var(--border)" }} aria-hidden />
                {CAPITULOS.map((c, i) => (
                  <li key={c.titulo} className="relative pl-10 pb-10 last:pb-0">
                    <span
                      className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2"
                      style={{ borderColor: "var(--brand)", background: i === CAPITULOS.length - 1 ? "var(--brand)" : "var(--superficie)" }}
                      aria-hidden
                    />
                    <p className="text-sm font-medium" style={{ color: "var(--brand-claro)" }}>
                      {c.quando}
                    </p>
                    <h3 className="mt-1.5 text-xl sm:text-2xl font-semibold tracking-[-0.025em]">{c.titulo}</h3>
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

        {/* ═══ ESCOLHA QUEM VOCÊ É ═══ */}
        <section id="quem-e-voce" className="scroll-mt-24 max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <h2 className="inicio-h2 max-w-[20ch]">Escolha quem você é, e veja o seu dia.</h2>
          <p className="text-muted mt-4 max-w-[60ch] leading-relaxed">
            A mesma prefeitura, vista por cinco pessoas. Cada cena é o que o sistema já faz hoje.
          </p>
          <div className="mt-8">
            <QuemVoceE />
          </div>
        </section>

        {/* ═══ O TEMPO QUE VOLTA ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
          <h2 className="inicio-h2 max-w-[20ch]">Quanto tempo volta para a sua equipe.</h2>
          <p className="text-muted mt-4 max-w-[60ch] leading-relaxed">Arraste e faça a conta com os números da sua prefeitura.</p>
          <div className="mt-8">
            <TempoQueVolta />
          </div>
        </section>

        {/* ═══ E A SUA CIDADE? ═══ */}
        <section id="raio-x" className="scroll-mt-24 border-t border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24 grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="inicio-h2 max-w-[14ch]">E a sua cidade?</h2>
              <p className="text-muted mt-4 leading-relaxed max-w-[40ch]">
                Veja agora o que a sua prefeitura já publicou no Tesouro: receita, saúde, educação, obras e os relatórios
                que faltam. Sem cadastro, em alguns segundos.
              </p>
            </div>
            <div className="min-w-0">
              <FormularioRaioX />
            </div>
          </div>
        </section>

        {/* ═══ POR QUE É SEGURO COMEÇAR ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
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
              <Link href="/proposta" className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5">
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
                  Automatizar o que é repetitivo na prefeitura, para que a equipe cuide de decidir e de atender o cidadão.
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

        {/* ═══ DÚVIDAS ═══ */}
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

        {/* ═══ FECHO ═══ */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-20 sm:pb-28">
          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="inicio-h2 max-w-[16ch]">Vamos automatizar a sua prefeitura?</h2>
              <p className="text-muted mt-5 leading-relaxed max-w-[44ch]">
                A proposta chega em um dia útil, com o valor e o processo de contratação pronto. Se preferir conversar
                antes, deixe o telefone: quem liga é a equipe que constrói o sistema.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link href="/proposta" className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5">
                  Receber a proposta
                </Link>
                <Link href="/demo" className="inicio-sublinhado text-muted">
                  Ver a demonstração
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
