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

/**
 * CNPJ com a máscara oficial (00.000.000/0000-00). O cadastro guarda só os
 * dígitos; as Configurações mostravam "12345678000190", que ninguém confere
 * de relance contra o cartão do CNPJ. O que não tiver 14 dígitos sai como
 * veio, para não esconder um cadastro errado atrás de uma máscara.
 */
export function formatarCnpj(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Número curto para eixo de gráfico: "600 mil", "1,2 mi", "-50 mil". O eixo
 * do histórico financeiro tem 44px; "600000" não cabia e saía cortado como
 * "0000" ao lado da linha.
 */
export function formatarCompacto(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(valor);
}

/** "1 obra", "3 obras". Para o painel parar de escrever "obra(s)". */
export function contar(n: number, singular: string, plural: string): string {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? singular : plural}`;
}
