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
    document.getElementById(ID_CONTEUDO_PAINEL)?.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}
