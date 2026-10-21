// Um número indo de A a B, com saída suave, sem o motor da biblioteca de
// animação (que pesava no primeiro carregamento). Usado pelos contadores do
// portal e pela régua da LRF. Devolve como parar.
export function animarNumero(
  de: number,
  para: number,
  o: { duracao: number; atraso?: number; aoMudar: (v: number) => void }
): { parar: () => void } {
  const suave = (x: number) => 1 - Math.pow(1 - x, 4);
  let quadro = 0;
  let inicio: number | null = null;
  const passo = (agora: number) => {
    if (inicio === null) inicio = agora + (o.atraso ?? 0) * 1000;
    // Duração zero (movimento reduzido) vai direto ao fim: 0/0 daria NaN na tela.
    const x = o.duracao <= 0 ? 1 : Math.min(1, Math.max(0, (agora - inicio) / (o.duracao * 1000)));
    o.aoMudar(de + (para - de) * suave(x));
    if (x < 1) quadro = requestAnimationFrame(passo);
  };
  quadro = requestAnimationFrame(passo);
  return { parar: () => cancelAnimationFrame(quadro) };
}
