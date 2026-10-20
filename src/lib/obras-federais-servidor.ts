import { emParalelo, linhasDoObrasgov } from "@/lib/transferegov";
import { gravarFotografia, lerFotografia } from "@/lib/fotografia-servidor";
import {
  encerrada,
  montarObrasFederais,
  type EmpenhoCru,
  type ExecucaoFisicaCru,
  type GeometriaCru,
  type HistoricoCru,
  type ObraFederal,
  type ProjetoCru,
} from "@/lib/obras-federais";

// ── AS OBRAS FEDERAIS, DO OBRASGOV PARA O PAINEL ── (ver obras-federais.ts)
//
// O ObrasGov não filtra projeto por município; a geometria (o ponto no mapa)
// sim, pelo código IBGE. Então: geometrias do município, os projetos delas e,
// só para os que ainda não acabaram, a execução física, o histórico de
// paralisação e os empenhos.

export const EVENTO_OBRAS_FEDERAIS = "obras_federais";
export const idDasObrasFederais = (prefeituraId: string) => `obrasgov:${prefeituraId}`;

/** Teto por leitura: cada obra em andamento custa quatro perguntas ao serviço. */
const MAXIMO = 40;

export async function buscarObrasFederais(codigoIbge: string): Promise<ObraFederal[]> {
  const geometrias = await linhasDoObrasgov<GeometriaCru>("geometria", { cod_ibge: Number(codigoIbge) }, 600);
  const ids = [...new Set(geometrias.map((g) => g.id_projeto_investimento).filter(Boolean))].slice(0, MAXIMO * 2);
  if (!ids.length) return [];

  const projetos = (await emParalelo(ids, 6, (id) => linhasDoObrasgov<ProjetoCru>("projeto-investimento", { id_projeto_investimento: id }, 1))).flat();
  const ativos = projetos.filter((p) => !encerrada(p.situacao)).slice(0, MAXIMO);

  const detalhes = await emParalelo(ativos, 6, async (p) => {
    const filtro = { id_projeto_investimento: p.id_projeto_investimento };
    const parada = /paralis|inacab/i.test(p.situacao ?? "");
    const [execucoes, historicos, empenhos] = await Promise.all([
      linhasDoObrasgov<ExecucaoFisicaCru>("execucao-fisica", filtro, 50),
      parada ? linhasDoObrasgov<HistoricoCru>("historico-situacao-cancelada-paralisada", filtro, 50) : Promise.resolve([]),
      linhasDoObrasgov<EmpenhoCru>("empenho", filtro, 200),
    ]);
    return { execucoes, historicos, empenhos };
  });

  return montarObrasFederais(
    projetos,
    detalhes.flatMap((d) => d.execucoes),
    detalhes.flatMap((d) => d.historicos),
    detalhes.flatMap((d) => d.empenhos)
  );
}

export const gravarObrasFederais = (prefeituraId: string, obras: ObraFederal[]) =>
  gravarFotografia(idDasObrasFederais(prefeituraId), EVENTO_OBRAS_FEDERAIS, obras);

export async function lerObrasFederais(prefeituraId: string): Promise<{ obras: ObraFederal[]; conferidoEm: string } | null> {
  const f = await lerFotografia<ObraFederal[]>(idDasObrasFederais(prefeituraId), EVENTO_OBRAS_FEDERAIS);
  return f && Array.isArray(f.valor) ? { obras: f.valor, conferidoEm: f.conferidoEm } : null;
}
