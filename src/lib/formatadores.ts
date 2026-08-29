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
