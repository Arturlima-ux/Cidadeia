"use client";

import { useEffect, useRef } from "react";

// ── A ILHA QUE NÃO CARREGA NADA ──
//
// Sem JavaScript, escolher o estado e apertar o botão recarrega a página com a
// lista daquele estado; é o caminho de dois envios, e ele funciona.
//
// Com JavaScript, isto envia sozinho na troca do estado e o visitante percebe
// um gesto só. O componente não importa módulo de dado nenhum de propósito:
// `tests/tabela-fica-no-servidor.test.ts` proíbe que um arquivo "use client"
// alcance a tabela dos municípios, direta ou indiretamente, e a razão é que
// ela tem 200 KB.

export default function EnviaAoTrocar() {
  const marca = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const campo = marca.current?.closest("label")?.querySelector("select");
    if (!campo) return;
    const enviar = () => campo.form?.requestSubmit();
    campo.addEventListener("change", enviar);
    return () => campo.removeEventListener("change", enviar);
  }, []);

  return <span ref={marca} hidden aria-hidden />;
}
