import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { lerSessao } from "@/lib/sessao";
import {
  buscarPrefeitura,
  buscarUltimoIndicadorSaude,
  buscarUnidadesSaude,
  buscarUltimoIndicadorEducacao,
  buscarEscolas,
  buscarObras,
  buscarLicitacoes,
} from "@/lib/dados-prefeitura";
import {
  RelatorioSecretariaPDF,
  type CardIndicador,
  type LinhaLista,
} from "@/lib/relatorios/RelatorioSecretaria";
import { temPlano, NOME_PLANO_ADDON, type PlanoAddon } from "@/lib/planos";

const SECRETARIAS_VALIDAS = ["saude", "educacao", "obras", "licitacoes"] as const;
type SecretariaValida = (typeof SECRETARIAS_VALIDAS)[number];

const LABEL_TIPO_UNIDADE: Record<string, string> = {
  ubs: "UBS",
  posto: "Posto de Saúde",
  hospital: "Hospital",
  samu: "SAMU",
};

const LABEL_STATUS_OBRA: Record<string, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  atrasada: "Atrasada",
  concluida: "Concluída",
  paralisada: "Paralisada",
};

const LABEL_STATUS_LICITACAO: Record<string, string> = {
  planejamento: "Planejamento",
  publicada: "Publicada",
  em_disputa: "Em disputa",
  homologada: "Homologada",
  cancelada: "Cancelada",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nome: string }> }
) {
  const { nome } = await params;

  if (!SECRETARIAS_VALIDAS.includes(nome as SecretariaValida)) {
    return NextResponse.json({ erro: "Secretaria inválida." }, { status: 400 });
  }
  const secretaria = nome as SecretariaValida;

  const sessao = await lerSessao();
  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }
  if (sessao.cargo === "secretario" && sessao.secretaria !== secretaria) {
    return NextResponse.json(
      { erro: "Sem permissão para gerar o relatório de outra secretaria." },
      { status: 403 }
    );
  }

  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  if (!prefeitura) {
    return NextResponse.json({ erro: "Prefeitura não encontrada." }, { status: 404 });
  }
  if (!temPlano(prefeitura.planosContratados, secretaria as PlanoAddon)) {
    return NextResponse.json(
      {
        erro: `O plano ${NOME_PLANO_ADDON[secretaria as PlanoAddon]} não está contratado por esta prefeitura.`,
      },
      { status: 403 }
    );
  }

  let tituloSecretaria = "";
  let indicadores: CardIndicador[] = [];
  let colunasLista: string[] = [];
  let linhas: LinhaLista[] = [];
  let observacao: string | undefined;

  if (secretaria === "saude") {
    tituloSecretaria = "Secretaria da Saúde";
    const [indicador, unidades] = await Promise.all([
      buscarUltimoIndicadorSaude(sessao.prefeituraId),
      buscarUnidadesSaude(sessao.prefeituraId),
    ]);
    indicadores = indicador
      ? [
          { valor: `${indicador.tempoMedioAtendimentoMin ?? "—"} min`, label: "Tempo médio de atendimento" },
          { valor: `${indicador.medicosAtivos ?? "—"}`, label: "Médicos ativos" },
          { valor: `${indicador.faltasPercentual ?? "—"}%`, label: "Faltas" },
          { valor: `${indicador.estoqueMedicamentosPercentual ?? "—"}%`, label: "Estoque de medicamentos" },
        ]
      : [];
    colunasLista = ["Unidade", "Tipo", "Bairro"];
    linhas = unidades.map((u) => ({
      colunas: [u.nome, LABEL_TIPO_UNIDADE[u.tipo] ?? u.tipo, u.bairro ?? "—"],
    }));
  }

  if (secretaria === "educacao") {
    tituloSecretaria = "Secretaria da Educação";
    const [indicador, listaEscolas] = await Promise.all([
      buscarUltimoIndicadorEducacao(sessao.prefeituraId),
      buscarEscolas(sessao.prefeituraId),
    ]);
    indicadores = indicador
      ? [
          { valor: `${indicador.frequenciaPercentual ?? "—"}%`, label: "Frequência" },
          { valor: `${indicador.notaMedia ?? "—"}`, label: "Nota média" },
          { valor: `${indicador.alunosTransporte ?? "—"}`, label: "Alunos no transporte" },
          { valor: `${indicador.professoresAtivos ?? "—"}`, label: "Professores ativos" },
        ]
      : [];
    colunasLista = ["Escola", "Bairro", "Evasão"];
    linhas = listaEscolas.map((e) => ({
      colunas: [
        e.nome,
        e.bairro ?? "—",
        e.evasaoPercentual !== null ? `${e.evasaoPercentual}%` : "—",
      ],
    }));
  }

  if (secretaria === "obras") {
    tituloSecretaria = "Obras";
    const listaObras = await buscarObras(sessao.prefeituraId);
    const atrasadas = listaObras.filter(
      (o) => o.status !== "concluida" && o.progressoAtual < o.progressoEsperado - 10
    );
    indicadores = [
      { valor: `${listaObras.length}`, label: "Obras cadastradas" },
      { valor: `${atrasadas.length}`, label: "Com progresso abaixo do esperado" },
    ];
    colunasLista = ["Obra", "Bairro", "Progresso", "Status"];
    linhas = listaObras.map((o) => ({
      colunas: [
        o.nome,
        o.bairro ?? "—",
        `${o.progressoAtual}% (esperado ${o.progressoEsperado}%)`,
        LABEL_STATUS_OBRA[o.status] ?? o.status,
      ],
    }));
    if (atrasadas.length > 0) {
      observacao = `Obras com progresso abaixo do esperado: ${atrasadas.map((o) => o.nome).join(", ")}.`;
    }
  }

  if (secretaria === "licitacoes") {
    tituloSecretaria = "Licitações";
    const listaLicitacoes = await buscarLicitacoes(sessao.prefeituraId);
    const comRisco = listaLicitacoes.filter((l) => l.observacaoRisco);
    indicadores = [
      { valor: `${listaLicitacoes.length}`, label: "Processos cadastrados" },
      { valor: `${comRisco.length}`, label: "Com observação de risco" },
    ];
    colunasLista = ["Número", "Objeto", "Status"];
    linhas = listaLicitacoes.map((l) => ({
      colunas: [l.numero, l.objeto, LABEL_STATUS_LICITACAO[l.status] ?? l.status],
    }));
    if (comRisco.length > 0) {
      observacao = comRisco
        .map((l) => `${l.numero}: ${l.observacaoRisco}`)
        .join("\n");
    }
  }

  const buffer = await renderToBuffer(
    RelatorioSecretariaPDF({
      tituloSecretaria,
      prefeituraNome: prefeitura.nome,
      municipioUf: `${prefeitura.municipio}/${prefeitura.estado}`,
      indicadores,
      colunasLista,
      linhas,
      observacao,
      geradoEm: new Date().toISOString(),
      geradoPor: sessao.nome,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${secretaria}-${prefeitura.municipio.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
