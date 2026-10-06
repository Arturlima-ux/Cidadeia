"use client";

import { useEffect, useRef, useState } from "react";

// ── O VÍDEO QUE EXPLICA ──
//
// Fica entre "Não peça fé" e "Proposta pronta": é o último empurrão antes do
// pedido de proposta, e o que o secretário manda para o prefeito.
//
// Peso zero até a pessoa chegar: preload="none" e só a imagem de capa. Quando
// o vídeo entra na tela, começa a tocar sem som (o navegador só deixa tocar
// sozinho assim, e no celular a maioria assiste sem som mesmo); sai da tela,
// pausa. Um botão liga o som e recomeça do início. Quem pediu menos movimento
// no sistema vê a capa e dá o play quando quiser.

export default function VideoExplicativo({ src, srcWebm, capa, titulo }: { src: string; srcWebm?: string; capa: string; titulo: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [comSom, setComSom] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.45 }
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, []);

  function ligarSom() {
    const v = video.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    v.play().catch(() => {});
    setComSom(true);
  }

  return (
    <figure className="relative rounded-[28px] overflow-hidden border border-border" style={{ background: "var(--card)" }}>
      <video
        ref={video}
        poster={capa}
        muted={!comSom}
        loop={!comSom}
        playsInline
        preload="none"
        controls={comSom}
        aria-label={titulo}
        className="block w-full aspect-video object-cover"
      >
        {/* MP4 (H.264) primeiro: toca em tudo, inclusive iPhone. O WebM é a
            reserva para navegador sem H.264. */}
        <source src={src} type="video/mp4" />
        {srcWebm && <source src={srcWebm} type="video/webm" />}
      </video>
      {!comSom && (
        <button
          type="button"
          onClick={ligarSom}
          className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium backdrop-blur-md transition hover:opacity-90"
          style={{ background: "color-mix(in oklab, var(--background) 65%, transparent)", color: "var(--foreground)" }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
          </svg>
          Assistir com som
        </button>
      )}
    </figure>
  );
}
