"use client";

import { useRef, useState } from "react";

// ── A CHAVE DE CONSULTA EM CAIXAS ──
//
// A chave tem 8 caracteres de um alfabeto sem I, O, 0 e 1
// (lib/atendimento.ts), e era digitada num campo comum, onde é fácil pular
// ou repetir um caractere. Em caixas, um por caixa, como os códigos de
// verificação dos aplicativos: a pessoa vê quantos faltam, o foco anda
// sozinho, colar a chave inteira preenche tudo e o apagar volta uma caixa.
//
// O valor vai para o formulário num campo escondido com o nome "chave",
// então a ação do servidor não muda. Letra minúscula vira maiúscula; o que
// não existe no alfabeto é ignorado, e "0" e "O" viram nada em vez de um
// caractere errado.

//
// O mesmo componente serve ao código de acesso do login (6 dígitos):
// `tamanho`, `padrao` e `numerico` mudam, o comportamento é o mesmo.

const ALFABETO = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]$/;

export default function CampoChave({
  nome = "chave",
  inicial = "",
  estado = "neutro",
  rotuloId,
  tamanho: TAMANHO = 8,
  padrao = ALFABETO,
  numerico = false,
  aoCompletar,
  aoMudar,
  autoFocar = false,
}: {
  nome?: string;
  inicial?: string;
  /** "certo" e "errado" vêm do resultado da consulta. */
  estado?: "neutro" | "certo" | "errado";
  /** id do rótulo visível do grupo. */
  rotuloId: string;
  tamanho?: number;
  /** Um caractere aceito. */
  padrao?: RegExp;
  numerico?: boolean;
  /** Chamado quando a última caixa é preenchida. */
  aoCompletar?: (valor: string) => void;
  /** Qualquer mudança: serve para tirar o vermelho do "errado" ao corrigir. */
  aoMudar?: () => void;
  autoFocar?: boolean;
}) {
  const limpo = (t: string) =>
    t
      .toUpperCase()
      .split("")
      .filter((c) => padrao.test(c))
      .join("")
      .slice(0, TAMANHO);
  const [valor, setValor] = useState(() => limpo(inicial));
  const caixas = useRef<(HTMLInputElement | null)[]>([]);

  function focar(i: number) {
    const alvo = caixas.current[Math.max(0, Math.min(TAMANHO - 1, i))];
    alvo?.focus();
    alvo?.select();
  }

  function escrever(i: number, texto: string) {
    const novos = limpo(texto);
    if (!novos) return;
    const letras = valor.padEnd(TAMANHO, " ").split("");
    for (let k = 0; k < novos.length && i + k < TAMANHO; k++) letras[i + k] = novos[k];
    const final = letras.join("").replace(/\s+$/, "");
    setValor(final);
    aoMudar?.();
    focar(i + novos.length);
    if (aoCompletar && final.length === TAMANHO && !final.includes(" ")) aoCompletar(final);
  }

  function apagar(i: number) {
    const letras = valor.padEnd(TAMANHO, " ").split("");
    if (letras[i] && letras[i] !== " ") {
      letras[i] = " ";
      setValor(letras.join("").replace(/\s+$/, ""));
      aoMudar?.();
      return;
    }
    if (i > 0) {
      letras[i - 1] = " ";
      setValor(letras.join("").replace(/\s+$/, ""));
      aoMudar?.();
      focar(i - 1);
    }
  }

  return (
    <div role="group" aria-labelledby={rotuloId} data-estado={estado}>
      <input type="hidden" name={nome} value={valor.replace(/\s/g, "")} />
      <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${TAMANHO}, minmax(0, 1fr))`, maxWidth: TAMANHO * 55 }}>
        {Array.from({ length: TAMANHO }, (_, i) => {
          const c = valor[i] && valor[i] !== " " ? valor[i] : "";
          return (
            <input
              key={i}
              ref={(el) => {
                caixas.current[i] = el;
              }}
              value={c}
              inputMode={numerico ? "numeric" : "text"}
              autoCapitalize={numerico ? "off" : "characters"}
              autoFocus={autoFocar && i === 0}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              spellCheck={false}
              maxLength={TAMANHO}
              aria-label={`Caractere ${i + 1} de ${TAMANHO}`}
              data-cheia={c ? "1" : "0"}
              style={{ "--i": i } as React.CSSProperties}
              className="caixa-chave h-12 sm:h-14 w-full min-w-0 rounded-xl text-center font-mono text-lg sm:text-xl font-semibold uppercase"
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const t = e.target.value;
                if (t === "") return;
                // Ao digitar sobre um caractere selecionado vem só o novo; ao
                // colar, vem a chave inteira.
                escrever(i, t.length > 1 && c && t.startsWith(c) ? t.slice(1) : t);
              }}
              onPaste={(e) => {
                e.preventDefault();
                escrever(i, e.clipboardData.getData("text"));
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace") {
                  e.preventDefault();
                  apagar(i);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  focar(i - 1);
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  focar(i + 1);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
