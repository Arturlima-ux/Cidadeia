"use client";

import { useEffect, useState } from "react";
import { EVENTO_EDICAO, lerCidadeDaEdicao, type CidadeDaEdicao } from "@/lib/edicao";

// No celular a tabela de preços não cabe com as três colunas. Em vez de rolar
// de lado, mostra uma coluna por vez: estes três botões trocam o porte
// (data-ver na tabela). Começa no porte da cidade escolhida, se houver.
const PORTES = [
  { chave: "ate10k", rotulo: "Até 10 mil" },
  { chave: "de10a50k", rotulo: "10 a 50 mil" },
  { chave: "de50a100k", rotulo: "50 a 100 mil" },
] as const;

export default function PorteDaTabela() {
  const [ver, setVer] = useState<string>("ate10k");

  useEffect(() => {
    const doPorte = (c: CidadeDaEdicao | null) => {
      if (c?.porte && PORTES.some((p) => p.chave === c.porte)) setVer(c.porte);
    };
    doPorte(lerCidadeDaEdicao());
    const aoEdicao = (e: Event) => doPorte((e as CustomEvent<CidadeDaEdicao>).detail);
    window.addEventListener(EVENTO_EDICAO, aoEdicao);
    return () => window.removeEventListener(EVENTO_EDICAO, aoEdicao);
  }, []);

  useEffect(() => {
    const tabela = document.querySelector<HTMLElement>("[data-tabela-precos]");
    if (tabela) tabela.dataset.ver = ver;
  }, [ver]);

  return (
    <div className="nv-porte-escolha" role="group" aria-label="Número de habitantes">
      {PORTES.map((p) => (
        <button key={p.chave} type="button" aria-pressed={ver === p.chave} onClick={() => setVer(p.chave)}>
          {p.rotulo}
        </button>
      ))}
    </div>
  );
}
