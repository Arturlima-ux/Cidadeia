import { NextResponse } from "next/server";
import { lerSessao } from "@/lib/sessao";
import { buscarPrefeitura } from "@/lib/dados-prefeitura";
import { carregarPacote, carregarTabela } from "@/lib/dados-exportacao";
import { paraCsv, tabelaPorChave, nomeArquivo } from "@/lib/exportacao";

// Exportação dos dados da prefeitura.
//
//   GET /api/exportacao?formato=json            → tudo, num arquivo só
//   GET /api/exportacao?formato=csv&tabela=obras → uma tabela em CSV
//
// Sem trava de plano, DE PROPÓSITO: a exportação é o que garante que o dado
// continua sendo do município mesmo se a prefeitura decidir sair. Condicionar
// isso a um módulo contratado transformaria o dado público em refém do
// contrato. Ver o comentário no topo de lib/exportacao.ts.

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function GET(request: Request) {
  const sessao = await lerSessao();
  if (!sessao) return erro("Não autenticado.", 401);

  // Secretário enxerga só a própria secretaria dentro do sistema; a
  // exportação é do município inteiro (inclui financeiro geral e usuários),
  // então segue a mesma regra do relatório executivo.
  if (sessao.cargo === "secretario") {
    return erro(
      "Apenas o prefeito ou um administrador pode exportar os dados do município.",
      403
    );
  }

  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  if (!prefeitura) return erro("Prefeitura não encontrada.", 404);

  const parametros = new URL(request.url).searchParams;
  const formato = parametros.get("formato") ?? "json";
  const agora = new Date();

  if (formato === "csv") {
    const chave = parametros.get("tabela") ?? "";
    const definicao = tabelaPorChave(chave);
    if (!definicao) {
      return erro(
        `Tabela desconhecida: "${chave}". Use ?formato=json para exportar tudo.`,
        400
      );
    }

    const linhas = await carregarTabela(definicao.chave, sessao.prefeituraId);
    const csv = paraCsv(linhas);
    const arquivo = nomeArquivo({
      municipio: prefeitura.municipio,
      sufixo: definicao.chave.replace(/_/g, "-"),
      extensao: "csv",
      data: agora,
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${arquivo}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (formato !== "json") {
    return erro(`Formato desconhecido: "${formato}". Use "json" ou "csv".`, 400);
  }

  const pacote = await carregarPacote({
    prefeituraId: sessao.prefeituraId,
    municipio: prefeitura.municipio,
    geradoPor: sessao.nome,
  });

  const arquivo = nomeArquivo({
    municipio: prefeitura.municipio,
    sufixo: "dados-completos",
    extensao: "json",
    data: agora,
  });

  return new NextResponse(JSON.stringify(pacote, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
