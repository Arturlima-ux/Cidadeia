import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { db } from "@/db";
import { atendimentos, obras, dashboardSnapshots, basesMinimos } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { montarPaineisTelao } from "@/lib/paineis-telao";
import { fusoDoEstado } from "@/lib/horario";
import Telao from "./Telao";

export const metadata = { title: "Modo apresentação — CidadeIA" };

export default async function ApresentacaoPage() {
  const { sessao, prefeitura, temPlano } = await contextoDashboard();
  if (!temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  const exercicio = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: fusoDoEstado(prefeitura.estado),
      year: "numeric",
    }).format(new Date())
  );

  const [bases, listaObras, listaAtendimentos, snapshot] = await Promise.all([
    db
      .select()
      .from(basesMinimos)
      .where(eq(basesMinimos.prefeituraId, sessao.prefeituraId)),
    db.select().from(obras).where(eq(obras.prefeituraId, sessao.prefeituraId)),
    db
      .select({ status: atendimentos.status })
      .from(atendimentos)
      .where(eq(atendimentos.prefeituraId, sessao.prefeituraId)),
    db
      .select()
      .from(dashboardSnapshots)
      .where(eq(dashboardSnapshots.prefeituraId, sessao.prefeituraId))
      .orderBy(desc(dashboardSnapshots.atualizadoEm))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  const paineis = montarPaineisTelao({
    municipio: prefeitura.municipio,
    minimos: bases
      .filter((b) => b.exercicio === exercicio)
      .map((b) => ({
        area: b.area,
        base: b.baseCalculo,
        aplicado: b.aplicado,
        mesReferencia: b.mesReferencia,
      })),
    obras: listaObras.map((o) => ({
      status: o.status,
      progressoAtual: o.progressoAtual,
      progressoEsperado: o.progressoEsperado,
    })),
    atendimentos: listaAtendimentos,
    saldo: snapshot?.saldo ?? null,
  });

  return <Telao paineis={paineis} municipio={prefeitura.municipio} />;
}
