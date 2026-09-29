import { NextRequest, NextResponse } from "next/server";
import { NOME_TIPO_UNIDADE } from "@/lib/cnes";
import { renderToBuffer } from "@react-pdf/renderer";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
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
import { dadosOperacionaisSaude, dadosOperacionaisEducacao } from "@/lib/relatorio-operacional";
import { lerObra } from "@/lib/obra-prazo";

const SECRETARIAS_VALIDAS = ["saude", "educacao", "obras", "licitacoes"] as const;
type SecretariaValida = (typeof SECRETARIAS_VALIDAS)[number];

const LABEL_TIPO_UNIDADE: Record<string, string> = NOME_TIPO_UNIDADE;

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
  // ── POR QUE A CHECAGEM MUDOU DE FORMA ──
  //
  // Era `if (cargo === "secretario" && secretaria !== alvo)`. Uma pergunta
  // negativa: barrava o secretário da pasta errada e deixava passar todo o
  // resto. Enquanto só existiam prefeito, admin e secretário, dava certo.
  //
  // Os cargos de uma instalação só — "unidade" (gerência de UBS) e "escola"
  // (direção) — não são secretários, então passavam direto e baixavam o PDF
  // de QUALQUER secretaria. E o proxy não ajuda aqui: ele só guarda
  // /dashboard, e esta é uma rota /api.
  //
  // Uma diretora de escola, que é a conta de menor confiança do produto e é
  // criada para terceiros, baixava o relatório da rede de saúde inteira.
  //
  // Agora são duas perguntas positivas. A primeira usa o mesmo helper das
  // telas. A segunda existe porque estes relatórios são da REDE INTEIRA:
  // quem só pode ver a própria unidade ou a própria escola não pode baixá-lo
  // nem da própria secretaria. É a mesma regra dos CSVs de reposição.
  if (!temAcessoSecretaria(sessao, secretaria)) {
    return NextResponse.json(
      { erro: "Sem permissão para gerar o relatório de outra secretaria." },
      { status: 403 }
    );
  }
  if (sessao.cargo === "unidade" || sessao.cargo === "escola") {
    return NextResponse.json(
      { erro: "Este relatório é da rede inteira; seu acesso é da própria unidade." },
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
    // ── O PDF CONTA A MESMA HISTÓRIA DA TELA ──
    // Ele imprimia tempo médio, médicos ativos e percentual de estoque —
    // os indicadores de antes das três fases da Saúde. Quem baixava
    // recebia um documento que dizia menos do que o painel mostra, e é
    // esse arquivo que circula por e-mail e chega à câmara.
    const op = await dadosOperacionaisSaude(sessao.prefeituraId);
    indicadores = op.cartoes;
    colunasLista = ["Unidade", "Tipo", "Situação", "O que precisa"];
    linhas = op.linhas;
    observacao = op.observacao;
  }

  if (secretaria === "educacao") {
    tituloSecretaria = "Secretaria da Educação";
    // Mesma correção da Saúde: imprimia frequência, nota e evasão, de
    // antes das quatro fases da Educação.
    // O cargo vai junto: a leitura da rede recusa quem não tem acesso à
    // Educação, em vez de confiar que a rota já checou. A rota checa —
    // mas guarda que depende de outro lugar lembrar é guarda que some.
    const op = await dadosOperacionaisEducacao(sessao.prefeituraId, sessao);
    indicadores = op.cartoes;
    colunasLista = ["Escola", "Matrícula (hoje / Censo)", "Dias perdidos", "Situação"];
    linhas = op.linhas;
    observacao = op.observacao;
  }

  if (secretaria === "obras") {
    tituloSecretaria = "Obras";
    const listaObras = await buscarObras(sessao.prefeituraId);
    // Obra sem medição não entra como atrasada: é obra que ninguém mediu, e
    // este PDF circula por e-mail e chega à câmara. Afirmar atraso a partir de
    // um número que o sistema não tem seria acusar a própria prefeitura.
    const atrasadas = listaObras.filter(
      (o) =>
        o.status !== "concluida" &&
        o.progressoAtual !== null &&
        o.progressoAtual < o.progressoEsperado - 10
    );
    indicadores = [
      { valor: `${listaObras.length}`, label: "Obras cadastradas" },
      { valor: `${atrasadas.length}`, label: "Com progresso abaixo do esperado" },
    ];
    // ── O PDF CONTA A MESMA HISTÓRIA DA TELA ──
    //
    // Imprimia "X% (esperado Y%)", e o esperado é um número digitado à mão —
    // não há fonte para "a esta altura deveria estar em Y". A coluna passa a
    // trazer o prazo do contrato, que é fato, ao lado do progresso medido, que
    // é o que a prefeitura informou. Sem medição, diz isso em vez de "null%".
    colunasLista = ["Obra", "Progresso medido", "Prazo do contrato", "Situação"];
    linhas = listaObras.map((o) => {
      const leitura = lerObra(
        {
          id: o.id,
          objeto: o.nome,
          fornecedorNome: o.fornecedorNome,
          valorInicial: o.valorContrato,
          valorGlobal: o.valorContrato,
          vigenciaInicio: o.vigenciaInicio,
          vigenciaFim: o.vigenciaFim,
          progressoInformado: o.progressoAtual,
          progressoAtualizadoEm: o.atualizadoEm,
        },
        new Date()
      );
      return {
        colunas: [
          o.nome,
          o.progressoAtual === null ? "sem medição" : `${o.progressoAtual}%`,
          leitura.prazoConsumido === null
            ? "sem datas no contrato"
            : `${Math.round(leitura.prazoConsumido)}% decorrido`,
          LABEL_STATUS_OBRA[o.status] ?? o.status,
        ],
      };
    });
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
