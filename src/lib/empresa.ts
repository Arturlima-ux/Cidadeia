// ── DADOS DA EMPRESA ──
//
// Num site que vende conformidade jurídica, um marcador de posição visível no
// rodapé — "[RAZÃO SOCIAL]", "CNPJ [XX.XXX.XXX/0001-XX]" — custa mais do que a
// ausência do dado. O jurídico da prefeitura rola até o fim antes de aprovar
// qualquer contratação, e encontra ali a prova de que a página foi montada sem
// alguém do outro lado.
//
// Então: enquanto o dado não existir, ele não aparece. Nada é inventado e nada
// é fingido. No dia em que o CNPJ sair, basta preencher aqui e o rodapé passa a
// exibi-lo sozinho, junto da minuta de contrato do kit.

export type DadosEmpresa = {
  razaoSocial: string | null;
  cnpj: string | null;
};

/**
 * Null enquanto a constituição da empresa não estiver concluída.
 *
 * A leitura por variável de ambiente existe para permitir preencher em
 * produção sem novo deploy — útil no dia em que o CNPJ sair.
 */
export const EMPRESA: DadosEmpresa = {
  razaoSocial: process.env.NEXT_PUBLIC_RAZAO_SOCIAL?.trim() || null,
  cnpj: process.env.NEXT_PUBLIC_CNPJ?.trim() || null,
};

/** true quando há ao menos um dado a exibir. */
export function temIdentificacao(e: DadosEmpresa = EMPRESA): boolean {
  return Boolean(e.razaoSocial || e.cnpj);
}

/**
 * Linha de identificação para rodapé e documentos.
 *
 * Devolve null em vez de string vazia para quem chama ter de decidir
 * explicitamente o que fazer com a ausência — foi por não decidir isso que o
 * marcador de posição acabou publicado.
 */
export function linhaIdentificacao(e: DadosEmpresa = EMPRESA): string | null {
  const partes = [e.razaoSocial, e.cnpj ? `CNPJ ${e.cnpj}` : null].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}
