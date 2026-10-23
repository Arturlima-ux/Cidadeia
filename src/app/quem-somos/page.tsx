import Link from "next/link";
import { FONTES_OFICIAIS, MUNICIPIOS_COM_PREFEITURA } from "@/lib/fontes-oficiais";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import BarraConversao from "@/components/site/BarraConversao";
import QuemVoceE from "@/components/site/quem-somos/QuemVoceE";
import TempoQueVolta from "@/components/site/quem-somos/TempoQueVolta";
import PecaUmaLigacao from "@/components/site/PecaUmaLigacao";
import { registrarEvento } from "@/lib/registrar-evento";
import { linkWhatsappComercial } from "@/lib/contato-comercial";
import { compartilhamento } from "@/lib/seo";
import { PANORAMA, mesDoPanorama, numeroBr, passaramDoAlerta } from "@/lib/panorama";
import { todosOsMunicipios, ANO_ESTIMATIVA_POPULACAO } from "@/lib/municipios";
import { LINK_DA_FONTE } from "@/lib/links-oficiais";

export const metadata = compartilhamento({
  titulo: "Quem somos",
  descricao:
    "O CidadeIA nasceu para automatizar a prefeitura brasileira: atendimento ao cidadão, secretarias, obras, saúde, educação e finanças num lugar só.",
  caminho: "/quem-somos",
});

// ── QUEM SOMOS ──
//
// A história é firme e é a de verdade: o CidadeIA nasceu para automatizar os
// serviços da prefeitura. O centro dela são as pessoas — a equipe pequena que
// faz tudo à mão e o morador que espera do outro lado do balcão —, e a página
// conversa com quem lê: escolha quem você é e veja o seu dia; faça a conta do
// tempo da sua equipe. O Raio-X da cidade saiu daqui: é ferramenta de
// produto, tem página própria, e no meio da história só interrompia.
//
// Tudo o que é número vem de dado público (IBGE, Tesouro) e se recalcula
// sozinho. As cenas descrevem o que o sistema já faz hoje. O fundador não
// aparece por nome: decisão dele.

const FONTES = FONTES_OFICIAIS;

const VALORES = [
  { titulo: "Gente primeiro", texto: "Automatizamos o repetitivo para devolver tempo a quem trabalha na prefeitura, não para substituí-lo." },
  { titulo: "Só dado oficial", texto: "Quando a fonte não responde, a tela diz isso. O vazio nunca é preenchido com estimativa." },
  { titulo: "Regra com o artigo ao lado", texto: "Todo aviso fiscal sai de regra fixa, com a base legal escrita. Quem decide é a prefeitura." },
  { titulo: "A IA sugere, a pessoa decide", texto: "Nenhuma sugestão da inteligência artificial vira alerta oficial sem alguém aprovar." },
  { titulo: "Sem vender o que não existe", texto: "Cada módulo do site funciona hoje, e qualquer um confere antes de contratar, sem cadastro. O que depende de dado interno, como estoque e medição de obra, a tela diz que é a equipe que lança." },
];

const SEGURO = [
  {
    titulo: "Dentro do limite da dispensa",
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
      "O CidadeIA não substitui nenhum dos dois. Ele confere o que o sistema contábil já enviou ao Tesouro: o prazo de cada entrega, acompanhado todo dia, e o limite e a coerência dos números, a cada relatório publicado, sem depender de alguém lembrar.",
  },
  {
    pergunta: "Uma empresa nova é segura para a prefeitura?",
    resposta:
      "O risco de uma empresa nova é a prefeitura ficar presa a ela, e o contrato tira esse risco: é mensal, sem fidelidade, encerra com aviso de 30 dias, e os dados do município saem inteiros a qualquer momento, em CSV e JSON, até com a mensalidade atrasada. E tudo o que o site promete se confere antes, sem cadastro: o Raio-X da sua cidade, a demonstração completa e o panorama do país.",
  },
  {
    pergunta: "O alerta vai direto para o Tribunal de Contas?",
    resposta:
      "Não. O alerta vai só para a prefeitura, e nunca a órgão de controle. O que vai ao portal do cidadão é só o que a própria prefeitura registrou e a lei manda publicar, como o aviso de obra paralisada com o motivo e a data de reinício que o gestor escreveu. A decisão continua com quem tem a competência.",
  },
  {
    pergunta: "Não temos equipe de TI.",
    resposta: "Não precisa. O que é público entra sozinho das bases oficiais; o que só a prefeitura sabe, como estoque da UBS e medição de obra, a equipe lança na própria tela, sem instalar nada. Cada secretário tem o próprio acesso, só à sua área.",
  },
];

export default async function QuemSomosPage() {
  await registrarEvento({ tipo: "visita", caminho: "/quem-somos" });

  const b = PANORAMA.brasil;
  const mes = mesDoPanorama();
  const passaram = passaramDoAlerta(b);
  // Sem Brasília: o DF não tem prefeitura, e com ele a página dizia "5.571
  // cidades" num parágrafo e "5.570 prefeituras" no seguinte.
  const municipios = todosOsMunicipios().filter((m) => m.uf !== "DF");
  const pequenas = municipios.filter((m) => m.populacao !== null && m.populacao <= 20_000).length;

  const CAPITULOS = [
    {
      quando: "Antes de nós",
      titulo: "A prefeitura fazia tudo à mão",
      texto: `Desde a Lei de Responsabilidade Fiscal, de 2000, cada prefeitura entrega relatório a cada dois e a cada quatro meses, conta prazo de ouvidoria, acompanha os mínimos de saúde e educação e mede obra. ${numeroBr(
        pequenas
      )} dos ${numeroBr(MUNICIPIOS_COM_PREFEITURA)} municípios do país têm até 20 mil habitantes (IBGE, ${ANO_ESTIMATIVA_POPULACAO}), e neles a mesma equipe pequena faz isso em planilha, entre um atendimento e outro no balcão.`,
    },
    {
      quando: "2026",
      titulo: "Nascemos para automatizar a prefeitura",
      texto:
        "O CidadeIA começa com uma decisão clara: reunir a gestão da prefeitura num lugar só e transformar em sistema tudo o que é repetitivo. O protocolo do cidadão, o painel de cada secretaria, as unidades de saúde, as escolas, as obras, as compras e as contas do município, com o que já é público lido sozinho das bases oficiais. Não para substituir quem trabalha na prefeitura, e sim para devolver a essa gente o tempo de decidir e de atender.",
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
    // Eram três marcos seguidos em "Outubro de 2026", o que só chamava atenção
    // para a idade da empresa sem dizer nada a mais (revisão de outubro de
    // 2026). Datas não se inventam: os módulos e o portal viraram um marco
    // só, o de hoje.
    {
      quando: "Hoje",
      titulo: "Seis módulos e o portal do morador no ar",
      texto:
        "Essencial, Gestão, Saúde, Educação, Obras e Licitações leem toda semana o que as bases oficiais já têm, sem ninguém digitar, e o aviso vai direto para quem resolve: o urgente ao prefeito, o de cada área ao seu secretário. Do outro lado, o portal do cidadão responde a pergunta em uma frase, mostra o serviço mais perto de casa e conta o prazo legal de cada protocolo.",
      link: { href: "/solucoes", rotulo: "Conhecer os módulos" },
    },
    {
      quando: "Próximo",
      titulo: "O próximo capítulo é o da sua prefeitura",
      texto:
        "Cada prefeitura que entra muda o produto: é assim que os avisos ficam mais certeiros e as telas, mais simples. A próxima pode ser a sua.",
      link: { href: "#quem-e-voce", rotulo: "Ver como fica o seu dia" },
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
                Atendimento ao cidadão, secretarias, obras, saúde, educação e finanças num lugar só. O que já é público
                entra sozinho das bases oficiais. O que é repetitivo vira sistema, e a equipe volta para o que só gente faz: decidir e
                atender o cidadão.
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
                {/* Era "68% das cidades com até 20 mil habitantes": dado do
                    país, que não diz nada da empresa (revisão de outubro de
                    2026). Agora é o que a empresa faz, e se confere. */}
                <dt className="order-2 text-sm text-muted leading-snug">bases oficiais lidas sem ninguém digitar</dt>
                <dd className="order-1 text-3xl sm:text-4xl font-semibold tabular-nums tracking-[-0.04em]">{FONTES_OFICIAIS.length}</dd>
              </div>
              <div className="flex flex-col">
                <dt className="order-2 text-sm text-muted leading-snug">áreas da prefeitura num sistema só</dt>
                <dd className="order-1 text-3xl sm:text-4xl font-semibold tabular-nums tracking-[-0.04em]">6</dd>
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
                    <li key={f} className="rounded-full border border-border text-xs">
                      <a href={LINK_DA_FONTE[f]} target="_blank" rel="noopener noreferrer" className="block px-3 py-1 hover:text-foreground">
                        {f}
                      </a>
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
                  Reunir a gestão municipal num lugar só e automatizar o que é repetitivo, para que a equipe cuide de decidir
                  e de atender o cidadão.
                </p>
              </div>
              <div className="rounded-[24px] border border-border p-7 sm:p-9" style={{ background: "var(--card)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--brand-claro)" }}>
                  Visão
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.025em] leading-snug">
                  Que toda prefeitura brasileira, de qualquer tamanho, tenha a gestão inteira na mão e o tempo da equipe
                  voltado para a cidade.
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
        <BarraConversao />
      </main>
      <SiteFooter />
    </div>
  );
}
