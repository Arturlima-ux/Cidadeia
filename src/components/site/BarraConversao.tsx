"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarcaCompleta } from "@/components/site/MarcaQuadra";

/**
 * A chamada para ação volta à tela depois que o herói sai.
 *
 * O critério é comportamental: quem rolou uma tela inteira já demonstrou
 * interesse, e é aí que faz sentido reaparecer. Antes disso a barra só
 * roubaria espaço da primeira impressão.
 *
 * No topo em telas largas, no rodapé no celular — onde o polegar alcança.
 */
export default function BarraConversao() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let pendente = false;

    function medir() {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        pendente = false;
        setVisivel(window.scrollY > window.innerHeight * 0.7);
      });
    }

    window.addEventListener("scroll", medir, { passive: true });
    medir();
    return () => window.removeEventListener("scroll", medir);
  }, []);

  return (
    <>
      {/* topo — telas largas */}
      <div
        className={`hidden sm:block fixed top-0 inset-x-0 z-40 border-b transition-transform duration-300 ${
          visivel ? "translate-y-0 border-border" : "-translate-y-full border-transparent"
        }`}
        // Opaca, sem desfoque de fundo. Esta barra é FIXA: com backdrop-filter,
        // o navegador reamostrava e reborrava a página inteira atrás dela a
        // cada quadro — o efeito mais caro possível, no elemento que passa mais
        // tempo na tela. Sobre fundo escuro, 84% e opaco são quase idênticos.
        style={{ background: "var(--background)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-[62px] flex items-center justify-between gap-4">
          <Link href="/" aria-label="CidadeIA — início">
            <MarcaCompleta tamanho={24} />
          </Link>
          {/* Esta barra cobre o cabeçalho quando aparece, ocupando o mesmo
              lugar na tela. Enquanto o botão cheio de uma dizia "Ver quanto
              custa" e o da outra "Falar com especialista", o caminho
              principal do site trocava sozinho conforme a rolagem — que é
              exatamente a confusão de ter dois CTAs concorrentes.

              A ação cheia agora é a MESMA nas duas, e é a que realmente
              fecha: contratação em prefeitura passa por proposta, processo e
              empenho. Preço e kit continuam a um clique, como links. */}
          <div className="flex items-center gap-5">
            <Link
              href="#proposta"
              className="hidden lg:inline text-sm font-semibold text-muted hover:text-foreground transition"
            >
              Ver quanto custa
            </Link>
            <Link
              href="/kit"
              className="hidden md:inline text-sm font-semibold text-muted hover:text-foreground transition"
            >
              Kit de contratação
            </Link>
            {/* Esta barra cobre o cabeçalho enquanto a página rola — e com ele
                some o único caminho do morador. Ele volta aqui, discreto: quem
                está avaliando a compra ignora, e quem procurava o portal não
                fica preso numa página de vendas. */}
            <Link
              href="/transparencia"
              className="hidden md:inline text-sm font-semibold text-muted hover:text-foreground transition"
            >
              Portal do cidadão
            </Link>
            {/* Dizia "Falar com especialista" — a mesma exigência que a página
                inteira acusa a concorrência de fazer, no botão que passa mais
                tempo na tela. O destino sempre foi o mesmo do fecho; só a
                promessa era outra, e a errada.

                Agora as duas ações cheias dizem a mesma coisa porque levam ao
                mesmo lugar. Promessa diferente para o mesmo destino faz o
                visitante achar que são caminhos distintos e hesitar entre eles. */}
            <Link
              href="/suporte?assunto=proposta"
              className="text-sm font-bold text-white bg-brand hover:bg-brand-dark rounded-xl px-5 py-2.5 transition shadow-elevated"
            >
              Receber proposta
            </Link>
          </div>
        </div>
      </div>

      {/* rodapé — celular */}
      <div
        className={`sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border px-4 py-3 flex items-center gap-3 transition-transform duration-300 ${
          visivel ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ background: "var(--background)" }}
      >
        <span className="text-xs text-muted leading-tight flex-1">
          Proposta com valor, kit e base legal — no mesmo e-mail.
        </span>
        {/* "Falar" era o resto de quando o botão do desktop dizia "Falar com
            especialista". Sozinho ele promete conversa, que é justamente o que
            a página diz não ser necessário. Mesmo destino, mesma palavra dos
            outros dois. */}
        <Link
          href="/suporte?assunto=proposta"
          className="shrink-0 text-sm font-bold text-white bg-brand rounded-xl px-4 py-2.5"
        >
          Proposta
        </Link>
      </div>
    </>
  );
}
