"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ── A ILHA QUE NÃO CARREGA NADA ──
//
// Sem JavaScript, escolher o estado e apertar o botão recarrega a página com a
// lista daquele estado; é o caminho de dois envios, e ele funciona.
//
// Com JavaScript, a troca de qualquer uma das duas caixas já atualiza a página
// sozinha, sem botão: o estado traz a lista de municípios, o município faz a
// régua correr o número dele. A navegação é do roteador, com `replace` e sem
// rolar, para a pessoa continuar onde estava e o voltar do navegador não
// virar uma fila de estados.
//
// O componente não importa módulo de dado nenhum de propósito:
// `tests/tabela-fica-no-servidor.test.ts` proíbe que um arquivo "use client"
// alcance a tabela dos municípios, direta ou indiretamente, e a razão é que
// ela tem 200 KB.

export default function EnviaAoTrocar() {
  const marca = useRef<HTMLSpanElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Escuta no rótulo, não no select: a caixa de municípios é recriada a
    // cada troca de estado (key={uf} no SeletorMunicipio), e um ouvinte preso
    // à caixa antiga deixaria de disparar. O evento sobe até o rótulo.
    const rotulo = marca.current?.closest("label");
    const form = rotulo?.closest("form");
    if (!rotulo || !form) return;

    // Com JavaScript o botão sobra: a troca já envia. Ele continua no HTML
    // para quem chega sem script.
    const botao = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (botao) botao.style.display = "none";

    const enviar = (e: Event) => {
      const campo = e.target;
      if (!(campo instanceof HTMLSelectElement)) return;
      const uf = form.elements.namedItem("uf");
      const cidade = form.elements.namedItem("m");
      const params = new URLSearchParams();
      if (uf instanceof HTMLSelectElement && uf.value) params.set("uf", uf.value);

      // Trocar o estado limpa o município. Sem isto a página iria com a UF
      // nova e o código do município antigo, e mostraria "Teresina, PI" com
      // o seletor exibindo Ceará.
      if (campo.name === "m" && cidade instanceof HTMLSelectElement && cidade.value) {
        params.set("m", cidade.value);
      } else if (cidade instanceof HTMLSelectElement) {
        cidade.value = "";
      }

      const destino = new URL(form.action, window.location.href).pathname;
      const busca = params.toString();
      router.replace(busca ? `${destino}?${busca}` : destino, { scroll: false });
    };
    rotulo.addEventListener("change", enviar);
    return () => rotulo.removeEventListener("change", enviar);
  }, [router]);

  return <span ref={marca} hidden aria-hidden />;
}
