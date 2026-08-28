import { buscarObras } from "@/app/dashboard/secretarias/obras/actions";
import { buscarLicitacoes } from "@/app/dashboard/secretarias/licitacoes/actions";
import { buscarEscolas } from "@/app/dashboard/secretarias/educacao/actions";
import { buscarHistoricoSaude, buscarHistoricoEducacao } from "@/lib/dados-prefeitura";
import { buscarInvestimentos } from "@/app/dashboard/eficacia/actions";
import { planosContratadosDe } from "@/lib/planos";
import {
  eficaciaObras,
  eficaciaLicitacoes,
  eficaciaSaude,
  eficaciaEducacao,
  ordenarPorGravidade,
  type EficaciaSecretaria,
} from "@/lib/eficacia";

/**
 * Junta os dados de todas as secretarias contratadas e roda a análise de
 * eficácia. Só inclui área com plano contratado — não faz sentido cobrar
 * resultado de um módulo que a prefeitura não assinou.
 */
export async function montarEficacia(
  prefeituraId: string,
  planosContratados: string | null | undefined
): Promise<EficaciaSecretaria[]> {
  const planos = planosContratadosDe(planosContratados);

  const [listaInvestimentos, obras, licitacoes, escolas, histSaude, histEducacao] =
    await Promise.all([
      buscarInvestimentos(prefeituraId),
      planos.includes("obras") ? buscarObras(prefeituraId) : Promise.resolve([]),
      planos.includes("licitacoes") ? buscarLicitacoes(prefeituraId) : Promise.resolve([]),
      planos.includes("educacao") ? buscarEscolas(prefeituraId) : Promise.resolve([]),
      planos.includes("saude") ? buscarHistoricoSaude(prefeituraId) : Promise.resolve([]),
      planos.includes("educacao") ? buscarHistoricoEducacao(prefeituraId) : Promise.resolve([]),
    ]);

  const manualPor = (secretaria: string) =>
    listaInvestimentos
      .filter((i) => i.secretaria === secretaria)
      .reduce((acc, i) => acc + i.valor, 0);

  const resultado: EficaciaSecretaria[] = [];
  if (planos.includes("saude")) {
    resultado.push(eficaciaSaude(histSaude, manualPor("saude")));
  }
  if (planos.includes("educacao")) {
    resultado.push(eficaciaEducacao(histEducacao, escolas, manualPor("educacao")));
  }
  if (planos.includes("obras")) {
    resultado.push(eficaciaObras(obras, manualPor("obras")));
  }
  if (planos.includes("licitacoes")) {
    resultado.push(eficaciaLicitacoes(licitacoes, manualPor("licitacoes")));
  }

  return ordenarPorGravidade(resultado);
}
