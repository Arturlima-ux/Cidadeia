import { db } from "@/db";
import {
  usuarios,
  despesaPessoal,
  unidadesSaude,
  escolas,
  obras,
  licitacoes,
  configPublica,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { buscarPrefeitura } from "@/lib/dados-prefeitura";
import { planosContratadosDe } from "@/lib/planos";
import type { FatosImplantacao } from "@/lib/implantacao";

// Fica FORA do arquivo "use server" de propósito: lá, toda função exportada
// vira ação chamável pelo navegador, e esta recebe um prefeituraId livre —
// qualquer pessoa poderia consultar contagens de outra prefeitura. Aqui só a
// página (no servidor) chama, com o id da própria sessão.

// ── OS FATOS VÊM DO BANCO, A CADA CARREGAMENTO ──
// Seis consultas pequenas, todas de contagem/existência, em paralelo. É
// deliberado não guardar o resultado: a lista precisa refletir o que existe
// agora, e o custo é o de uma tela comum do painel.
export async function levantarFatos(prefeituraId: string): Promise<FatosImplantacao> {
  const n = sql<number>`count(*)::int`;
  const primeiro = (r: { n: number }[]) => r[0]?.n ?? 0;

  const [prefeitura, rgf, qtdUsuarios, saude, edu, obr, lic, portal] = await Promise.all([
    buscarPrefeitura(prefeituraId),
    db
      .select({ n })
      .from(despesaPessoal)
      .where(and(eq(despesaPessoal.prefeituraId, prefeituraId), eq(despesaPessoal.origem, "siconfi")))
      .then(primeiro),
    db.select({ n }).from(usuarios).where(eq(usuarios.prefeituraId, prefeituraId)).then(primeiro),
    db.select({ n }).from(unidadesSaude).where(eq(unidadesSaude.prefeituraId, prefeituraId)).then(primeiro),
    db.select({ n }).from(escolas).where(eq(escolas.prefeituraId, prefeituraId)).then(primeiro),
    db.select({ n }).from(obras).where(eq(obras.prefeituraId, prefeituraId)).then(primeiro),
    db.select({ n }).from(licitacoes).where(eq(licitacoes.prefeituraId, prefeituraId)).then(primeiro),
    db
      .select({ ativo: configPublica.portalAtivo })
      .from(configPublica)
      .where(eq(configPublica.prefeituraId, prefeituraId))
      .limit(1),
  ]);

  return {
    codigoIbge: prefeitura?.codigoIbge ?? null,
    temRgfImportado: rgf > 0,
    qtdModulos: planosContratadosDe(prefeitura?.planosContratados).length,
    qtdUsuarios,
    temDadosDeSecretaria: saude + edu + obr + lic > 0,
    portalAtivo: portal[0]?.ativo ?? false,
  };
}

