// ── SÓ ARITMÉTICA, SEM IMPORT DE SERVIDOR ──
//
// FormularioRaioX (cliente) importava esta função de lib/raio-x.ts, que
// importa lib/siconfi.ts, que importa a tabela de municípios — 200 KB que
// foram parar no bundle do navegador. O que o cliente precisa é a conta;
// ela mora aqui, sem nenhuma dependência.

/**
 * Percentual aplicado numa área sobre a receita, quando os dois números
 * existem. Serve de indício, nunca de cálculo oficial: a base legal do mínimo
 * não é a receita total, e dizer o contrário seria inventar conformidade.
 */
export function proporcaoDaReceita(despesa: number | null, receita: number | null): number | null {
  if (despesa === null || receita === null || receita <= 0) return null;
  return (despesa / receita) * 100;
}
