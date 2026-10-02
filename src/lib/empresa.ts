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
  endereco: string | null;
  representante: string | null;
  emailSuporte: string | null;
  telefoneSuporte: string | null;
};

// ── UMA FONTE SÓ PARA A IDENTIFICAÇÃO DA EMPRESA ──
//
// Havia duas. Este arquivo lia NEXT_PUBLIC_RAZAO_SOCIAL e NEXT_PUBLIC_CNPJ
// para o rodapé do site; lib/proposta-comercial.ts lia EMPRESA_RAZAO_SOCIAL,
// EMPRESA_CNPJ e mais quatro para a proposta em PDF.
//
// O efeito prático: preencher EMPRESA_CNPJ fazia a proposta sair certa e o
// rodapé continuar em branco, ou o contrário. Quem preenchesse acharia que
// tinha terminado — e a parte que ficou vazia é justamente a que o jurídico
// da prefeitura lê.
//
// ── E POR QUE O PREFIXO NEXT_PUBLIC_ SAIU ──
//
// Nenhum dos três consumidores é componente de cliente: rodapé, kit e
// compromissos rodam no servidor. Pior, a Vercel não deixa salvar variável
// com esse prefixo como Secret nem converter depois — o mesmo problema que
// já obrigou a renomear APP_URL (ver lib/url-app.ts).
//
// Os nomes antigos continuam sendo aceitos para não quebrar ambiente já
// configurado. Quando não houver mais nenhum, dá para tirar.

/**
 * O ambiente entra por parâmetro para o teste poder injetar um falso — ler
 * process.env direto tornaria a função impossível de exercitar sem mexer no
 * processo inteiro.
 */
export function empresaDoAmbiente(
  // Record, e não NodeJS.ProcessEnv: o tipo do Node exige NODE_ENV, o que
  // obrigaria todo teste a inventar um ambiente completo para checar uma
  // variável. `process.env` é atribuível a isto, e é tudo que a função lê.
  env: Record<string, string | undefined> = process.env
): DadosEmpresa {
  const v = (nome: string, legado?: string) =>
    env[nome]?.trim() || (legado ? env[legado]?.trim() : undefined) || null;
  return {
    razaoSocial: v("EMPRESA_RAZAO_SOCIAL", "NEXT_PUBLIC_RAZAO_SOCIAL"),
    cnpj: v("EMPRESA_CNPJ", "NEXT_PUBLIC_CNPJ"),
    endereco: v("EMPRESA_ENDERECO"),
    representante: v("EMPRESA_REPRESENTANTE"),
    emailSuporte: v("SUPORTE_EMAIL"),
    telefoneSuporte: v("SUPORTE_TELEFONE"),
  };
}

export const EMPRESA: DadosEmpresa = empresaDoAmbiente();

/**
 * O que falta preencher, pelo NOME DA VARIÁVEL.
 *
 * A mesa de pedidos mostra esta lista para dar um roteiro copiável em vez de
 * uma reclamação genérica: quem lê precisa saber o que digitar e onde.
 */
export function pendenciasDaEmpresa(e: DadosEmpresa = EMPRESA): string[] {
  const faltam: string[] = [];
  if (!e.razaoSocial) faltam.push("EMPRESA_RAZAO_SOCIAL");
  if (!e.cnpj) faltam.push("EMPRESA_CNPJ");
  if (!e.endereco) faltam.push("EMPRESA_ENDERECO");
  if (!e.representante) faltam.push("EMPRESA_REPRESENTANTE");
  if (!e.emailSuporte) faltam.push("SUPORTE_EMAIL");
  if (!e.telefoneSuporte) faltam.push("SUPORTE_TELEFONE");
  return faltam;
}

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
