"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// ── QUEM ROLA É O CONTEÚDO, NÃO A PÁGINA ──
//
// Com a coluna do conteúdo rolando por conta própria, o navegador não
// reposiciona nada ao trocar de rota: você abria a tela seguinte já no
// meio dela. Este componente leva a coluna de volta ao topo a cada
// navegação — é o que o navegador faria se a página inteira rolasse.

export const ID_CONTEUDO_PAINEL = "conteudo-painel";

export default function RolagemDoPainel() {
  const pathname = usePathname();
  useEffect(() => {
    // Duas vezes de propósito: agora e depois da primeira pintura. O Next
    // restaura a posição de rolagem DEPOIS do efeito, e um único ajuste
    // era desfeito por ele — a tela seguinte abria no meio.
    const aoTopo = () => document.getElementById(ID_CONTEUDO_PAINEL)?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    aoTopo();
    const id = requestAnimationFrame(() => requestAnimationFrame(aoTopo));
    return () => cancelAnimationFrame(id);
  }, [pathname]);
  return null;
}
