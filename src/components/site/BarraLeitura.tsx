// ── A BARRA DE LEITURA ──
//
// Um filete no topo que avança com a rolagem. Numa página longa como esta,
// ele responde sem palavras a pergunta que faz a pessoa desistir: "isso
// ainda vai longe?".
//
// ── ZERO JAVASCRIPT ──
// Não é componente de cliente, não escuta scroll, não usa hook. A largura
// vem de `animation-timeline: scroll(root block)` — o navegador liga a
// animação à rolagem do documento e resolve no compositor.
//
// A versão comum disto escuta o evento de rolagem e escreve `style.width`
// a cada disparo: dezenas de recálculos de layout por segundo, na thread
// principal, justamente enquanto a pessoa rola. É a diferença entre uma
// barra que desliza e uma que pula.
//
// Onde `animation-timeline` não existe, a barra fica em escala zero — ou
// seja, invisível. Nada quebra, só não há barra.

export default function BarraLeitura() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-50 h-[3px]"
      style={{ background: "transparent" }}
    >
      <div
        className="barra-leitura h-full w-full"
        style={{
          background: "linear-gradient(90deg, var(--brand) 0%, var(--accent) 100%)",
          transform: "scaleX(0)",
        }}
      />
    </div>
  );
}
