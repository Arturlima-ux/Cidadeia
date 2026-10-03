import Link from "next/link";
import { MarcaCompleta } from "@/components/site/MarcaQuadra";
import MenuMobile from "@/components/site/MenuMobile";

// ── CINCO ITENS, NA ORDEM EM QUE O PREFEITO PERGUNTA ──
// Eram oito, e em tela de 1366px três deles quebravam em duas linhas — o
// menu ficava serrilhado, e o cabeçalho inteiro somava 13 coisas clicáveis.
// Saíram: "Conformidade" (é o assunto do herói logo abaixo — link para a
// seção que já está na tela) e "Quem somos". Os dois continuam no rodapé.
const LINKS = [
  // ── POR QUE O RAIO-X OCUPA O PRIMEIRO LUGAR, E NÃO "SOLUÇÕES" ──
  //
  // Menu é ordem de conversa, não índice. Quem chega ao site não quer ver
  // catálogo de módulo: quer saber o que está acontecendo na prefeitura
  // dele. O Raio-X responde isso sem pedir nada além do nome do município.
  //
  // "Soluções" saiu do menu de propósito. A página continua existindo e
  // continua sendo a melhor do site — mas agora se chega nela pelo fim do
  // Raio-X, com o diagnóstico daquela cidade já lido, em vez de frio pelo
  // topo. Quem já conhece o produto acha em "Como contratar" e no rodapé.
  { href: "/raio-x", label: "Ver Raio-X do meu município" },
  // A demonstração era o quarto botão de uma fileira de quatro, e a fileira
  // inteira virava ruído: Cadastrar, Entrar, Ver demo, Receber proposta —
  // com "Entrar" repetido na barra de cima. Ela é um destino, como as
  // outras páginas; o lugar de um destino é a navegação.
  { href: "/demo", label: "Demonstração" },
  { href: "/como-contratar", label: "Como contratar" },
  { href: "/diagnostico", label: "Diagnóstico" },
  { href: "/faq", label: "FAQ" },
];

/**
 * `sessaoAtiva` chega por propriedade, e não de `lerSessao()` aqui dentro.
 *
 * Ler cookie neste componente tornaria DINÂMICA toda página que usa o
 * cabeçalho — preços, FAQ, sobre, kit, diagnóstico —, tirando todas do cache
 * do CDN. Num produto que roda em computador de secretaria, essa conta pesa,
 * e o ganho seria só trocar o rótulo de um botão.
 *
 * Então só a home informa, porque ela já é dinâmica por outro motivo (lista
 * os portais publicados). As demais seguem estáticas e mostram "Entrar", que
 * continua correto: leva ao login, que reconhece quem já tem sessão.
 */
export default function SiteHeader({ sessaoAtiva = false }: { sessaoAtiva?: boolean }) {
  const sessao = sessaoAtiva;

  return (
    <header className="sticky top-0 z-30">
      {/* ── PULAR PARA O CONTEÚDO ──
          Quem navega por teclado ou leitor de tela passava por barra
          utilitária, marca, seis links e botões antes de chegar ao texto —
          em toda página. O link fica invisível até receber foco (Tab). */}
      <a href="#conteudo" className="pular-para-conteudo">
        Pular para o conteúdo
      </a>
      {/* ── A BARRA UTILITÁRIA SAIU ──
          Eram DUAS barras empilhadas no topo de toda página: uma faixa
          escura com horário de atendimento e três links, e o cabeçalho
          abaixo dela. Somadas, ocupavam a primeira coisa que o visitante vê
          com informação que ninguém procura na primeira visita.

          O portal do cidadão e o "fale conosco" continuam no rodapé, que é
          onde quem procura por eles de fato olha. "Entrar" entrou no
          cabeçalho, em texto. */}
      {/* Opaco, sem backdrop-blur. O cabeçalho é sticky e fica na tela o tempo
          todo: com desfoque de fundo, o navegador reamostra e reborra a página
          inteira atrás dele a cada quadro da rolagem — em TODAS as páginas. A
          90% de opacidade o desfoque quase não aparecia; pagava-se caro à toa. */}
      <div className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-[74px] flex items-center justify-between gap-6">
          <Link href="/" aria-label="CidadeIA — início">
            <MarcaCompleta tamanho={30} />
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-muted">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="whitespace-nowrap hover:text-foreground transition">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Uma ação, e só uma, com peso: pedir a proposta. Entrar mora na
                barra de cima; a demonstração, na navegação; e o cadastro
                nasce do próprio pedido (/cadastro?proposta=…), não de um
                botão solto — prefeitura não abre conta antes de contratar. */}
            {/* "Entrar" em texto, porque a barra utilitária que o guardava
                saiu. Texto e não botão: duas ações com peso no mesmo canto é
                o que fazia o topo parecer desarrumado. */}
            {!sessao && (
              <Link
                href="/login"
                className="hidden sm:inline text-sm font-medium text-muted hover:text-foreground transition px-2"
              >
                Entrar
              </Link>
            )}
            {sessao ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold rounded-full px-5 py-2.5 transition"
                style={{ background: "var(--brand)", color: "var(--sobre-forte)" }}
              >
                Ir para o painel
              </Link>
            ) : (
              /* Pílula, não retângulo: é a forma dos botões em todas as
                 referências que o fundador mandou, e é o que separa um
                 cabeçalho de produto de um cabeçalho de template. */
              <Link
                href="/proposta"
                className="text-sm font-semibold rounded-full px-5 py-2.5 transition"
                style={{ background: "var(--brand)", color: "var(--sobre-forte)" }}
              >
                Receber proposta
              </Link>
            )}
            <MenuMobile links={LINKS} sessao={sessao} />
          </div>
        </div>
      </div>
    </header>
  );
}
