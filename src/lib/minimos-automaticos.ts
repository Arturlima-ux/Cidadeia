import { and, desc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { basesMinimos, investimentos } from "@/db/schema";

// ── O RREO NOVO QUE O ACOMPANHAMENTO DOS MÍNIMOS AINDA NÃO VIU ──
//
// O RREO traz a despesa liquidada ATÉ O BIMESTRE (acumulada no ano) por
// função, e a importação semanal o traz sozinha. O percentual dos mínimos,
// porém, precisa de base e aplicado DO MESMO MÊS: trocar só o aplicado por um
// mês mais novo, com a base antiga, inflaria o percentual (aplicado de agosto
// sobre receita de junho), e inflar é justamente o erro que esconde o
// descumprimento. Então o RREO novo não mexe no número: ele vira aviso, com o
// valor pronto, para quem informa a base atualizar os dois juntos.
//
// Acumulado não se soma: o valor do exercício é o do bimestre MAIS RECENTE.
// Somar os bimestres contaria janeiro seis vezes.

export async function aplicadoDoSiconfi(
  prefeituraId: string,
  exercicio: number,
  area: "saude" | "educacao"
): Promise<{ valor: number; mesReferencia: number } | null> {
  const [l] = await db
    .select({ valor: investimentos.valor, competencia: investimentos.competencia })
    .from(investimentos)
    .where(
      and(
        eq(investimentos.prefeituraId, prefeituraId),
        eq(investimentos.secretaria, area),
        eq(investimentos.origem, "siconfi"),
        like(investimentos.competencia, `${exercicio}-%`)
      )
    )
    .orderBy(desc(investimentos.competencia))
    .limit(1);
  if (!l?.competencia) return null;
  return { valor: l.valor ?? 0, mesReferencia: Number(l.competencia.slice(5, 7)) };
}

const NOME = { saude: "saúde", educacao: "educação" } as const;
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Pura: o aviso quando o RREO tem mês mais novo que a base informada. */
export function achadoDaBaseVelha(
  area: "saude" | "educacao",
  base: { mesReferencia: number } | null,
  siconfi: { valor: number; mesReferencia: number } | null
): import("@/lib/deteccao-automatica").DeteccaoAutomatica | null {
  if (!siconfi || (base && base.mesReferencia >= siconfi.mesReferencia)) return null;
  const valor = siconfi.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  return {
    categoria: "dado_desatualizado",
    prioridade: base ? "info" : "medio",
    secretaria: area,
    titulo: base
      ? `Mínimo de ${area === "saude" ? "15%" : "25%"}: há RREO mais novo que a base informada`
      : `Mínimo de ${area === "saude" ? "15%" : "25%"} sem acompanhamento neste ano`,
    descricao:
      `O RREO publicado no Tesouro mostra ${valor} liquidados em ${NOME[area]} até ${MESES[siconfi.mesReferencia - 1]}` +
      (base ? `, e a base de cálculo informada é de ${MESES[base.mesReferencia - 1]}.` : ", e a base de cálculo do exercício não foi informada.") +
      " Peça ao contador a receita de impostos e transferências até o mesmo mês para saber quanto falta aplicar enquanto dá tempo.",
    chave: `minimo:${area}:rreo:${siconfi.mesReferencia}`,
  };
}

export async function achadosDosMinimosAutomaticos(prefeituraId: string, areas: ("saude" | "educacao")[], exercicio: number) {
  const bases = await db
    .select({ area: basesMinimos.area, mesReferencia: basesMinimos.mesReferencia })
    .from(basesMinimos)
    .where(and(eq(basesMinimos.prefeituraId, prefeituraId), eq(basesMinimos.exercicio, exercicio)));
  const saida = [];
  for (const area of areas) {
    const a = achadoDaBaseVelha(area, bases.find((b) => b.area === area) ?? null, await aplicadoDoSiconfi(prefeituraId, exercicio, area));
    if (a) saida.push(a);
  }
  return saida;
}
