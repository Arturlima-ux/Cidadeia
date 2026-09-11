import Link from "next/link";
import { MarcaCompleta } from "@/components/site/MarcaQuadra";

// ── CINCO ITENS, NA ORDEM EM QUE O PREFEITO PERGUNTA ──
// Eram oito, e em tela de 1366px três deles quebravam em duas linhas — o
// menu ficava serrilhado, e o cabeçalho inteiro somava 13 coisas clicáveis.
// Saíram: "Conformidade" (é o assunto do herói logo abaixo — link para a
// seção que já está na tela), "Quem somos" e "Raio-X" (a home oferece o
// Raio-X no corpo, ao lado dos portais). Os três continuam no rodapé.
const LINKS = [
  { href: "/#solucoes", label: "Soluções" },
  { href: "/precos", label: "Preços" },
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
            <Link href={sessao ? "/dashboard" : "/login"} className="hover:text-white transition">
              {sessao ? "Meu painel" : "Área do servidor"}
            </Link>
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

          <div className="flex items-center gap-3 shrink-0">
            {/* "Cadastrar" só aparece sem sessão: existe pra dar rosto ao que
                o FAQ já promete ("criar conta é grátis e sem cartão"), que
                antes só era alcançável de dentro da tela de login — sem
                nenhum link no cabeçalho ou na home apontando pra lá.

                Em texto, não em botão: a página tem duas ações cheias que não
                competem — diagnóstico no topo, proposta no fecho — e uma
                terceira com peso reabriria a dispersão que a gente acabou de
                arrumar. O que faltava não era destaque, era existir. */}
            {!sessao && (
              <Link
                href="/cadastro"
                className="hidden sm:inline text-sm font-semibold text-muted hover:text-brand transition"
              >
                Cadastrar
              </Link>
            )}
            <Link
              href={sessao ? "/dashboard" : "/login"}
              className="hidden sm:inline text-sm font-semibold hover:text-brand transition"
            >
              {sessao ? "Ir para o painel" : "Entrar"}
            </Link>
            {/* Era "Solicitar demonstração" — a mesma frase que a home usa
                como exemplo do que as incumbentes fazem para esconder preço.
                O botão mais visível do site não pode contradizer o argumento
                central da página que ele encabeça. */}
            {/* O comentário acima já dizia isto e o texto contradizia mesmo
                assim: "Falar com especialista" é exatamente a exigência que a
                home acusa as incumbentes de fazer, no botão que aparece em
                TODAS as páginas. Mesmo destino do fecho, mesmas palavras. */}
            <Link
              href="/suporte?assunto=proposta"
              className="text-sm font-bold bg-brand hover:bg-brand-dark text-white rounded-xl px-4 sm:px-5 py-2.5 transition shadow-elevated"
            >
              Receber proposta
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
