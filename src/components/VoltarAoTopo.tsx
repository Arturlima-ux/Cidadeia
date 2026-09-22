"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// ── TROCOU DE TELA, VOLTA AO TOPO ──
//
// Com o menu e o cabeçalho grudados, o Next entende que o conteúdo novo
// já está visível e mantém a rolagem onde estava: quem descia a lista de
// obras e clicava em Licitações abria a tela seguinte pelo meio. Aqui a
// janela volta ao topo a cada troca de rota — e só nela: rolar dentro da
// mesma tela continua intocado.

export default function VoltarAoTopo() {
  const pathname = usePathname();
  useEffect(() => {
    // Três vezes, de propósito: agora, depois da pintura e no fim da fila
    // de tarefas. O Next ajusta a rolagem DEPOIS do efeito — um único
    // reset era desfeito por ele, e a tela seguinte continuava no meio.
    const aoTopo = () => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    aoTopo();
    const quadro = requestAnimationFrame(() => requestAnimationFrame(aoTopo));
    const tarefa = setTimeout(aoTopo, 60);
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(tarefa);
    };
  }, [pathname]);
  return null;
}
