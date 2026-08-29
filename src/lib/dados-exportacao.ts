import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import {
  prefeituras,
  usuarios,
  sistemasConectados,
  dashboardSnapshots,
  saudeIndicadores,
  unidadesSaude,
  educacaoIndicadores,
  escolas,
  obras,
  licitacoes,
  investimentos,
  alertas,
  alertasSugeridos,
  atendimentos,
  configPublica,
} from "@/db/schema";
import {
  TABELAS_EXPORTAVEIS,
  higienizarLinhas,
  montarPacote,
  type ChaveTabela,
  type PacoteExportacao,
} from "@/lib/exportacao";

// Consultas da exportação. Separado de lib/exportacao.ts para que a
// transformação em arquivo (a parte com regra de negócio de verdade) siga
// testável sem banco.

type Linha = Record<string, unknown>;

// A coluna que identifica o município muda em uma tabela: em `prefeituras`
// a própria linha É a prefeitura, então o filtro é pelo `id`. Deixar isso
// explícito no mapa evita o erro clássico de exportar a tabela inteira de
// prefeituras — ou seja, vazar todos os clientes para um cliente só.
const FONTES: Record<
  ChaveTabela,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { tabela: any; coluna: any }
> = {
  prefeitura: { tabela: prefeituras, coluna: prefeituras.id },
  usuarios: { tabela: usuarios, coluna: usuarios.prefeituraId },
  sistemas_conectados: { tabela: sistemasConectados, coluna: sistemasConectados.prefeituraId },
  dashboard_snapshots: { tabela: dashboardSnapshots, coluna: dashboardSnapshots.prefeituraId },
  saude_indicadores: { tabela: saudeIndicadores, coluna: saudeIndicadores.prefeituraId },
  unidades_saude: { tabela: unidadesSaude, coluna: unidadesSaude.prefeituraId },
  educacao_indicadores: { tabela: educacaoIndicadores, coluna: educacaoIndicadores.prefeituraId },
  escolas: { tabela: escolas, coluna: escolas.prefeituraId },
  obras: { tabela: obras, coluna: obras.prefeituraId },
  licitacoes: { tabela: licitacoes, coluna: licitacoes.prefeituraId },
  investimentos: { tabela: investimentos, coluna: investimentos.prefeituraId },
  alertas: { tabela: alertas, coluna: alertas.prefeituraId },
  alertas_sugeridos: { tabela: alertasSugeridos, coluna: alertasSugeridos.prefeituraId },
  atendimentos: { tabela: atendimentos, coluna: atendimentos.prefeituraId },
  config_publica: { tabela: configPublica, coluna: configPublica.prefeituraId },
};

/** Uma tabela, só as linhas desta prefeitura, já sem os campos sigilosos. */
export async function carregarTabela(
  chave: ChaveTabela,
  prefeituraId: string
): Promise<Linha[]> {
  const fonte = FONTES[chave];
  const linhas = await db.select().from(fonte.tabela).where(eq(fonte.coluna, prefeituraId));
  return higienizarLinhas(chave, linhas as Linha[]);
}

/** Todas as tabelas exportáveis, prontas para virar o pacote JSON. */
export async function carregarPacote(entrada: {
  prefeituraId: string;
  municipio: string;
  geradoPor: string;
}): Promise<PacoteExportacao> {
  const resultados = await Promise.all(
    TABELAS_EXPORTAVEIS.map(async (definicao) => ({
      chave: definicao.chave,
      linhas: await carregarTabela(definicao.chave, entrada.prefeituraId),
    }))
  );

  const tabelas: Partial<Record<ChaveTabela, Linha[]>> = {};
  for (const { chave, linhas } of resultados) tabelas[chave] = linhas;

  return montarPacote({
    municipio: entrada.municipio,
    geradoPor: entrada.geradoPor,
    geradoEm: new Date().toISOString(),
    tabelas,
  });
}

/**
 * Quantas linhas cada tabela tem. Usado só para a tela mostrar o tamanho de
 * cada arquivo antes do download — conta no banco em vez de carregar as
 * linhas e medir o array.
 */
export async function contarLinhas(
  prefeituraId: string
): Promise<Record<ChaveTabela, number>> {
  const resultados = await Promise.all(
    TABELAS_EXPORTAVEIS.map(async (definicao) => {
      const fonte = FONTES[definicao.chave];
      const linhas = await db
        .select({ total: sql<number>`count(*)` })
        .from(fonte.tabela)
        .where(eq(fonte.coluna, prefeituraId));
      return [definicao.chave, Number(linhas[0]?.total ?? 0)] as const;
    })
  );

  return Object.fromEntries(resultados) as Record<ChaveTabela, number>;
}
