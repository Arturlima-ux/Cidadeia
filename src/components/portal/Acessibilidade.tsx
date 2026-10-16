"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dividirEmFalas } from "@/lib/leitura-em-voz";

// ── ACESSIBILIDADE DO PORTAL ──
//
// Os sites de prefeitura falham justamente com quem mais precisa deles:
// letra miúda, contraste fraco, carrossel que não para, nada para quem
// enxerga mal. Aqui, num botão sempre à mão:
//
//   - Ouvir a página: a voz do próprio celular lê o portal, seção por
//     seção, com pausar, pular e parar; a seção lida fica marcada na tela;
//   - Letra maior, em três passos;
//   - Alto contraste;
//   - Parar o movimento (a faixa de mensagens que corre).
//
// As escolhas ficam guardadas no aparelho para a próxima visita.

const CHAVE = "cidadeia:acessibilidade";
const ESCALAS = [100, 115, 130, 145];

type Preferencias = { escala: number; contraste: boolean; parado: boolean };
const PADRAO: Preferencias = { escala: 0, contraste: false, parado: false };

function lerPreferencias(): Preferencias {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? { ...PADRAO, ...(JSON.parse(bruto) as Partial<Preferencias>) } : PADRAO;
  } catch {
    return PADRAO;
  }
}

/** O texto de uma seção, sem botões, campos, ícones e o que é só decoração. */
function textoDaSecao(el: HTMLElement): string {
  const copia = el.cloneNode(true) as HTMLElement;
  copia.querySelectorAll("button, input, select, textarea, label, svg, form, nav, [aria-hidden='true'], .sr-only").forEach((n) => n.remove());
  // Link que é botão (fazer pedido, como chegar) é ação, não conteúdo.
  copia.querySelectorAll("a").forEach((a) => {
    if (!a.closest("p")) a.remove();
  });
  // Número que conta na tela: a voz lê o valor final, e não o zero de antes
  // de a seção aparecer.
  copia.querySelectorAll<HTMLElement>("[data-valor-final]").forEach((n) => {
    n.textContent = n.dataset.valorFinal ?? n.textContent;
  });
  // Cada bloco termina em ponto, para a voz respirar entre título e texto.
  copia.querySelectorAll("h1, h2, h3, p, li").forEach((n) => {
    const t = n.textContent?.trim() ?? "";
    // Um número sozinho ("42", "81%") emenda com o rótulo que vem depois:
    // "42 mensagens de moradores", e não "42. Mensagens".
    if (t && !/[.!?:]$/.test(t) && !/^[\d.,%R$\s—-]+$/.test(t)) n.append(". ");
    else n.append(" ");
  });
  return copia.textContent ?? "";
}

function secoesDoPortal(): HTMLElement[] {
  const cabecalho = document.querySelector<HTMLElement>("#portal-raiz > header");
  const partes = Array.from(document.querySelectorAll<HTMLElement>("#conteudo > [id]"));
  return [cabecalho, ...partes].filter((x): x is HTMLElement => !!x && x.offsetParent !== null);
}

function tituloDaSecao(el: HTMLElement): string {
  return el.querySelector("h1, h2")?.textContent?.trim() ?? "Seção";
}

type Fila = { secoes: HTMLElement[]; indice: number; sessao: number };
type AoLer = (estado: { titulo: string; pausado: boolean } | null) => void;

/** Lê uma seção e, ao terminar, a seguinte, até o fim do portal ou até alguém parar. */
function lerSecao(fila: Fila, indice: number, aoLer: AoLer) {
  const { secoes, sessao } = fila;
  document.querySelectorAll(".portal-lendo").forEach((n) => n.classList.remove("portal-lendo"));
  const el = secoes[indice];
  if (!el) {
    aoLer(null);
    return;
  }
  fila.indice = indice;
  el.classList.add("portal-lendo");
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  aoLer({ titulo: tituloDaSecao(el), pausado: false });

  const falas = dividirEmFalas(textoDaSecao(el));
  if (!falas.length) {
    lerSecao(fila, indice + 1, aoLer);
    return;
  }
  const vozes = window.speechSynthesis.getVoices();
  const voz = vozes.find((v) => v.lang === "pt-BR") ?? vozes.find((v) => v.lang.startsWith("pt"));
  falas.forEach((texto, i) => {
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    if (voz) u.voice = voz;
    if (i === falas.length - 1) {
      u.onend = () => {
        // Só segue se ninguém apertou parar ou pular no meio.
        if (fila.sessao === sessao && fila.indice === indice) lerSecao(fila, indice + 1, aoLer);
      };
    }
    window.speechSynthesis.speak(u);
  });
}

export default function Acessibilidade() {
  const [aberto, setAberto] = useState(false);
  const [pref, setPref] = useState<Preferencias>(PADRAO);
  const [carregou, setCarregou] = useState(false);
  const [lendo, setLendo] = useState<{ titulo: string; pausado: boolean } | null>(null);
  const [semVoz, setSemVoz] = useState(false);
  const fila = useRef<Fila>({ secoes: [], indice: 0, sessao: 0 });

  // As preferências guardadas, na primeira abertura.
  useEffect(() => {
    const salvo = lerPreferencias();
    const id = window.requestAnimationFrame(() => {
      setPref(salvo);
      setCarregou(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  // Aplicar no portal (e lembrar). A letra mexe na raiz da página: o portal
  // inteiro é medido em rem.
  useEffect(() => {
    if (!carregou) return;
    const raiz = document.getElementById("portal-raiz");
    raiz?.classList.toggle("portal-alto-contraste", pref.contraste);
    raiz?.classList.toggle("portal-sem-movimento", pref.parado);
    document.documentElement.style.fontSize = pref.escala ? `${ESCALAS[pref.escala]}%` : "";
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(pref));
    } catch {
      // navegação privada: vale só nesta visita
    }
  }, [pref, carregou]);

  // Saindo da página, a letra volta ao normal e a voz para.
  useEffect(
    () => () => {
      document.documentElement.style.fontSize = "";
      window.speechSynthesis?.cancel();
      document.querySelectorAll(".portal-lendo").forEach((n) => n.classList.remove("portal-lendo"));
    },
    []
  );

  const parar = useCallback(() => {
    fila.current.sessao++;
    window.speechSynthesis?.cancel();
    document.querySelectorAll(".portal-lendo").forEach((n) => n.classList.remove("portal-lendo"));
    setLendo(null);
  }, []);

  function ouvir() {
    if (!("speechSynthesis" in window)) {
      setSemVoz(true);
      return;
    }
    parar();
    const secoes = secoesDoPortal();
    // Começa na seção que está na tela agora, e não sempre do topo.
    const naTela = secoes.findIndex((s) => s.getBoundingClientRect().bottom > 120);
    // O mesmo objeto, mudado no lugar: a fala cancelada ainda guarda a fila
    // antiga, e precisa enxergar a sessão nova para não continuar sozinha.
    fila.current.secoes = secoes;
    fila.current.indice = Math.max(0, naTela);
    fila.current.sessao++;
    setAberto(false);
    lerSecao(fila.current, fila.current.indice, setLendo);
  }

  function pausarOuContinuar() {
    if (!lendo) return;
    if (lendo.pausado) window.speechSynthesis.resume();
    else window.speechSynthesis.pause();
    setLendo({ ...lendo, pausado: !lendo.pausado });
  }

  function pular() {
    // A sessão nova faz o fim da fala cancelada ser ignorado.
    fila.current.sessao++;
    window.speechSynthesis.cancel();
    lerSecao(fila.current, fila.current.indice + 1, setLendo);
  }

  const botao = "rounded-full border border-border px-3.5 py-2 text-sm font-medium hover:border-brand transition";
  const ligado = (on: boolean) => (on ? { background: "var(--brand)", color: "white", borderColor: "var(--brand)" } : { background: "var(--background)" });

  return (
    <>
      {/* O tocador, enquanto lê. */}
      {lendo && (
        <div
          role="region"
          aria-label="Leitura em voz alta"
          className="fixed z-50 left-1/2 -translate-x-1/2 bottom-4 w-[min(560px,calc(100%-32px))] rounded-2xl border border-border p-3 sm:p-4 flex items-center gap-3 shadow-[var(--shadow-lg)]"
          style={{ background: "var(--card)" }}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0 portal-pulso" style={{ background: "var(--info)" }} aria-hidden />
          <p className="flex-1 min-w-0 text-sm truncate">
            <span className="text-muted">{lendo.pausado ? "Pausado:" : "Lendo:"}</span> <span className="font-medium">{lendo.titulo}</span>
          </p>
          <button type="button" onClick={pausarOuContinuar} className={botao}>
            {lendo.pausado ? "Continuar" : "Pausar"}
          </button>
          <button type="button" onClick={pular} className={`${botao} hidden sm:inline-flex`}>
            Próxima
          </button>
          <button type="button" onClick={parar} className={botao}>
            Parar
          </button>
        </div>
      )}

      {/* O botão de sempre, e o painel. */}
      {!lendo && (
        <div className="fixed z-50 right-4 bottom-4 flex flex-col items-end gap-3">
          {aberto && (
            <div
              id="painel-acessibilidade"
              role="dialog"
              aria-label="Acessibilidade"
              className="w-[min(340px,calc(100vw-32px))] rounded-3xl border border-border p-5 shadow-[var(--shadow-lg)]"
              style={{ background: "var(--card)" }}
            >
              <p className="font-semibold">Acessibilidade</p>
              <button
                type="button"
                onClick={ouvir}
                className="mt-4 w-full rounded-2xl px-4 py-3.5 font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: "var(--brand)" }}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
                </svg>
                Ouvir esta página
              </button>
              {semVoz && <p className="text-xs mt-2" style={{ color: "var(--medio)" }}>Este navegador não tem voz. Use o leitor de tela do celular.</p>}

              <div className="mt-5">
                <p className="text-sm text-muted mb-2">Tamanho da letra</p>
                <div className="flex gap-2" role="group" aria-label="Tamanho da letra">
                  {ESCALAS.map((e, i) => (
                    <button
                      key={e}
                      type="button"
                      aria-pressed={pref.escala === i}
                      onClick={() => setPref({ ...pref, escala: i })}
                      className={`${botao} flex-1`}
                      style={{ ...ligado(pref.escala === i), fontSize: `${0.8 + i * 0.12}rem` }}
                    >
                      A
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={pref.contraste} onClick={() => setPref({ ...pref, contraste: !pref.contraste })} className={botao} style={ligado(pref.contraste)}>
                  Alto contraste
                </button>
                <button type="button" aria-pressed={pref.parado} onClick={() => setPref({ ...pref, parado: !pref.parado })} className={botao} style={ligado(pref.parado)}>
                  Parar movimento
                </button>
              </div>
              {(pref.escala > 0 || pref.contraste || pref.parado) && (
                <button type="button" onClick={() => setPref(PADRAO)} className="mt-3 text-xs text-muted hover:text-foreground">
                  Voltar ao normal
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            aria-expanded={aberto}
            aria-controls="painel-acessibilidade"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-3 text-sm font-semibold shadow-[var(--shadow-md)] hover:border-brand transition"
            style={{ background: "var(--card)" }}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="4.5" r="1.8" />
              <path d="M5 8.5c2.3.7 4.6 1 7 1s4.7-.3 7-1M12 9.5V14m0 0-3 6m3-6 3 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {aberto ? "Fechar" : "Acessibilidade"}
          </button>
        </div>
      )}
    </>
  );
}
