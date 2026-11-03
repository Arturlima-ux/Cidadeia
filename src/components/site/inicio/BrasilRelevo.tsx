"use client";

import { useEffect, useRef, useState } from "react";
import { EVENTO_LEVE, semMovimento } from "@/lib/modo-leve";
import { EVENTO_VISITANTE, guardarVisitante, lerVisitante, nomeDoLocal, type LocalAproximado } from "@/lib/onde-esta";
import type { CenaBrasil } from "./brasil-relevo-cena";
import { ARQUIVOS_DA_ABERTURA } from "./relevo-abertura";

// ── O BRASIL EM RELEVO DO TOPO (o palco do 3D) ──
//
// O texto do topo chega pronto do servidor (TopoBrasil.tsx); aqui fica só o
// palco: a tela do 3D, o rótulo do visitante, a pílula de ação e a legenda.
// O three.js, a cena (brasil-relevo-cena.ts) e o relevo leve começam a baixar
// assim que a página hidrata, em baixa prioridade, em paralelo; a cena só é
// montada depois do load. Antes tudo esperava o load e o navegador livre, e
// depois baixava em fila (código, depois imagens): o mapa demorava. A
// primeira pintura e o maior conteúdo continuam sendo o texto.
//
// O visitante: /api/onde-estou devolve a cidade aproximada pela conexão
// (cabeçalhos da Vercel), sem pedir permissão e sem gravar nada. Só quem
// visita vê o seu ponto. Sem resposta (fora do Brasil, rede local), o mapa
// fica só com as capitais.
//
// Modo leve ou movimento reduzido: um quadro parado, sem laço de animação.
// Se o modo leve ligar no meio da visita (ModoLeve mediu quadros lentos), a
// cena para na hora.

export default function BrasilRelevo() {
  const palco = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const rotulo = useRef<HTMLDivElement>(null);
  const cena = useRef<CenaBrasil | null>(null);
  const [local, setLocal] = useState<LocalAproximado | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [semTresD, setSemTresD] = useState(false);
  const [gira, setGira] = useState(false);

  // O relógio de Brasília (de 15 em 15 s basta para os minutos).
  useEffect(() => {
    const ler = () => {
      try {
        setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }));
      } catch {
        setHora(null);
      }
    };
    ler();
    const t = window.setInterval(ler, 15000);
    return () => window.clearInterval(t);
  }, []);

  // Depois do load, com o navegador livre: a cena e o local do visitante.
  useEffect(() => {
    let vivo = true;
    const janela = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    const quandoLivre = (f: () => void) => (janela.requestIdleCallback ? janela.requestIdleCallback(f, { timeout: 700 }) : window.setTimeout(f, 200));

    // Já começa a baixar: o código da cena e as imagens da abertura.
    const modulo = import("./brasil-relevo-cena");
    for (const src of ARQUIVOS_DA_ABERTURA) {
      const i = new Image();
      i.fetchPriority = "low";
      i.src = src;
    }

    const montar = async () => {
      if (!palco.current || !tela.current || !rotulo.current) return;
      try {
        const { montarBrasil } = await modulo;
        if (!vivo || !palco.current || !tela.current || !rotulo.current) return;
        const c = await montarBrasil({
          palco: palco.current,
          tela: tela.current,
          rotulo: rotulo.current,
          parado: semMovimento,
          aoPronto: () => setPronto(true),
        });
        if (!vivo) return c.destruir();
        cena.current = c;
        setGira(palco.current.hasAttribute("data-gira"));
        const ja = lerVisitante();
        if (ja) {
          setLocal(ja);
          requestAnimationFrame(() => c.definirVisitante(ja));
        }
      } catch {
        // Sem WebGL (ou a cena falhou): o topo continua inteiro, só sem o mapa.
        if (vivo) setSemTresD(true);
      }
    };
    const perguntarLocal = () => {
      fetch("/api/onde-estou", { credentials: "same-origin" })
        .then((r) => (r.status === 200 ? (r.json() as Promise<LocalAproximado>) : null))
        .then((l) => {
          if (vivo && l) guardarVisitante(l);
        })
        .catch(() => {});
    };
    const comecar = () => quandoLivre(() => { void montar(); perguntarLocal(); });
    if (document.readyState === "complete") comecar();
    else window.addEventListener("load", comecar, { once: true });

    const aoVisitante = (e: Event) => {
      const l = (e as CustomEvent<LocalAproximado>).detail;
      setLocal(l);
      // Depois que o rótulo aparece, para a cena medir a largura dele.
      requestAnimationFrame(() => cena.current?.definirVisitante(l));
    };
    const aoLeve = () => cena.current?.parar();
    window.addEventListener(EVENTO_VISITANTE, aoVisitante);
    window.addEventListener(EVENTO_LEVE, aoLeve);
    return () => {
      vivo = false;
      window.removeEventListener("load", comecar);
      window.removeEventListener(EVENTO_VISITANTE, aoVisitante);
      window.removeEventListener(EVENTO_LEVE, aoLeve);
      cena.current?.destruir();
      cena.current = null;
    };
  }, []);

  const nome = nomeDoLocal(local);
  return (
    <div ref={palco} className="topo3d-palco" data-pronto={pronto ? "" : undefined}>
      <canvas
        ref={tela}
        className="topo3d-tela"
        role="img"
        aria-label={`O Brasil em relevo de grafite, com as capitais acesas em roxo${nome ? ` e, em azul, você, em ${nome}` : ""}`}
      />
      <div ref={rotulo} className="topo3d-voce" aria-hidden hidden={!nome}>
        <i className="topo3d-ponto-voce" />
        <span>
          Você está em <b>{nome}</b>
        </span>
      </div>
      <a href="#proposta" className="topo3d-pilula">
        Receber proposta <span className="topo3d-seta" aria-hidden>→</span>
      </a>
      <div className="topo3d-rodape" aria-hidden>
        <span className="topo3d-legenda">
          {hora && <span>Brasília {hora}</span>}
          {!semTresD && (
            <>
              <span><i className="topo3d-ponto-cap" />Capitais</span>
              {nome && <span><i className="topo3d-ponto-voce" />Você</span>}
            </>
          )}
        </span>
        {gira && <span>Arraste para girar</span>}
      </div>
    </div>
  );
}
