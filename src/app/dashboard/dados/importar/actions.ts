"use server";

import { db } from "@/db";
import { unidadesSaude, escolas, obras, licitacoes, investimentos } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";
import { gerarId } from "@/lib/id";
import { revalidatePath } from "next/cache";
import {
  prepararImportacao,
  tabelaImportavel,
  type ResultadoImportacao,
} from "@/lib/importacao";

// Tamanho máximo do arquivo. Uma planilha de prefeitura com dez mil linhas
// não passa de alguns MB; acima disso é engano ou abuso, e ler tudo em
// memória num handler serverless derruba a função.
const TAMANHO_MAXIMO = 4 * 1024 * 1024; // 4 MB
const LINHAS_MAXIMAS = 20_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DESTINO: Record<string, any> = {
  unidades_saude: unidadesSaude,
  escolas,
  obras,
  licitacoes,
  investimentos,
};

export type Previa =
  | { ok: true; tabela: string; resultado: ResultadoImportacao }
  | { ok: false; erro: string };

/**
 * Lê o arquivo e devolve o que SERIA gravado. Não escreve nada: a pessoa
 * confere o mapeamento das colunas e a lista de erros antes de confirmar.
 * Importar direto, sem prévia, é como uma prefeitura ganha mil linhas
 * duplicadas ou uma coluna trocada.
 */
export async function previaImportacao(formData: FormData): Promise<Previa> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Não autenticado." };
  if (sessao.cargo === "secretario") {
    return { ok: false, erro: "Apenas o prefeito ou um administrador pode importar dados." };
  }

  const chaveTabela = String(formData.get("tabela") ?? "");
  const tabela = tabelaImportavel(chaveTabela);
  if (!tabela) return { ok: false, erro: "Escolha o que você quer importar." };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: "Selecione um arquivo CSV." };
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return { ok: false, erro: "Arquivo maior que 4 MB. Divida a planilha em partes." };
  }

  const texto = await arquivo.text();
  const resultado = prepararImportacao({ tabela, texto });

  if (resultado.totalLidas > LINHAS_MAXIMAS) {
    return {
      ok: false,
      erro: `A planilha tem ${resultado.totalLidas.toLocaleString("pt-BR")} linhas. O limite por importação é ${LINHAS_MAXIMAS.toLocaleString("pt-BR")}.`,
    };
  }

  return { ok: true, tabela: chaveTabela, resultado };
}

export type ResultadoGravacao =
  | { ok: true; gravadas: number; tabela: string }
  | { ok: false; erro: string };

/**
 * Grava o que a prévia mostrou.
 *
 * O `prefeituraId` vem SEMPRE da sessão e é aplicado depois das linhas do
 * arquivo — mesmo que a planilha traga uma coluna com esse nome, ela não tem
 * como gravar dado na prefeitura de outro cliente. Os campos importáveis
 * também não incluem `id`, então cada linha ganha um id novo em vez de
 * sobrescrever um registro existente.
 */
export async function confirmarImportacao(entrada: {
  tabela: string;
  linhas: Record<string, unknown>[];
}): Promise<ResultadoGravacao> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Não autenticado." };
  if (sessao.cargo === "secretario") {
    return { ok: false, erro: "Apenas o prefeito ou um administrador pode importar dados." };
  }

  const tabela = tabelaImportavel(entrada.tabela);
  const destino = DESTINO[entrada.tabela];
  if (!tabela || !destino) return { ok: false, erro: "Destino de importação desconhecido." };

  if (entrada.linhas.length === 0) return { ok: false, erro: "Nenhuma linha para importar." };
  if (entrada.linhas.length > LINHAS_MAXIMAS) {
    return { ok: false, erro: "Importação acima do limite de linhas." };
  }

  const permitidos = new Set(tabela.campos.map((c) => c.chave));

  const valores = entrada.linhas.map((linha) => {
    const limpa: Record<string, unknown> = {};
    // Só campos declarados na tabela entram. Qualquer chave a mais que
    // chegue aqui é descartada antes de virar SQL.
    for (const [campo, valor] of Object.entries(linha)) {
      if (permitidos.has(campo)) limpa[campo] = valor;
    }
    return {
      ...limpa,
      id: gerarId(entrada.tabela),
      prefeituraId: sessao.prefeituraId,
    };
  });

  try {
    // Em lotes: um insert único com milhares de linhas estoura o limite de
    // parâmetros do Postgres.
    const LOTE = 500;
    for (let i = 0; i < valores.length; i += LOTE) {
      await db.insert(destino).values(valores.slice(i, i + LOTE));
    }
  } catch {
    return {
      ok: false,
      erro: "O banco recusou a gravação. Confira se os valores obrigatórios estão preenchidos e tente de novo.",
    };
  }

  revalidatePath("/dashboard/dados");
  revalidatePath("/dashboard");

  return { ok: true, gravadas: valores.length, tabela: entrada.tabela };
}
