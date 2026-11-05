"use client";

import { useEffect, useState } from "react";
import MontadorProposta from "@/components/site/MontadorProposta";
import { EVENTO_EDICAO, lerCidadeDaEdicao, type CidadeDaEdicao } from "@/lib/edicao";

// O montador da proposta já com a cidade da edição: quem escolheu a cidade
// no topo (ou ontem) não digita de novo. A cidade só existe no navegador
// (lib/edicao.ts), por isso este embrulho no cliente.
export default function MontadorDaEdicao() {
  const [cidade, setCidade] = useState<CidadeDaEdicao | null>(null);
  useEffect(() => {
    // Lido depois de montar: o servidor não sabe a cidade, e a primeira pintura tem de bater com a dele.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCidade(lerCidadeDaEdicao());
    const aoEdicao = (e: Event) => setCidade((e as CustomEvent<CidadeDaEdicao>).detail);
    window.addEventListener(EVENTO_EDICAO, aoEdicao);
    return () => window.removeEventListener(EVENTO_EDICAO, aoEdicao);
  }, []);
  return <MontadorProposta key={cidade?.codigo ?? "sem-cidade"} municipioInicial={cidade ? { nome: cidade.nome, uf: cidade.uf } : undefined} />;
}
