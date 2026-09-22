import Link from "next/link";
import { MarcaCompleta } from "@/components/site/MarcaQuadra";
import MenuMobile from "@/components/site/MenuMobile";

// ── CINCO ITENS, NA ORDEM EM QUE O PREFEITO PERGUNTA ──
// Eram oito, e em tela de 1366px três deles quebravam em duas linhas — o
// menu ficava serrilhado, e o cabeçalho inteiro somava 13 coisas clicáveis.
// Saíram: "Conformidade" (é o assunto do herói logo abaixo — link para a
// seção que já está na tela), "Quem somos" e "Raio-X" (a home oferece o
// Raio-X no corpo, ao lado dos portais). Os três continuam no rodapé.
const LINKS = [
  // "Soluções" e "Módulos" eram dois itens para o mesmo conteúdo: a seção
  // da home e a página /precos mostravam os mesmos seis módulos. Agora é uma
  // página, /solucoes, e a home só resume — como o "Premium" do Spotify: o
  // botão abre a página, em vez de a home carregar tudo.
  { href: "/solucoes", label: "Soluções" },
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
      {/* Barra utilitária — é a assinatura do formato institucional: o
          cidadão e o servidor têm porta de entrada própria, separada da
          conversa comercial. */}
      <div
        className="text-white/75 text-xs"
        style={{ background: "var(--brand-profundo)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-2 flex items-center justify-between gap-4">
          <span className="hidden sm:inline">Atendimento: seg a sex, 8h às 18h</span>
          <div className="flex items-center gap-5 ml-auto">
            {/* O morador chega ao site por este link e por mais nenhum.
                Ele fica em texto branco cheio, com o ponto verde de "no ar",
                porque ao lado de "Área do servidor" em cinza ele desaparecia
                — e quem procura o portal da própria cidade não vem lendo a
                barra inteira, vem varrendo atrás de uma palavra conhecida. */}
            <Link
              href="/transparencia"
              className="inline-flex items-center gap-1.5 text-white font-semibold hover:opacity-80 transition"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)] shrink-0" />
              Portal do cidadão
            </Link>
            {/* Sem sessão, esta é a única porta de login do site — o cabeçalho
                abaixo repetia "Entrar", e duas portas para a mesma sala fazem
                o topo parecer desarrumado. Com sessão, quem leva ao painel é
                o botão do cabeçalho, e aqui não se repete: o cliente que já
                contratou não precisa escolher entre dois caminhos iguais. */}
            {!sessao && (
              <Link href="/login" className="hover:text-white transition">
                Entrar
              </Link>
            )}
            {/* Rebaixado para cinza: em branco cheio disputava a atenção com
                o link do cidadão, e a conversa comercial já tem o botão
                principal do cabeçalho logo abaixo. Esta barra é do morador e
                do servidor. */}
            <Link href="/suporte" className="hover:text-white transition">
              Fale conosco
            </Link>
          </div>
        </div>
      </div>

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
            {sessao ? (
              <Link
                href="/dashboard"
                className="text-sm font-bold bg-brand hover:bg-brand-dark text-white rounded-xl px-4 sm:px-5 py-2.5 transition shadow-elevated"
              >
                Ir para o painel
              </Link>
            ) : (
              <Link
                href="/proposta"
                className="text-sm font-bold bg-brand hover:bg-brand-dark text-white rounded-xl px-4 sm:px-5 py-2.5 transition shadow-elevated"
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
