export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/**
 * Moeda com os centavos, para valores que a prefeitura vai CITAR num
 * processo — o limite de dispensa, por exemplo. `formatarMoeda` arredonda
 * para caber em painel, e arredondar um valor legal muda o número que o
 * servidor copia para o termo de referência.
 */
export function formatarMoedaExata(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── NÚMERO EM PORTUGUÊS ──
// Os cartões de indicador interpolavam o número cru: `${6.5}%` vira "6.5%",
// com ponto, no mesmo painel em que a moeda sai "R$ 1.234,56". Nota 7,2
// aparecia como "7.2". Para quem lê em português, "6.5" parece seis mil e
// quinhentos — e num relatório de frequência escolar, isso muda a leitura.
export function formatarNumero(valor: number, casasMax = 1): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casasMax }).format(valor);
}

export function formatarPercentual(valor: number, casasMax = 1): string {
  return `${formatarNumero(valor, casasMax)}%`;
}
