import type { ReactNode } from "react";

// ── O REVEAL QUE NÃO ANIMA MAIS ──
//
// Era uma entrada animada (sobe 28px e acende) em quase todo bloco do site,
// disparada por IntersectionObserver. Duas razões para desligar, no
// redesenho de outubro de 2026:
//
// 1. Entrada em cada seção é o sinal mais reconhecível de página gerada em
//    série. A home nova tem um único momento de movimento, no topo, e o resto
//    do site passa a seguir a mesma regra.
// 2. Quando o observador não disparava (rolagem rápida, aba em segundo
//    plano, captura de tela), o bloco ficava invisível: "Como contratar"
//    chegou a mostrar uma faixa em branco no lugar de duas seções.
//
// A assinatura continua a mesma para não mexer nos cerca de cem usos; os
// parâmetros de atraso e direção são aceitos e ignorados.
export default function Reveal({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  direcao?: "up" | "left" | "right" | "none";
  className?: string;
  as?: React.ElementType;
}) {
  return <Tag className={className || undefined}>{children}</Tag>;
}
