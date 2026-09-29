import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prefeituras } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";
import { lerPlanoContratacoes, nomeDoArquivoPlano } from "@/lib/plano-contratacoes";
import { planoParaCsv } from "@/lib/pca";
import { hojeNoFuso, fusoDoEstado } from "@/lib/horario";

// O plano de contratações em CSV, para o setor de compras e a contabilidade.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessao = await lerSessao();
  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const [prefeitura] = await db
    .select({ municipio: prefeituras.municipio, estado: prefeituras.estado })
    .from(prefeituras)
    .where(eq(prefeituras.id, sessao.prefeituraId))
    .limit(1);
  if (!prefeitura) {
    return NextResponse.json({ erro: "Prefeitura não encontrada." }, { status: 404 });
  }

  // O ano do plano é o SEGUINTE ao corrente — é isso que "plano anual"
  // significa —, e o corrente vem do fuso do município, não do relógio do
  // servidor. Na Vercel o servidor roda em UTC, e uma geração às 21h30 de 31
  // de dezembro em Brasília cairia no ano seguinte, planejando o ano errado.
  const hoje = hojeNoFuso(fusoDoEstado(prefeitura.estado));
  const anoCorrente = Number(hoje.slice(0, 4));
  const pedido = Number(req.nextUrl.searchParams.get("ano"));
  const anoPlano =
    Number.isInteger(pedido) && pedido >= anoCorrente && pedido <= anoCorrente + 5
      ? pedido
      : anoCorrente + 1;

  // A guarda de acesso mora na leitura, não aqui: server action e rota de API
  // são caminhos que o proxy de /dashboard não cobre, e uma guarda que depende
  // de cada chamador lembrar é guarda que some.
  const leitura = await lerPlanoContratacoes(sessao.prefeituraId, sessao, anoPlano);
  if (!leitura) {
    return NextResponse.json(
      { erro: "Sem permissão para gerar o plano de contratações." },
      { status: 403 }
    );
  }

  return new NextResponse(planoParaCsv(leitura.plano), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeDoArquivoPlano(anoPlano, prefeitura.municipio)}"`,
      "Cache-Control": "no-store",
    },
  });
}
