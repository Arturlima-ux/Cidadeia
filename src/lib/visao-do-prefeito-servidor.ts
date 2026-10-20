import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, despesaPessoal, obras } from "@/db/schema";
import { resumirObras, resumirProtocolos, seriePessoal, type PontoPessoal, type ResumoObras, type ResumoProtocolos } from "@/lib/visao-do-prefeito";

export type DadosVisaoDoPrefeito = {
  pessoal: PontoPessoal[];
  /** Null quando o módulo não está contratado: o cartão mostra o convite, não um zero. */
  protocolos: ResumoProtocolos | null;
  obras: ResumoObras | null;
};

/** Doze apurações, como na antecipação: um mandato inteiro na regra quadrimestral. */
const APURACOES = 12;

export async function carregarVisaoDoPrefeito(
  prefeituraId: string,
  planos: { essencial: boolean; obras: boolean },
  agora: Date = new Date()
): Promise<DadosVisaoDoPrefeito> {
  const [periodos, linhasAtendimento, linhasObras] = await Promise.all([
    db
      .select({
        exercicio: despesaPessoal.exercicio,
        mesReferencia: despesaPessoal.mesReferencia,
        rcl: despesaPessoal.rcl,
        despesa: despesaPessoal.despesa,
      })
      .from(despesaPessoal)
      .where(eq(despesaPessoal.prefeituraId, prefeituraId))
      .orderBy(desc(despesaPessoal.exercicio), desc(despesaPessoal.mesReferencia))
      .limit(APURACOES),
    planos.essencial
      ? db
          .select({
            tipo: atendimentos.tipo,
            status: atendimentos.status,
            abertoEm: atendimentos.createdAt,
            respondidoEm: atendimentos.respondidoEm,
            prorrogado: atendimentos.prazoProrrogado,
          })
          .from(atendimentos)
          .where(eq(atendimentos.prefeituraId, prefeituraId))
      : Promise.resolve(null),
    planos.obras ? db.select().from(obras).where(eq(obras.prefeituraId, prefeituraId)) : Promise.resolve(null),
  ]);

  return {
    pessoal: seriePessoal(periodos),
    protocolos: linhasAtendimento ? resumirProtocolos(linhasAtendimento, agora) : null,
    obras: linhasObras
      ? resumirObras(
          linhasObras.map((o) => ({
            id: o.id,
            objeto: o.nome,
            fornecedorNome: o.fornecedorNome,
            valorInicial: o.valorContrato,
            valorGlobal: o.valorContrato,
            vigenciaInicio: o.vigenciaInicio,
            vigenciaFim: o.vigenciaFim,
            progressoInformado: o.progressoAtual,
            progressoAtualizadoEm: o.atualizadoEm,
            status: o.status,
            progressoEsperado: o.progressoEsperado,
          })),
          agora
        )
      : null,
  };
}
