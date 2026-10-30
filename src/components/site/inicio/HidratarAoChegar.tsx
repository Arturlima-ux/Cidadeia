"use client";

import { Suspense, use, useEffect, useRef, useSyncExternalStore } from "react";

// ── O HTML CHEGA INTEIRO; O JAVASCRIPT, QUANDO A PESSOA CHEGA PERTO ──
//
// A home tem seis telas de altura e quase tudo abaixo da primeira é
// interativo: a mesa de módulos, os três passos, o portal de exemplo, o
// vídeo, o montador de proposta. O React "hidratava" tudo de uma vez ao
// abrir: ligava cada botão e cada animação de uma página que a pessoa ainda
// nem tinha rolado. No celular simulado do Lighthouse, isso era a maior parte
// do tempo em que a página não respondia ao toque (TBT de ~530 ms, auditoria
// de SEO de outubro de 2026).
//
// Aqui o trecho continua vindo pronto do servidor (texto, links, tudo
// legível e indexável, inclusive sem JavaScript), mas o React só o liga
// quando ele chega a 600 px da tela, ou antes, no primeiro toque ou foco
// dentro dele. Como funciona: durante a hidratação, o componente de dentro
// suspende numa promessa que só se resolve nessa hora, e um trecho suspenso
// na hidratação fica com o HTML do servidor como está. Fora da hidratação
// (navegação dentro do site) nada espera.

type Portao = { aberto: boolean; promessa: Promise<void>; abrir: () => void };
const portoes = new Map<string, Portao>();

function portao(id: string): Portao {
  const existente = portoes.get(id);
  if (existente) return existente;
  let resolver: () => void = () => {};
  const promessa = new Promise<void>((r) => {
    resolver = r;
  });
  const novo: Portao = {
    aberto: false,
    promessa,
    abrir: () => {
      novo.aberto = true;
      resolver();
    },
  };
  portoes.set(id, novo);
  return novo;
}

// ── E ANTES QUE A PESSOA ROLE (revisão de outubro de 2026) ──
// Ligar o trecho só quando ele chega fazia o trabalho cair justo no meio da
// rolagem: com a CPU 4x mais lenta (o computador de muita prefeitura), a
// primeira descida pela home caía para 30 quadros por segundo, com quadros
// de 200 a 400 ms, e a segunda descida, com tudo já ligado, ia a 51. Com o
// JavaScript bloqueado, a primeira descida ia a 57: o peso era ligar.
// Agora, depois que a página termina de carregar, os trechos são ligados um
// de cada vez quando o navegador fica ocioso (requestIdleCallback), na ordem
// da página. A chegada perto da tela continua ligando na hora, se a pessoa
// rolar antes.
const fila: string[] = [];
let filaAgendada = false;
/** Espera depois do carregamento, para não disputar com o que é da primeira tela. */
const ESPERA_INICIAL = 1500;
/** Intervalo entre um trecho e o seguinte, para o React terminar de ligar o anterior. */
const INTERVALO = 250;

type JanelaOciosa = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

function quandoOcioso(fn: () => void) {
  const janela = window as JanelaOciosa;
  if (janela.requestIdleCallback) janela.requestIdleCallback(fn);
  else window.setTimeout(fn, 200);
}

function proximoDaFila() {
  let id = fila.shift();
  while (id && portao(id).aberto) id = fila.shift();
  if (!id) {
    filaAgendada = false;
    return;
  }
  portao(id).abrir();
  window.setTimeout(() => quandoOcioso(proximoDaFila), INTERVALO);
}

function entrarNaFila(id: string) {
  fila.push(id);
  if (filaAgendada) return;
  filaAgendada = true;
  const comecar = () => window.setTimeout(() => quandoOcioso(proximoDaFila), ESPERA_INICIAL);
  if (document.readyState === "complete") comecar();
  else window.addEventListener("load", comecar, { once: true });
}

const semAssinatura = () => () => {};
/** Verdadeiro só durante a hidratação (o React usa o retrato "do servidor"). */
function useHidratando(): boolean {
  return useSyncExternalStore(
    semAssinatura,
    () => false,
    () => true
  );
}

function Espera({ id, children }: { id: string; children: React.ReactNode }) {
  const hidratando = useHidratando();
  if (hidratando && typeof window !== "undefined") {
    const p = portao(id);
    if (!p.aberto) use(p.promessa);
  }
  return children;
}

export default function HidratarAoChegar({
  id,
  children,
  className,
  margem = "600px",
}: {
  /** Único na página: liga o invólucro ao trecho que ele segura. */
  id: string;
  children: React.ReactNode;
  className?: string;
  margem?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = portao(id);
    const el = caixa.current;
    if (p.aberto || !el || typeof IntersectionObserver === "undefined") {
      p.abrir();
      return;
    }
    const abrir = () => {
      p.abrir();
      io.disconnect();
    };
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && abrir(), {
      rootMargin: `${margem} 0px ${margem} 0px`,
    });
    io.observe(el);
    entrarNaFila(id);
    // Toque ou teclado dentro do trecho antes de ele chegar perto (link de
    // âncora, Tab rápido): liga na hora.
    el.addEventListener("pointerdown", abrir, { capture: true, once: true });
    el.addEventListener("focusin", abrir, { capture: true, once: true });
    return () => {
      io.disconnect();
      el.removeEventListener("pointerdown", abrir, { capture: true });
      el.removeEventListener("focusin", abrir, { capture: true });
    };
  }, [id, margem]);

  return (
    <div ref={caixa} className={className}>
      <Suspense fallback={null}>
        <Espera id={id}>{children}</Espera>
      </Suspense>
    </div>
  );
}
