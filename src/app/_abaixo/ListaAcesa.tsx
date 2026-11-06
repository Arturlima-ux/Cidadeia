"use client";

import { useState } from "react";
import Link from "next/link";
import type { ModuloAbaixo } from "./dados";

// A lista grande dos seis módulos (estrutura A, referência: Lazarev, "Splash").
// Uma linha acesa por vez: passa o mouse, o foco do teclado ou toca, e ela
// acende em brasa e abre o que o módulo faz. Sem script, todas abrem por link.
export default function ListaAcesa({ modulos, inicial = 1 }: { modulos: ModuloAbaixo[]; inicial?: number }) {
  const [acesa, setAcesa] = useState(inicial);
  return (
    <ol className="ea-lista">
      {modulos.map((m, i) => (
        <li key={m.chave} data-acesa={acesa === i ? "" : undefined} onMouseEnter={() => setAcesa(i)}>
          <Link href={`/solucoes#${m.chave}`} onFocus={() => setAcesa(i)} onClick={(e) => { if (acesa !== i) { e.preventDefault(); setAcesa(i); } }}>
            <span className="ea-idx">{String(i + 1).padStart(2, "0")}</span>
            <span className="ea-nome">{m.nome}</span>
            <span className="ea-pergunta">{m.pergunta}</span>
            <span className="ea-seta" aria-hidden>→</span>
          </Link>
          <div className="ea-abre" aria-hidden={acesa !== i}>
            <ul>
              {m.capacidades.slice(0, 3).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
}
