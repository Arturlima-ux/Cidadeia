import { compartilhamento } from "@/lib/seo";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";

export const metadata = compartilhamento({
  titulo: "Perguntas frequentes",
  descricao:
    "O que a prefeitura precisa saber antes de contratar o CidadeIA: dados, acesso por cargo, inteligência artificial, contrato e suporte.",
  caminho: "/faq",
});

const PERGUNTAS = [
  {
    pergunta: "Preciso saber programar ou ter uma equipe de TI para usar?",
    resposta:
      "Não. O sistema funciona no navegador e foi feito para ser usado pelo prefeito, pelos secretários e pelas equipes, sem conhecimento técnico. O que já é público, como as contas no Tesouro, a rede do CNES, as escolas do INEP e os contratos do PNCP, entra sozinho. O que só a prefeitura sabe, como estoque, ocorrências nas unidades e medição de obra, a equipe lança nas telas de cada área.",
  },
  {
    // A resposta dizia "criar a conta é gratuito e sem cartão — você já entra
    // no painel e vê como o sistema é organizado". Meia verdade, e a metade
    // que falta é a que decepciona: a conta é criada mesmo, mas nasce SEM
    // módulo nenhum. O que ela abre é um painel com "Nenhum módulo contratado"
    // e as telas bloqueadas — o oposto de ver como o sistema é organizado.
    //
    // Além disso o único caminho para o cadastro é a tela de login. Quem lê
    // esta resposta e procura um botão "criar conta" não acha, o que faz a
    // promessa parecer descuido antes mesmo de ser testada.
    //
    // Agora a resposta descreve o que acontece de verdade, e o Raio-X entra no
    // lugar do teste que não existe: ele mostra o produto trabalhando sobre
    // dado real do município de quem pergunta, sem cadastro nenhum.
    pergunta: "Posso testar antes de contratar algum módulo?",
    resposta:
      "Dá para ver o produto trabalhando sem criar nada: o Raio-X lê os dados que a União já publica sobre a sua prefeitura e responde na hora, sem cadastro, e o painel de demonstração abre com uma prefeitura de exemplo. Os módulos (Essencial, Gestão, Saúde, Educação, Obras e Licitações) são liberados com a contratação; se a prefeitura quiser um período de avaliação, ele entra na proposta. E se preferir conversar antes, a equipe liga.",
    caminhos: [
      { href: "/raio-x", rotulo: "Ver o Raio-X da minha prefeitura" },
      { href: "/demo", rotulo: "Abrir o painel de demonstração" },
    ],
  },
  {
    pergunta: "A IA pode inventar números ou dados que não existem?",
    resposta:
      "Não. É uma regra fixa do sistema: a inteligência artificial só usa dados que já estão no sistema da prefeitura. Quando falta um dado, ela diz que ele não está disponível, em vez de estimar.",
  },
  {
    pergunta: "Os alertas sugeridos pela IA viram alertas oficiais sozinhos?",
    resposta:
      "Não. A IA analisa os dados e sugere um alerta com a justificativa, mas fica pendente até uma pessoa aprovar ou descartar. A IA nunca cria um alerta oficial sem revisão humana.",
  },
  {
    pergunta: "Os dados da minha prefeitura ficam visíveis para outras prefeituras?",
    resposta:
      "Não. Cada prefeitura só enxerga os próprios dados, numa separação feita no banco de dados, e não só na tela. Dentro da prefeitura, cada secretário vê apenas a própria secretaria, nunca o financeiro geral nem outras áreas.",
  },
  {
    pergunta: "Como funciona o login? Preciso lembrar de mais uma senha?",
    resposta:
      "O acesso é feito com CPF ou CNPJ e uma senha própria do sistema. Quem esquecer a senha pode recuperá-la por e-mail, na própria tela de entrada.",
  },
  {
    // Dizia "direto no painel". Prefeitura não contrata nem cancela com um
    // clique: muda o contrato por termo aditivo (revisão de outubro de 2026).
    pergunta: "Posso acrescentar ou retirar um módulo depois?",
    resposta:
      "Sim, como em qualquer contrato público: o módulo novo entra por termo aditivo, ou por nova contratação somada ao limite da dispensa no ano, e a retirada segue a cláusula de rescisão, com aviso prévio e sem multa. A equipe prepara a documentação.",
  },
  {
    pergunta: "Vocês têm suporte se eu tiver problema ou dúvida?",
    resposta:
      "Sim. Os canais e os prazos de atendimento estão na página de Suporte e no acordo de nível de serviço que vai anexo ao contrato.",
  },
  {
    // O prefeito pergunta isso antes de comprar (revisão de outubro de 2026),
    // e o site não respondia. Regra decidida pelo fundador: o que a lei manda
    // publicar não se desliga; as comparações a mais, sim.
    pergunta: "A prefeitura escolhe o que aparece no portal do cidadão?",
    resposta:
      "Em parte. Ficam sempre no ar, porque a lei manda publicar: o aviso de obra paralisada (Lei 14.133, art. 115, § 6º), as emendas recebidas, o canal de manifestação e o resultado das respostas, inclusive a avaliação do cidadão (Lei 13.460, arts. 23 e 24). A prefeitura pode desligar, em Configurações, a lista de obras com a comparação entre o que foi pago e o que foi executado, o quadro de receita e despesa com o percentual das emendas aplicado em investimento, e a lista de compras.",
  },
  {
    // A revisão de outubro de 2026 lembrou que há opção gratuita, e o site a
    // ignorava. Melhor dizer quando ela basta do que deixar o comprador achar
    // sozinho.
    pergunta: "A CGU oferece o Fala.BR de graça. Por que contratar o Essencial?",
    resposta:
      "Se a prefeitura só precisa de ouvidoria e de pedidos de acesso à informação, o Fala.BR, da Controladoria-Geral da União, é gratuito e atende bem. O Essencial faz sentido quando a prefeitura quer, no mesmo lugar, o portal do cidadão com as contas, as obras e as compras da cidade, o prazo de cada manifestação ligado à secretaria que responde, e esses números no painel do prefeito. Uma coisa não impede a outra.",
  },
];

export default function FaqPage() {
  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />
      <main id="conteudo">

      <Reveal>
        <section className="max-w-2xl mx-auto px-4 sm:px-8 pt-16 pb-8 text-center">
          <h1 className="titulo-pagina">Perguntas frequentes</h1>
          <p className="text-muted text-base mt-4 leading-relaxed">
            O que mais perguntam antes de começar a usar o CidadeIA.
          </p>
        </section>
      </Reveal>

      <section className="max-w-2xl mx-auto px-4 sm:px-8 pb-20 space-y-3">
        {PERGUNTAS.map((p, i) => (
          <Reveal key={p.pergunta} delay={Math.min(i, 5) * 60}>
            <details className="group bg-card border border-border rounded-xl p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-sm">
                {p.pergunta}
                <span className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-45 text-lg leading-none">
                  +
                </span>
              </summary>
              <p className="text-sm text-muted mt-3 leading-relaxed">{p.resposta}</p>

              {/* ── A PORTA, ONDE A PROMESSA É FEITA ──
                  A resposta sobre testar antes de contratar citava "/cadastro"
                  como texto puro. Quem lia procurava um botão e não achava: o
                  único link para o cadastro em todo o site está dentro da tela
                  de login, e a home leva a "Fazer o diagnóstico" ou "Receber
                  proposta".

                  Uma resposta que diz "dá para fazer X" e não abre caminho
                  para X faz o leitor concluir que X não existe. Aqui existe:
                  são links discretos, que não disputam com as duas ações
                  principais da página inicial. */}
              {p.caminhos && (
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-3 border-t border-border">
                  {p.caminhos.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className="text-sm font-semibold text-brand hover:text-brand-claro transition"
                    >
                      {c.rotulo}&nbsp;→
                    </Link>
                  ))}
                </div>
              )}
            </details>
          </Reveal>
        ))}

        <div className="text-center pt-6">
          <p className="text-sm text-muted">
            Não achou sua dúvida?{" "}
            <Link href="/suporte" className="font-semibold text-brand hover:underline">
              Fale com a gente
            </Link>
          </p>
        </div>
      </section>

      </main>

      <SiteFooter />
    </div>
  );
}
