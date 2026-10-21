import Link from "next/link";
import { MarcaCompleta } from "@/components/site/MarcaQuadra";
import MenuMobile from "@/components/site/MenuMobile";
import { MENU_DO_SITE } from "@/lib/menu-do-site";

// ── O MENU ──
// Os sete itens de site institucional (lib/menu-do-site.ts). O que era o
// menu de vendas — Raio-X, Demonstração, Como contratar, Panorama, FAQ —
// mora no submenu de Produtos.
const LINKS = MENU_DO_SITE;

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
export default function SiteHeader({
  sessaoAtiva = false,
  modo = "prefeitura",
}: {
  sessaoAtiva?: boolean;
  /** No modo morador, a ação do topo deixa de ser "pedir proposta". */
  modo?: "prefeitura" | "morador";
}) {
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
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 h-[70px] flex items-center justify-between gap-6">
          <Link href="/" aria-label="CidadeIA — início">
            <MarcaCompleta tamanho={30} />
          </Link>

          {/* Sete itens mais "Entrar" e o botão só cabem em linha a partir de
              1280px; abaixo disso, o menu do celular. */}
          <nav aria-label="Principal" className="hidden xl:flex items-center gap-5 text-sm font-medium text-muted">
            {LINKS.map((l) =>
              l.filhos ? (
                // Submenu sem JavaScript: abre ao passar o mouse e ao chegar
                // pelo Tab (focus-within), e o item continua sendo um link.
                <div key={l.href} className="relative group">
                  <Link
                    href={l.href}
                    aria-haspopup="true"
                    className="whitespace-nowrap hover:text-foreground transition inline-flex items-center gap-1 py-6"
                  >
                    {l.label}
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="transition-transform group-hover:rotate-180 group-focus-within:rotate-180">
                      <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </Link>
                  <div className="invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 transition absolute left-1/2 -translate-x-1/2 top-full pt-1 z-40">
                    <div className="w-[560px] rounded-2xl border border-border shadow-elevated p-5 grid grid-cols-[1.4fr_1fr] gap-6" style={{ background: "var(--card)" }}>
                      {l.filhos.map((g) => (
                        <div key={g.titulo}>
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">{g.titulo}</p>
                          <ul className="grid gap-0.5">
                            {g.links.map((f) => (
                              <li key={f.href}>
                                <Link href={f.href} className="block rounded-lg px-2.5 py-2 -mx-2.5 hover:bg-[color:var(--superficie)] transition">
                                  <span className="block text-sm font-medium text-foreground">{f.label}</span>
                                  {f.nota && <span className="block text-xs text-muted mt-0.5">{f.nota}</span>}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link key={l.href} href={l.href} className="whitespace-nowrap hover:text-foreground transition">
                  {l.label}
                </Link>
              )
            )}
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
            {modo === "morador" ? (
              // O morador não é cliente: o topo não lhe oferece proposta, e
              // a volta ao site da prefeitura já está na chave da página.
              // Repetir aqui seriam dois botões para o mesmo lugar.
              null
            ) : sessao ? (
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
