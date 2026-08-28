import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { lerSessao } from "@/lib/sessao";
import {
  buscarPrefeitura,
  buscarUltimoSnapshot,
  buscarAlertas,
  buscarUltimoIndicadorSaude,
  buscarUnidadesSaude,
  buscarUltimoIndicadorEducacao,
  buscarEscolas,
  buscarObras,
  buscarLicitacoes,
} from "@/lib/dados-prefeitura";
import { RelatorioExecutivoPDF } from "@/lib/relatorios/RelatorioExecutivo";
import { temPlano, NOME_PLANO_ADDON } from "@/lib/planos";

export async function GET() {
  const sessao = await lerSessao();
  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }
  if (sessao.cargo === "secretario") {
    return NextResponse.json(
      { erro: "Sem permissão para gerar o relatório executivo." },
      { status: 403 }
    );
  }

  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  if (!prefeitura) {
    return NextResponse.json({ erro: "Prefeitura não encontrada." }, { status: 404 });
  }
  if (!temPlano(prefeitura.planosContratados, "gestao")) {
    return NextResponse.json(
      {
        erro: `O relatório executivo faz parte do plano ${NOME_PLANO_ADDON.gestao}, que não está contratado por esta prefeitura.`,
      },
      { status: 403 }
    );
  }

  const [
    snapshot,
    alertas,
    indicadorSaude,
    unidadesSaude,
    indicadorEducacao,
    escolas,
    listaObras,
    listaLicitacoes,
  ] = await Promise.all([
    buscarUltimoSnapshot(sessao.prefeituraId),
    buscarAlertas(sessao.prefeituraId),
    buscarUltimoIndicadorSaude(sessao.prefeituraId),
    buscarUnidadesSaude(sessao.prefeituraId),
    buscarUltimoIndicadorEducacao(sessao.prefeituraId),
    buscarEscolas(sessao.prefeituraId),
    buscarObras(sessao.prefeituraId),
    buscarLicitacoes(sessao.prefeituraId),
  ]);

  const obrasAtrasadas = listaObras.filter(
    (o) => o.status !== "concluida" && o.progressoAtual < o.progressoEsperado - 10
  );
  const licitacoesComRisco = listaLicitacoes.filter((l) => l.observacaoRisco);

  const resumoSecretarias = [
    {
      nome: "Saúde",
      linha: indicadorSaude
        ? `${unidadesSaude.length} unidades cadastradas · tempo médio de atendimento: ${indicadorSaude.tempoMedioAtendimentoMin ?? "não informado"} min · faltas: ${indicadorSaude.faltasPercentual ?? "não informado"}%`
        : `${unidadesSaude.length} unidades cadastradas · nenhum indicador registrado ainda`,
    },
    {
      nome: "Educação",
      linha: indicadorEducacao
        ? `${escolas.length} escolas cadastradas · frequência: ${indicadorEducacao.frequenciaPercentual ?? "não informado"}% · nota média: ${indicadorEducacao.notaMedia ?? "não informado"}`
        : `${escolas.length} escolas cadastradas · nenhum indicador registrado ainda`,
    },
    {
      nome: "Obras",
      linha: `${listaObras.length} obras cadastradas · ${obrasAtrasadas.length} com progresso abaixo do esperado`,
    },
    {
      nome: "Licitações",
      linha: `${listaLicitacoes.length} processos cadastrados · ${licitacoesComRisco.length} com observação de risco`,
    },
  ];

  const buffer = await renderToBuffer(
    RelatorioExecutivoPDF({
      prefeitura: {
        nome: prefeitura.nome,
        municipio: prefeitura.municipio,
        estado: prefeitura.estado,
        prefeito: prefeitura.prefeito,
        populacao: prefeitura.populacao,
      },
      snapshot: snapshot
        ? {
            receita: snapshot.receita,
            despesas: snapshot.despesas,
            saldo: snapshot.saldo,
            indiceTransparencia: snapshot.indiceTransparencia,
            atualizadoEm: snapshot.atualizadoEm,
          }
        : null,
      alertas: alertas.map((a) => ({
        titulo: a.titulo,
        descricao: a.descricao,
        prioridade: a.prioridade as "urgente" | "medio" | "info",
        secretaria: a.secretaria,
        resolvido: a.resolvido,
      })),
      resumoSecretarias,
      geradoEm: new Date().toISOString(),
      geradoPor: sessao.nome,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-executivo-${prefeitura.municipio.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
