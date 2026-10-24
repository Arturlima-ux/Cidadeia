import type { Bloco, Documento } from "@/lib/kit-contratacao";
import { textoCorrido } from "@/lib/kit-contratacao";
import { documentoExibivel } from "@/lib/contratos-pncp";
import { formatarMoedaExata } from "@/lib/formatadores";
import { dataNumerica } from "@/lib/horario";
import type { SituacaoObra } from "@/lib/obra-prazo";
import { dataBr, nomeDoCargo, objetoNaFrase } from "@/lib/renovacao-contrato";

// ── A NOTIFICAÇÃO À CONTRATADA DA OBRA QUE PASSOU DO PRAZO ──
//
// O painel de Obras aponta a obra cujo prazo acabou sem conclusão, ou que anda
// muito atrás do prazo, e deixa registrar a decisão. Entre uma coisa e outra
// havia um passo que ficava todo com o fiscal do contrato: escrever à
// contratada, pedir as razões do atraso e o cronograma, e anotar a ocorrência.
// Sem esse passo, a decisão registrada depois ("mora do contratado") não se
// sustenta: ninguém perguntou à empresa o que aconteceu.
//
// Este arquivo escreve os dois papéis com o que o sistema já sabe: a obra, o
// contrato do PNCP de onde ela veio e a última medição informada.
//
// ── O QUE ELE NÃO FAZ ──
//
// Não conclui pela culpa. A notificação pede explicação; a mora e a sanção só
// vêm depois da resposta, com contraditório e ampla defesa (CF, art. 5º, LV).
// Por isso aprovar a notificação NÃO registra a decisão "mora do contratado":
// registrá-la junto seria afirmar culpa antes de ouvir a empresa.
//
// Não inventa. Prazo de resposta, número do ofício, nome do fiscal: tudo o que
// depende de quem tem o processo sai entre [colchetes] e entra na lista de
// pendências. O prazo de resposta fica em branco de propósito: depende do
// contrato e do que a fiscalização quer ver, e um número sugerido viraria o
// número usado.
//
// Não envia. Aprovar registra quem conferiu e qual texto; a entrega à
// contratada (protocolo, e-mail do contrato, AR) é no processo, com o recibo
// que o próprio documento traz.
//
// ── POR QUE NENHUM TEXTO DEPENDE DE "HOJE" ──
//
// Mesmo motivo da renovação (lib/renovacao-contrato.ts): a aprovação vale para
// um texto, e "há 37 dias" mudaria à meia-noite. O prazo transcorrido que a
// notificação cita é o da DATA DA MEDIÇÃO, não o de hoje: é um fato que não
// muda. O único "hoje" é escolher qual das duas notificações cabe, e isso muda
// quando a situação da obra muda de verdade.

export type MotivoNotificacao = "prazo_encerrado" | "atraso";

/** Só estas duas situações pedem explicação à contratada. */
export function motivoDaNotificacao(situacao: SituacaoObra): MotivoNotificacao | null {
  if (situacao === "contrato_encerrado_sem_conclusao") return "prazo_encerrado";
  if (situacao === "atras_do_prazo") return "atraso";
  return null;
}

export type ObraParaNotificacao = {
  id: string;
  nome: string;
  bairro: string | null;
  /** Null quando ninguém mediu — não é 0%. */
  progressoAtual: number | null;
  /** Data da última medição informada (só significa algo com progresso). */
  atualizadoEm: string | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  valorContrato: number | null;
  fornecedorNome: string | null;
};

/** O contrato do PNCP de onde a obra veio; null em obra cadastrada à mão. */
export type ContratoDaObra = {
  numeroContrato: string | null;
  processo: string | null;
  objeto: string;
  fornecedorNome: string | null;
  fornecedorDocumento: string | null;
  fornecedorTipoPessoa: string | null;
  valorGlobal: number | null;
};

export type PrefeituraParaNotificacao = {
  municipio: string;
  estado: string;
};

// ── OS FATOS ──

const ISO = /^\d{4}-\d{2}-\d{2}/;
const dataValida = (v: string | null | undefined) => (v && ISO.test(v) ? v.slice(0, 10) : null);
const p = (texto: string): Bloco => ({ tipo: "paragrafo", texto });
const lista = (itens: string[]): Bloco => ({ tipo: "lista", itens });
const tabela = (cabecalho: string[], linhas: string[][]): Bloco => ({ tipo: "tabela", cabecalho, linhas });

const pctBr = (v: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v)}%`;

function diasEntreIso(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/**
 * Quanto do prazo do contrato já tinha passado NA DATA DA MEDIÇÃO.
 *
 * Não é o prazo consumido de hoje (esse muda todo dia e mora na tela). É o
 * que permite à notificação dizer "a execução estava em 30% quando 70% do
 * prazo já havia transcorrido" sem que a frase envelheça.
 */
export function prazoNaMedicao(inicio: string | null, fim: string | null, medicao: string | null): number | null {
  if (!inicio || !fim || !medicao) return null;
  const total = diasEntreIso(inicio, fim);
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, (diasEntreIso(inicio, medicao) / total) * 100));
}

type Fatos = {
  municipio: string;
  orgao: string;
  obra: string;
  local: string | null;
  contratoNome: string;
  processo: string;
  contratada: string;
  documentoContratada: string;
  objeto: string;
  inicio: string | null;
  fim: string | null;
  valor: string | null;
  progresso: number | null;
  /** A data da medição, já no fuso do município (dd/mm/aaaa). */
  medicaoEm: string | null;
  prazoNaMedicao: number | null;
};

function fatos(
  obra: ObraParaNotificacao,
  contrato: ContratoDaObra | null,
  pref: PrefeituraParaNotificacao,
  fuso: string
): Fatos {
  const inicio = dataValida(obra.vigenciaInicio);
  const fim = dataValida(obra.vigenciaFim);
  const doc = contrato?.fornecedorDocumento ?? null;
  // CPF nunca sai inteiro de um texto nosso (lib/contratos-pncp.ts).
  const pf = (doc ?? "").replace(/\D/g, "").length === 11 || contrato?.fornecedorTipoPessoa === "PF";
  const valor = obra.valorContrato ?? contrato?.valorGlobal ?? null;
  const medicaoIso = obra.progressoAtual !== null ? dataValida(obra.atualizadoEm) : null;
  return {
    municipio: `${pref.municipio}/${pref.estado}`,
    orgao: `Prefeitura Municipal de ${pref.municipio}`,
    obra: obra.nome.trim().replace(/\.+$/, ""),
    local: obra.bairro?.trim() || null,
    contratoNome: contrato?.numeroContrato ? `Contrato nº ${contrato.numeroContrato}` : "Contrato nº [número do contrato]",
    processo: contrato?.processo?.trim() || "[número do processo]",
    contratada: (contrato?.fornecedorNome ?? obra.fornecedorNome)?.trim() || "[razão social da contratada]",
    documentoContratada: pf
      ? "CPF [CPF do contratado]"
      : doc
        ? `CNPJ ${documentoExibivel(doc, contrato?.fornecedorTipoPessoa ?? null)}`
        : "CNPJ [CNPJ da contratada]",
    objeto: objetoNaFrase(contrato?.objeto ?? obra.nome),
    inicio,
    fim,
    valor: valor !== null ? formatarMoedaExata(valor) : null,
    progresso: obra.progressoAtual,
    // A medição é um instante (UTC no banco); a data do documento é a do
    // município, senão a medição das 22h de Rio Branco sairia no dia seguinte.
    medicaoEm: obra.progressoAtual !== null && obra.atualizadoEm ? dataNumerica(obra.atualizadoEm, fuso) : null,
    prazoNaMedicao: prazoNaMedicao(inicio, fim, medicaoIso),
  };
}

function fraseDaMedicao(f: Fatos, motivo: MotivoNotificacao): string {
  if (f.progresso === null) {
    return motivo === "prazo_encerrado"
      ? "Não há, no registro da fiscalização, medição que ateste a conclusão do objeto."
      : "Não há medição registrada pela fiscalização.";
  }
  const quando = f.medicaoEm ? `, em ${f.medicaoEm}` : "";
  const prazo =
    f.prazoNaMedicao !== null && f.prazoNaMedicao < 100
      ? `, quando já havia transcorrido ${pctBr(f.prazoNaMedicao)} do prazo contratual`
      : "";
  return `Na última medição registrada pela fiscalização${quando}, a execução estava em ${pctBr(f.progresso)}${prazo}.`;
}

function fraseDoPrazo(f: Fatos): string {
  const local = f.local ? ` (local: ${f.local})` : "";
  const periodo =
    f.inicio && f.fim
      ? `com prazo de execução de ${dataBr(f.inicio)} a ${dataBr(f.fim)}`
      : f.fim
        ? `com conclusão prevista para ${dataBr(f.fim)}`
        : "com prazo de execução até [data de término do contrato]";
  return `O ${f.contratoNome}, firmado entre o Município de ${f.municipio} e essa contratada, tem por objeto ${f.objeto}${local}, ${periodo}.`;
}

// ── A NOTIFICAÇÃO ──

function notificacao(f: Fatos, motivo: MotivoNotificacao): Documento {
  const encerrado = motivo === "prazo_encerrado";
  const situacao = encerrado
    ? f.fim
      ? `O prazo contratual encerrou-se em ${dataBr(f.fim)} sem que o objeto tenha sido concluído.`
      : "O prazo contratual encerrou-se sem que o objeto tenha sido concluído."
    : "O ritmo de execução está abaixo do que o prazo contratual exige para a conclusão na data prevista.";

  const lei = encerrado
    ? [
        p(
          "Nas contratações de escopo predefinido, como a de obra, a vigência é prorrogada automaticamente quando o objeto não é concluído " +
            "no período firmado (art. 111 da Lei nº 14.133/2021). A prorrogação não dispensa a apuração da causa: se a não conclusão " +
            "decorrer de culpa da contratada, ela será constituída em mora, com as sanções cabíveis, e a Administração poderá optar pela " +
            "extinção do contrato (art. 111, parágrafo único)."
        ),
      ]
    : [
        p(
          "Cabe à fiscalização anotar as ocorrências da execução e determinar o necessário para a regularização das faltas observadas " +
            "(art. 117, § 1º, da Lei nº 14.133/2021)."
        ),
      ];

  const pedidos = encerrado
    ? [
        "as razões pelas quais a obra não foi concluída no prazo contratual, com os documentos que as comprovem;",
        "o percentual executado até a data da resposta e os serviços que faltam;",
        "o cronograma para a conclusão, com a data proposta para a entrega;",
        "[outros documentos exigidos pelo contrato ou pela fiscalização].",
      ]
    : [
        "as razões do ritmo de execução abaixo do previsto, com os documentos que as comprovem;",
        `o cronograma de recuperação que assegure a conclusão${f.fim ? ` até ${dataBr(f.fim)}` : " no prazo contratual"}, com as medidas que serão adotadas (equipe, frentes de serviço, materiais);`,
        "[outros documentos exigidos pelo contrato ou pela fiscalização].",
      ];

  return {
    chave: "notificacao-contratada",
    nome: "Notificação à contratada",
    subtitulo: encerrado ? "Obra não concluída no prazo contratual" : "Execução da obra abaixo do prazo",
    resumo: "Comunica o atraso com os fatos do contrato e da medição, e pede as razões e o cronograma por escrito.",
    geramos: true,
    clausulas: [
      {
        titulo: `Notificação nº [número]/[ano] — ${f.orgao}`,
        blocos: [
          p(`${f.municipio}, [data].`),
          p(`À ${f.contratada}, ${f.documentoContratada}.`),
          p(`Assunto: execução da obra ${f.obra} — ${f.contratoNome} (processo ${f.processo}).`),
        ],
      },
      {
        titulo: "Texto",
        blocos: [
          p(fraseDoPrazo(f)),
          p(`${situacao} ${fraseDaMedicao(f, motivo)}`),
          ...lei,
          p("Fica essa contratada NOTIFICADA a apresentar, no prazo de [prazo para resposta], contado do recebimento desta, manifestação por escrito com:"),
          lista(pedidos),
          p(
            "Esta notificação não aplica sanção nem conclui pela culpa da contratada. A manifestação será analisada pela Administração " +
              "antes de qualquer decisão. Se o atraso não for justificado, poderá ser instaurado processo de apuração de responsabilidade " +
              "(arts. 155 a 163 da Lei nº 14.133/2021), no qual a contratada terá prazo próprio de defesa."
          ),
          p("Atenciosamente,"),
          p("[Nome do(a) fiscal ou gestor(a) do contrato]\n[Cargo e matrícula]"),
        ],
      },
      {
        titulo: "Recebimento",
        blocos: [p("Recebi a via desta notificação em ____/____/______.\n\n______________________________\nNome, cargo e assinatura, pela contratada")],
      },
    ],
  };
}

// ── O REGISTRO DE OCORRÊNCIA ──

function registro(f: Fatos, motivo: MotivoNotificacao): Documento {
  const linhas: string[][] = [
    ["Obra", `${f.obra}${f.local ? ` (${f.local})` : ""}`],
    ["Contrato", `${f.contratoNome.replace("Contrato nº ", "")} · processo ${f.processo}`],
    ["Contratada", `${f.contratada} · ${f.documentoContratada}`],
    ["Prazo de execução", f.inicio && f.fim ? `${dataBr(f.inicio)} a ${dataBr(f.fim)}` : f.fim ? `até ${dataBr(f.fim)}` : "[datas do contrato]"],
    ["Valor", f.valor ?? "[valor do contrato]"],
  ];
  const ocorrencia =
    motivo === "prazo_encerrado"
      ? `Obra não concluída no prazo contratual${f.fim ? `, encerrado em ${dataBr(f.fim)}` : ""}.`
      : "Execução abaixo do ritmo necessário para a conclusão no prazo contratual.";
  return {
    chave: "registro-ocorrencia",
    nome: "Registro de ocorrência",
    subtitulo: `Fiscalização do contrato — ${f.obra}`,
    resumo: "A anotação da fiscalização que o art. 117 pede, com a providência tomada e a data da próxima verificação.",
    geramos: true,
    clausulas: [
      { titulo: "Identificação", blocos: [tabela(["Campo", "Informação"], linhas)] },
      { titulo: "Ocorrência", blocos: [p(`${ocorrencia} ${fraseDaMedicao(f, motivo)}`)] },
      {
        titulo: "Providência",
        blocos: [
          p("Emitida a Notificação nº [número]/[ano] à contratada, para manifestação por escrito no prazo de [prazo para resposta]."),
          p("Próxima verificação em campo: [data da próxima vistoria]."),
          p("[Observações da vistoria: frentes paradas, equipe no canteiro, materiais, registro fotográfico.]"),
        ],
      },
      {
        titulo: "Registro",
        blocos: [
          p("Anotação feita nos termos do art. 117, § 1º, da Lei nº 14.133/2021."),
          p(`${f.municipio}, [data].`),
          p("[Nome do(a) fiscal do contrato]\n[Cargo e matrícula]"),
        ],
      },
    ],
  };
}

// ── O PACOTE ──

export type PacoteNotificacao = {
  motivo: MotivoNotificacao;
  documentos: Documento[];
  /** O que só a prefeitura pode preencher, sem repetição. */
  pendencias: string[];
  /** Impressão do texto: muda quando qualquer palavra muda. */
  impressao: string;
};

export function montarNotificacao(
  motivo: MotivoNotificacao,
  obra: ObraParaNotificacao,
  contrato: ContratoDaObra | null,
  prefeitura: PrefeituraParaNotificacao,
  fuso: string
): PacoteNotificacao {
  const f = fatos(obra, contrato, prefeitura, fuso);
  const documentos = [notificacao(f, motivo), registro(f, motivo)];
  return { motivo, documentos, pendencias: pendenciasDe(documentos), impressao: impressaoDe(motivo, documentos) };
}

function pendenciasDe(documentos: Documento[]): string[] {
  const vistos = new Set<string>();
  for (const d of documentos) for (const m of textoCorrido(d).match(/\[[^\]\n]+\]/g) ?? []) vistos.add(m);
  return [...vistos];
}

/** FNV-1a de 32 bits, como impressaoDoPacote em lib/renovacao-contrato.ts. Não é segurança. */
function impressaoDe(motivo: MotivoNotificacao, documentos: Documento[]): string {
  const texto = `notificacao:${motivo}\n${documentos.map((d) => `${d.nome}\n${textoCorrido(d)}`).join("\n")}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ── A APROVAÇÃO NA TRILHA DE AUDITORIA ──
//
// Sem tabela nova: a linha de auditoria guarda quem, quando e a impressão do
// texto. O texto é reconstruído dos dados; se a impressão de hoje bate com a
// aprovada, é o mesmo texto.

export const ENTIDADE_NOTIFICACAO = "obra";
export const ACAO_APROVAR_NOTIFICACAO = "aprovar";
const PREFIXO = "notificação à contratada";

export function resumoDaAprovacaoNotificacao(obraNome: string, contratoNumero: string | null, impressao: string): string {
  const qual = contratoNumero ? ` (contrato ${contratoNumero})` : "";
  return `${PREFIXO} da obra "${obraNome.slice(0, 90)}"${qual} conferida e aprovada para envio. Ref. ${impressao}`;
}

/** Só as linhas desta aprovação: a entidade "obra" também guarda criar/alterar/excluir. */
export function ehAprovacaoDeNotificacao(resumo: string): boolean {
  return resumo.startsWith(PREFIXO);
}

export type AprovacaoNotificacao = { usuarioNome: string; usuarioCargo: string; createdAt: string; resumo: string };

export type SituacaoNotificacao =
  | { tipo: "rascunho" }
  | { tipo: "aprovado"; aprovacao: AprovacaoNotificacao }
  /** Houve aprovação, mas o texto de hoje não é mais o aprovado. */
  | { tipo: "desatualizado"; aprovacao: AprovacaoNotificacao };

export function situacaoDaNotificacao(aprovacoes: AprovacaoNotificacao[], pacote: Pick<PacoteNotificacao, "impressao">): SituacaoNotificacao {
  const ultima = [...aprovacoes].filter((a) => ehAprovacaoDeNotificacao(a.resumo)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!ultima) return { tipo: "rascunho" };
  const ref = ultima.resumo.match(/Ref\. ([0-9a-f]{8})\b/)?.[1];
  return ref === pacote.impressao ? { tipo: "aprovado", aprovacao: ultima } : { tipo: "desatualizado", aprovacao: ultima };
}

/** A linha no topo de cada arquivo baixado: o .doc circula sem a tela em volta. */
export function carimboDaNotificacao(
  situacao: SituacaoNotificacao,
  pacote: Pick<PacoteNotificacao, "impressao">,
  formatarData: (iso: string) => string = dataBr
): string {
  if (situacao.tipo === "aprovado") {
    const a = situacao.aprovacao;
    return (
      `Conferido e aprovado por ${a.usuarioNome} (${nomeDoCargo(a.usuarioCargo)}) em ${formatarData(a.createdAt)} para envio à contratada. ` +
      `Aprovar não é assinar nem enviar: a assinatura e a entrega são no processo. Ref. ${pacote.impressao}.`
    );
  }
  return (
    "RASCUNHO montado pelo CidadeIA com os dados da obra e do contrato, ainda não aprovado. " +
    `Confira e preencha os campos entre colchetes antes de usar. Ref. ${pacote.impressao}.`
  );
}
