"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import MapaVivoAdiado from "./MapaVivoAdiado";
import { EVENTO_LEVE, semMovimento } from "@/lib/modo-leve";
import { guardarVisitante, nomeDoLocal, type LocalAproximado } from "@/lib/onde-esta";

// ── O PLANETA DO TOPO, COM O BRASIL EM CIMA ──
//
// Referência escolhida pelo fundador (outubro de 2026, quadro "CidadeIA —
// home pelas referências"): um planeta escuro com o horizonte aceso, como o
// do eezy inn, e o Brasil deitado sobre ele, um ponto por município
// (MapaVivo). Os alertas continuam piscando em rodízio pelo país, e um ponto
// fixo, na cor de localização, acende perto de onde o visitante está, pela
// conexão (lib/onde-esta.ts), sem pedir permissão.
//
// Arrastar para os lados gira o planeta (só transform, escrito direto no
// elemento, sem renderizar o React a cada quadro). Com movimento reduzido
// ou no modo leve, tudo fica parado e o arraste não liga.
//
// O desenho do planeta, das estrelas e do brilho está em globals.css
// (.heroi-planeta e vizinhos); aqui só a lógica.

const LIMITE_GIRO = 16;

// O farol de quem visita: um feixe de luz de pé sobre o ponto azul, com o
// nome da cidade no alto. Fica numa camada reta por cima do planeta, e não
// dentro do mapa: lá o mapa é inclinado em 3D, e o texto desenhado no plano
// inclinado aparecia num tipo de captura e sumia em outro. A posição vem do
// próprio marcador do visitante (MapaVivo), lida com getBoundingClientRect,
// que já devolve o ponto projetado na tela. Estilo inline: a folha global
// está no limite de tamanho (CLAUDE.md, armadilhas).
const FAROL: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: 0, height: 0, pointerEvents: "none" };
const FEIXE: React.CSSProperties = {
  position: "absolute",
  left: -1,
  bottom: 0,
  width: 2,
  height: "var(--feixe, 110px)",
  background: "linear-gradient(to top, var(--localizacao), transparent)",
};
const NOME: React.CSSProperties = {
  position: "absolute",
  left: 0,
  bottom: "calc(var(--feixe, 110px) + 6px)",
  transform: "translateX(-50%)",
  whiteSpace: "nowrap",
  padding: "5px 11px",
  borderRadius: 9999,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--foreground)",
  background: "color-mix(in oklab, var(--card) 82%, transparent)",
  border: "1px solid color-mix(in oklab, var(--localizacao) 70%, transparent)",
  boxShadow: "0 0 18px color-mix(in oklab, var(--localizacao) 45%, transparent)",
};

/** Põe o farol em cima do marcador do visitante. Devolve se achou. */
function posicionarFarol(farol: HTMLElement | null): boolean {
  if (!farol) return false;
  const marcador = document.querySelector<HTMLElement>(".planeta-mapa [data-mapa='visitante']");
  const pai = farol.parentElement;
  if (!marcador || marcador.hidden || !pai) {
    farol.hidden = true;
    return false;
  }
  const m = marcador.getBoundingClientRect();
  const p = pai.getBoundingClientRect();
  farol.style.transform = `translate(${(m.left - p.left).toFixed(1)}px, ${(m.top - p.top).toFixed(1)}px)`;
  farol.style.setProperty("--feixe", window.innerWidth < 640 ? "72px" : "110px");
  farol.hidden = false;
  return true;
}

/** Repete posicionarFarol a cada quadro por `ms` (o mapa chega depois do load; o giro tem transição). */
function seguirFarol(farol: HTMLElement | null, ms: number): () => void {
  const fim = performance.now() + ms;
  let q = 0;
  const passo = () => {
    posicionarFarol(farol);
    if (performance.now() < fim) q = requestAnimationFrame(passo);
  };
  q = requestAnimationFrame(passo);
  return () => cancelAnimationFrame(q);
}

/** Dá para girar: mouse fino, sem movimento reduzido e fora do modo leve. */
const assinar = (aviso: () => void) => {
  window.addEventListener(EVENTO_LEVE, aviso);
  return () => window.removeEventListener(EVENTO_LEVE, aviso);
};
const podeGirarAgora = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches && !semMovimento();

export default function PlanetaTopo({ destaque }: { destaque: number | null }) {
  const giro = useRef<HTMLDivElement>(null);
  const farol = useRef<HTMLDivElement>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [local, setLocal] = useState<LocalAproximado | null>(null);
  const podeGirar = useSyncExternalStore(assinar, podeGirarAgora, () => false);

  // O relógio de Brasília, ao vivo (de 15 em 15 segundos basta para os minutos).
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

  // Perto de onde o visitante está: pergunta uma vez, depois do load, com o
  // navegador livre. Sem resposta (fora do Brasil, rede local), nada acende.
  useEffect(() => {
    let vivo = true;
    const perguntar = () => {
      fetch("/api/onde-estou", { credentials: "same-origin" })
        .then((r) => (r.status === 200 ? (r.json() as Promise<LocalAproximado>) : null))
        .then((l) => {
          if (!vivo || !l) return;
          guardarVisitante(l);
          setLocal(l);
        })
        .catch(() => {});
    };
    const janela = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    const agendar = () => (janela.requestIdleCallback ? janela.requestIdleCallback(perguntar, { timeout: 2500 }) : window.setTimeout(perguntar, 300));
    if (document.readyState === "complete") agendar();
    else window.addEventListener("load", agendar, { once: true });
    return () => {
      vivo = false;
      window.removeEventListener("load", agendar);
    };
  }, []);

  // O farol acompanha o ponto: quando o local chega (o mapa pode ainda estar
  // carregando, então segue por alguns segundos) e quando a janela muda.
  useEffect(() => {
    if (!local) return;
    const parar = seguirFarol(farol.current, 6000);
    let pararResize = () => {};
    const aoMudar = () => {
      pararResize();
      pararResize = seguirFarol(farol.current, 300);
    };
    window.addEventListener("resize", aoMudar);
    return () => {
      parar();
      pararResize();
      window.removeEventListener("resize", aoMudar);
    };
  }, [local]);

  // Arrastar para girar: só com mouse, sem movimento reduzido e fora do modo leve.
  useEffect(() => {
    const el = giro.current;
    if (!el || !podeGirar) return;
    let angulo = 0;
    let inicioX = 0;
    let anguloInicial = 0;
    let arrastando = false;
    let quadro = 0;
    const aplicar = () => {
      quadro = 0;
      el.style.setProperty("--giro", `${angulo.toFixed(2)}deg`);
      posicionarFarol(farol.current);
    };
    const agarrar = (e: PointerEvent) => {
      arrastando = true;
      inicioX = e.clientX;
      anguloInicial = angulo;
      el.dataset.arrastando = "";
      el.setPointerCapture?.(e.pointerId);
    };
    const mover = (e: PointerEvent) => {
      if (!arrastando) return;
      angulo = Math.max(-LIMITE_GIRO, Math.min(LIMITE_GIRO, anguloInicial + (e.clientX - inicioX) * 0.025));
      if (!quadro) quadro = requestAnimationFrame(aplicar);
    };
    let pararFarol = () => {};
    const soltar = () => {
      arrastando = false;
      delete el.dataset.arrastando;
      // Ao soltar, o giro volta a ter transição: o farol segue até ela acabar.
      pararFarol();
      pararFarol = seguirFarol(farol.current, 700);
    };
    el.addEventListener("pointerdown", agarrar);
    el.addEventListener("pointermove", mover, { passive: true });
    el.addEventListener("pointerup", soltar);
    el.addEventListener("pointercancel", soltar);
    return () => {
      el.removeEventListener("pointerdown", agarrar);
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerup", soltar);
      el.removeEventListener("pointercancel", soltar);
      if (quadro) cancelAnimationFrame(quadro);
      pararFarol();
    };
  }, [podeGirar]);

  const perto = nomeDoLocal(local);

  return (
    <>
      <div className="planeta" aria-hidden />
      <div ref={giro} className="planeta-giro" data-pode-girar={podeGirar ? "" : undefined} aria-hidden>
        <div className="planeta-mapa">
          <MapaVivoAdiado destaque={destaque} intenso className="w-full h-full" />
        </div>
      </div>
      <div ref={farol} style={FAROL} aria-hidden hidden>
        <span style={FEIXE} />
        {local?.cidade && <span style={NOME}>{local.cidade}</span>}
      </div>
      <div className="planeta-legenda">
        {hora && <span className="tabular-nums">Brasília {hora}</span>}
        <span className="planeta-legenda-item">
          <span aria-hidden className="planeta-legenda-ponto" />
          Município
        </span>
        <span className="planeta-legenda-item">
          <span aria-hidden className="planeta-legenda-ponto planeta-legenda-voce" />
          {perto ? `Você, perto de ${perto}` : "Você"}
        </span>
        {podeGirar && <span className="planeta-legenda-dica">Arraste para girar</span>}
      </div>
    </>
  );
}
