"use client";

import { useEffect, useState } from "react";

// ── OS CAPÍTULOS E O ENVIO DO VÍDEO (novembro de 2026) ──
//
// Embaixo do vídeo de 30 s: cinco capítulos que pulam para o trecho (os
// tempos saem dos quadros do próprio vídeo) e o botão de mandar o vídeo para
// quem decide, que o texto da seção já prometia. No celular, o envio abre a
// folha de compartilhar do aparelho; no computador, copia o link. O WhatsApp
// fica ao lado, como link comum, porque é por ali que a prefeitura conversa.

export const CAPITULOS = [
  { t: 5, rotulo: "Cada parte num canto" },
  { t: 11, rotulo: "Num lugar só" },
  { t: 17, rotulo: "A tela do prefeito" },
  { t: 21, rotulo: "O morador no celular" },
  { t: 25, rotulo: "As bases oficiais" },
] as const;

// Estilo junto do componente: globals.css está perto do limite (CLAUDE.md).
const ESTILO = `
.video-capitulos { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px 32px; margin-top: 20px; }
.video-capitulos ol { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.video-capitulos ol button { display: inline-flex; align-items: baseline; gap: 8px; min-height: 40px; padding: 8px 14px; border-radius: 9999px; border: 1px solid var(--border); background: transparent; color: color-mix(in oklab, var(--foreground) 78%, transparent); font-size: 14px; transition: color 160ms var(--saida), border-color 160ms var(--saida), background-color 160ms var(--saida); }
.video-capitulos ol button span { font-variant-numeric: tabular-nums; font-size: 12.5px; color: var(--muted); }
.video-capitulos ol button[aria-current] { color: var(--foreground); border-color: color-mix(in oklab, var(--brand-claro) 55%, transparent); background: color-mix(in oklab, var(--brand) 14%, transparent); }
@media (hover: hover) and (pointer: fine) { .video-capitulos ol button:hover { color: var(--foreground); border-color: color-mix(in oklab, var(--foreground) 35%, transparent); } }
.video-capitulos button:focus-visible, .video-enviar a:focus-visible { outline: 2px solid var(--brand-claro); outline-offset: 2px; }
.video-enviar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; }
.video-enviar > button { min-height: 44px; padding: 0 20px; border-radius: 9999px; background: var(--foreground); color: var(--background); font-size: 14.5px; font-weight: 600; transition: transform 160ms var(--saida); }
.video-enviar > button:active { transform: scale(0.97); }
.video-enviar a { font-size: 14.5px; text-decoration: underline; text-underline-offset: 3px; color: var(--foreground); }
.video-link { font-size: 13px; color: var(--muted); user-select: all; }
@media (max-width: 639px) { .video-capitulos ol { flex-wrap: nowrap; overflow-x: auto; margin-inline: -16px; padding-inline: 16px; scrollbar-width: none; } .video-capitulos ol button { white-space: nowrap; } }
@media (prefers-reduced-motion: reduce) { .video-capitulos ol button, .video-enviar > button { transition: none; } }
`;

const SITE = (process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app").replace(/\/$/, "");
const TEXTO = "O CidadeIA em 30 segundos: a gestão municipal inteira, num lugar só.";

export default function CapitulosDoVideo({ idVideo }: { idVideo: string }) {
  const [atual, setAtual] = useState(-1);
  const [copiado, setCopiado] = useState(false);
  const [semCopiar, setSemCopiar] = useState<string | null>(null);

  useEffect(() => {
    const v = document.getElementById(idVideo) as HTMLVideoElement | null;
    if (!v) return;
    const aoTempo = () => {
      let i = -1;
      CAPITULOS.forEach((c, k) => {
        if (v.currentTime >= c.t) i = k;
      });
      setAtual(i);
    };
    v.addEventListener("timeupdate", aoTempo);
    return () => v.removeEventListener("timeupdate", aoTempo);
  }, [idVideo]);

  function pular(t: number) {
    const v = document.getElementById(idVideo) as HTMLVideoElement | null;
    if (!v) return;
    v.currentTime = t;
    v.play().catch(() => {});
  }

  async function enviar() {
    const url = `${window.location.origin}/#video`;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await nav.share({ title: "CidadeIA", text: TEXTO, url });
        return;
      } catch {
        // A pessoa fechou a folha: cai no copiar.
      }
    }
    try {
      await navigator.clipboard.writeText(`${TEXTO} ${url}`);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2400);
    } catch {
      setSemCopiar(url);
    }
  }

  // O endereço público do site (o mesmo dos e-mails); no clique, vale o da página aberta.
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${TEXTO} ${SITE}/#video`)}`;
  const aoWhatsapp = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(`${TEXTO} ${window.location.origin}/#video`)}`;
  };

  return (
    <div className="video-capitulos">
      <style href="cidadeia-video-capitulos" precedence="medium">{ESTILO}</style>
      <ol aria-label="Capítulos do vídeo">
        {CAPITULOS.map((c, k) => (
          <li key={c.t}>
            <button type="button" onClick={() => pular(c.t)} aria-current={atual === k ? "step" : undefined}>
              <span>0:{String(c.t).padStart(2, "0")}</span>
              {c.rotulo}
            </button>
          </li>
        ))}
      </ol>
      <div className="video-enviar">
        <button type="button" onClick={enviar}>
          {copiado ? "Link copiado" : "Enviar para quem decide"}
        </button>
        <a href={whatsapp} onClick={aoWhatsapp} target="_blank" rel="noopener noreferrer">
          Pelo WhatsApp
        </a>
        {semCopiar && <span className="video-link">{semCopiar}</span>}
        <span className="sr-only" aria-live="polite">{copiado ? "Link do vídeo copiado." : ""}</span>
      </div>
    </div>
  );
}
