import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { pedidoEventos } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { emParalelo, linhasDoTransferegov } from "@/lib/transferegov";
import {
  cnpjFormatado,
  montarEmendas,
  soDigitos,
  type BeneficiarioCru,
  type DevolucaoCru,
  type Emenda,
  type PlanoAcaoCru,
  type PlanoTrabalhoCru,
  type RelatorioGestaoCru,
} from "@/lib/emendas-pix";

// ── AS EMENDAS PIX, DO TRANSFEREGOV PARA O PAINEL ── (ver emendas-pix.ts)
//
// Sem tabela nova: a fotografia da semana é um evento na linha do tempo
// (pedido_eventos), e só a última fica guardada.

export const EVENTO_EMENDAS = "emendas_pix";
export const idDasEmendas = (prefeituraId: string) => `emendas:${prefeituraId}`;

/** Quantos anos para trás: as emendas antigas, já encerradas, só ocupariam a lista. */
const ANOS = 4;
/** Teto de emendas detalhadas por consulta (três perguntas por emenda). */
const MAXIMO = 60;

/** As emendas Pix de um CNPJ, com plano de trabalho, relatórios e devoluções. Lança em falha. */
export async function buscarEmendasPix(cnpj: string, hoje: Date = new Date()): Promise<Emenda[]> {
  const digitos = soDigitos(cnpj);
  // O serviço guarda o CNPJ num formato que a documentação não fixa: tenta
  // só os números e, sem resultado, o formato com pontos.
  let beneficiarios = await linhasDoTransferegov<BeneficiarioCru>("especiais/beneficiarios-especiais", { cnpj_beneficiario: digitos }, 20);
  if (!beneficiarios.length) {
    beneficiarios = await linhasDoTransferegov<BeneficiarioCru>("especiais/beneficiarios-especiais", { cnpj_beneficiario: cnpjFormatado(digitos) }, 20);
  }
  if (!beneficiarios.length) return [];

  const desde = hoje.getUTCFullYear() - (ANOS - 1);
  const planos = (
    await Promise.all(
      beneficiarios.map((b) => linhasDoTransferegov<PlanoAcaoCru>("especiais/planos-acao-especiais", { id_beneficiario: b.id_beneficiario }, 400))
    )
  )
    .flat()
    .filter((p) => (p.ano_plano_acao ?? hoje.getUTCFullYear()) >= desde)
    .sort((a, b) => (b.ano_plano_acao ?? 0) - (a.ano_plano_acao ?? 0))
    .slice(0, MAXIMO);

  const detalhes = await emParalelo(planos, 4, async (p) => {
    const filtro = { id_plano_acao: p.id_plano_acao };
    const [trabalhos, relatorios, devolucoes] = await Promise.all([
      linhasDoTransferegov<PlanoTrabalhoCru>("especiais/planos-trabalho-especiais", filtro, 20),
      linhasDoTransferegov<RelatorioGestaoCru>("especiais/relatorios-gestao-novos-especiais", filtro, 50),
      linhasDoTransferegov<DevolucaoCru>("especiais/devolucao-especiais", filtro, 50),
    ]);
    return { trabalhos, relatorios, devolucoes };
  });

  return montarEmendas(
    planos,
    detalhes.flatMap((d) => d.trabalhos),
    detalhes.flatMap((d) => d.relatorios),
    detalhes.flatMap((d) => d.devolucoes)
  );
}

export async function gravarEmendas(prefeituraId: string, emendas: Emenda[]): Promise<void> {
  const id = gerarId("pev");
  await db.insert(pedidoEventos).values({
    id,
    pedidoId: idDasEmendas(prefeituraId),
    tipo: EVENTO_EMENDAS,
    descricao: JSON.stringify(emendas),
    autor: "importação automática",
  });
  // Só a última fotografia interessa.
  await db
    .delete(pedidoEventos)
    .where(and(eq(pedidoEventos.pedidoId, idDasEmendas(prefeituraId)), eq(pedidoEventos.tipo, EVENTO_EMENDAS), ne(pedidoEventos.id, id)));
}

export async function lerEmendas(prefeituraId: string): Promise<{ emendas: Emenda[]; conferidoEm: string } | null> {
  const [e] = await db
    .select({ descricao: pedidoEventos.descricao, criadoEm: pedidoEventos.criadoEm })
    .from(pedidoEventos)
    .where(and(eq(pedidoEventos.pedidoId, idDasEmendas(prefeituraId)), eq(pedidoEventos.tipo, EVENTO_EMENDAS)))
    .orderBy(desc(pedidoEventos.criadoEm))
    .limit(1);
  if (!e) return null;
  try {
    const emendas = JSON.parse(e.descricao) as Emenda[];
    return Array.isArray(emendas) ? { emendas, conferidoEm: e.criadoEm } : null;
  } catch {
    return null;
  }
}
