import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";

export const metadata = {
  title: "Perguntas frequentes — CidadeIA",
};

const PERGUNTAS = [
  {
    pergunta: "Preciso saber programar ou ter uma equipe de TI para usar?",
    resposta:
      "Não. O CidadeIA foi feito pra ser usado direto pelo prefeito, secretários e responsáveis, sem precisar de conhecimento técnico. É só criar a conta e começar a registrar os dados da sua gestão.",
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
      "Dá para ver o produto trabalhando sem criar nada: o Raio-X lê os dados que a União já publica sobre a sua prefeitura e responde na hora, sem cadastro. Conta você também pode abrir de graça e sem cartão, em /cadastro — mas ela nasce sem módulo ativo, então serve para reservar o acesso, não para conhecer o sistema. Os módulos (Essencial, Gestão, Saúde, Educação, Obras e Licitações) são liberados junto com a proposta, e é nessa conversa que se combina o período de avaliação.",
  },
  {
    pergunta: "A IA pode inventar números ou dados que não existem?",
    resposta:
      "Não — e essa é uma regra rígida do sistema. A IA (tanto no chat quanto nos insights automáticos) só usa dados que já estão cadastrados na sua prefeitura. Quando falta um dado, ela diz claramente que ele não está disponível, em vez de estimar ou inventar.",
  },
  {
    pergunta: "Os alertas sugeridos pela IA viram alertas oficiais sozinhos?",
    resposta:
      "Não. A IA analisa os dados e sugere um alerta com a justificativa, mas fica pendente até uma pessoa aprovar ou descartar. A IA nunca cria um alerta oficial sem revisão humana.",
  },
  {
    pergunta: "Os dados da minha prefeitura ficam visíveis para outras prefeituras?",
    resposta:
      "Não. Cada prefeitura só enxerga os próprios dados — é uma separação garantida em nível de banco de dados, não só de tela. Dentro da sua prefeitura, um secretário só vê os dados da própria secretaria, nunca o financeiro geral nem outras áreas.",
  },
  {
    pergunta: "Como funciona o login? Preciso lembrar de mais uma senha?",
    resposta:
      "O login é feito com CPF ou CNPJ e uma senha própria do sistema. Se esquecer a senha, tem recuperação por e-mail direto na tela de login.",
  },
  {
    pergunta: "Posso contratar ou cancelar um módulo depois?",
    resposta:
      "Sim, a qualquer momento — direto no painel, na área de Módulos, ou falando com o nosso suporte.",
  },
  {
    pergunta: "Vocês têm suporte se eu tiver problema ou dúvida?",
    resposta:
      "Sim. Tem um canal de suporte direto — veja a página de Suporte pra saber como falar com a gente.",
  },
];

export default function FaqPage() {
  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />

      <Reveal>
        <section className="max-w-2xl mx-auto px-4 sm:px-8 pt-16 pb-8 text-center">
          <h1 className="font-serif text-4xl font-bold">Perguntas frequentes</h1>
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

      <SiteFooter />
    </div>
  );
}
