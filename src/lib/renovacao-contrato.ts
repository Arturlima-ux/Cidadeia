import type { Bloco, Clausula, Documento } from "@/lib/kit-contratacao";
import { textoCorrido } from "@/lib/kit-contratacao";
import { lerVigencia, prazoProvavel, type LeituraVigencia } from "@/lib/vigencia";
import { recuarDiasUteis } from "@/lib/pca";
import { termosDoObjeto, semelhanca } from "@/lib/fracionamento";
import { ehObraOuEngenharia } from "@/lib/obra-prazo";
import { classificarArea } from "@/lib/classificar-manifestacao";
import { documentoExibivel } from "@/lib/contratos-pncp";
import { formatarMoedaExata } from "@/lib/formatadores";

// ── O PROCESSO DE RENOVAÇÃO, MONTADO ──
//
// O radar de vigência (lib/vigencia.ts) diz que o contrato vence e quanto
// tempo resta. Até aqui o produto parava nisso, e o trabalho de verdade
// continuava com alguém do setor de compras: decidir entre prorrogar e licitar
// de novo, escrever o documento de formalização de demanda, abrir o estudo
// técnico preliminar, achar o que o município já pagou pelo mesmo objeto,
// calcular até quando o edital precisa sair, redigir o ofício à contratada e o
// termo aditivo. Meio dia a dois dias por contrato — e um município real tinha
// 27 vencendo em 90 dias.
//
// Este arquivo faz esse trabalho com o que o sistema já sabe: o contrato
// importado do PNCP, os outros contratos do município e a régua do art. 55.
//
// ── O QUE ELE NÃO FAZ ──
//
// Não decide. Prorrogar ou licitar é escolha da Administração; aqui se diz o
// que cada caminho exige e o que o calendário ainda permite.
//
// Não inventa. Quantidade, pesquisa de preços, vantajosidade, dotação — tudo
// que depende de juízo ou de dado que não está no sistema — sai entre
// [colchetes], com a pergunta certa, e entra na lista de pendências.
//
// Não assina nem envia. O texto é rascunho até uma pessoa aprovar, e a
// aprovação fica na trilha de auditoria com nome, cargo e a impressão do texto
// aprovado (ver `impressaoDoPacote`).
//
// ── POR QUE NENHUM TEXTO DEPENDE DE "HOJE" ──
//
// A aprovação vale para um texto. Se o documento dissesse "vence em 12 dias",
// ele mudaria à meia-noite e a aprovação de ontem passaria a parecer vencida
// sem que nada no contrato tivesse mudado. Os documentos só carregam datas
// absolutas, todas derivadas do contrato; o "faltam N dias" mora no
// diagnóstico, que é da tela.

export type CaminhoRenovacao = "prorrogar" | "licitar";

export const NOME_CAMINHO: Record<CaminhoRenovacao, string> = {
  prorrogar: "Prorrogar o contrato atual",
  licitar: "Contratar de novo",
};

export type ContratoParaRenovacao = {
  id: string;
  objeto: string;
  numeroContrato: string | null;
  processo: string | null;
  fornecedorNome: string | null;
  /** O documento CRU do banco. Só sai inteiro quando é CNPJ. */
  fornecedorDocumento: string | null;
  fornecedorTipoPessoa: string | null;
  valorInicial: number | null;
  valorGlobal: number | null;
  dataAssinatura: string | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  categoria: string | null;
  frutoAdesao: boolean;
};

export type PrefeituraParaRenovacao = {
  municipio: string;
  estado: string;
  cnpj: string | null;
  prefeito: string | null;
};

// ── DATAS ──

const ISO = /^\d{4}-\d{2}-\d{2}/;

function dataValida(v: string | null | undefined): string | null {
  return v && ISO.test(v) ? v.slice(0, 10) : null;
}

function meioDia(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function paraIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dataBr(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

function somarDias(iso: string, dias: number): string {
  const d = meioDia(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return paraIso(d);
}

function somarAnos(iso: string, anos: number): string {
  const d = meioDia(iso);
  d.setUTCFullYear(d.getUTCFullYear() + anos);
  return paraIso(d);
}

/**
 * Meses inteiros de vigência entre duas datas, contando o último dia: um
 * contrato de 01/01 a 31/12 tem doze meses, não onze.
 */
export function mesesEntre(inicio: string, fim: string): number {
  const a = meioDia(inicio);
  const b = meioDia(somarDias(fim, 1));
  let meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) meses -= 1;
  return Math.max(0, meses);
}

function anosEMeses(meses: number): string {
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes: string[] = [];
  if (anos) partes.push(`${anos} ${anos === 1 ? "ano" : "anos"}`);
  if (resto || !anos) partes.push(`${resto} ${resto === 1 ? "mês" : "meses"}`);
  return partes.join(" e ");
}

// ── HISTÓRICO DO MESMO OBJETO ──

export type ContratoDoHistorico = {
  id: string;
  numeroContrato: string | null;
  fornecedorNome: string | null;
  mesmoFornecedor: boolean;
  valorGlobal: number | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  objeto: string;
};

/**
 * Semelhança mínima para um contrato entrar no histórico.
 *
 * É o mesmo ponto de corte do agrupamento de fracionamento, pelo mesmo motivo:
 * "merenda escolar" não é "transporte escolar". Com o mesmo contratado, a
 * régua desce — a mesma empresa contratada de novo para algo parecido é
 * exatamente o histórico que quem escreve o estudo precisa ver.
 */
export const SEMELHANCA_HISTORICO = 0.5;
export const SEMELHANCA_MESMO_FORNECEDOR = 0.25;
export const MAXIMO_HISTORICO = 8;

const soDigitos = (v: string | null) => (v ?? "").replace(/\D/g, "");

export function historicoDoObjeto(
  contrato: ContratoParaRenovacao,
  todos: ContratoParaRenovacao[]
): ContratoDoHistorico[] {
  const alvo = termosDoObjeto(contrato.objeto);
  const doc = soDigitos(contrato.fornecedorDocumento);
  return todos
    .filter((c) => c.id !== contrato.id)
    .map((c) => {
      const mesmo = !!doc && soDigitos(c.fornecedorDocumento) === doc;
      return { c, s: semelhanca(alvo, termosDoObjeto(c.objeto)), mesmo };
    })
    .filter(({ s, mesmo }) => s >= SEMELHANCA_HISTORICO || (mesmo && s >= SEMELHANCA_MESMO_FORNECEDOR))
    .sort((a, b) => (dataValida(b.c.vigenciaInicio) ?? "").localeCompare(dataValida(a.c.vigenciaInicio) ?? ""))
    .slice(0, MAXIMO_HISTORICO)
    .map(({ c, mesmo }) => ({
      id: c.id,
      numeroContrato: c.numeroContrato,
      fornecedorNome: c.fornecedorNome,
      mesmoFornecedor: mesmo,
      valorGlobal: c.valorGlobal,
      vigenciaInicio: dataValida(c.vigenciaInicio),
      vigenciaFim: dataValida(c.vigenciaFim),
      objeto: c.objeto,
    }));
}

/**
 * O contrato posterior que já cobre o mesmo objeto, se houver.
 *
 * Nos dados reais, boa parte dos "vencidos" é contrato antigo que já foi
 * substituído: o transporte escolar de 2024 venceu, e o de 2025 está valendo.
 * Oferecer a renovação do antigo mandaria alguém montar um processo para uma
 * necessidade já atendida. Conta como sucessor o contrato do histórico que
 * começou depois deste e termina depois dele.
 */
export function contratoSucessor(
  contrato: ContratoParaRenovacao,
  todos: ContratoParaRenovacao[]
): ContratoDoHistorico | null {
  const inicio = dataValida(contrato.vigenciaInicio);
  const fim = dataValida(contrato.vigenciaFim);
  if (!inicio || !fim) return null;
  return (
    historicoDoObjeto(contrato, todos).find(
      (h) => !!h.vigenciaInicio && !!h.vigenciaFim && h.vigenciaInicio > inicio && h.vigenciaFim > fim
    ) ?? null
  );
}

// ── O DIAGNÓSTICO (TELA) ──

export type OpcaoDeCaminho = {
  caminho: CaminhoRenovacao;
  disponivel: boolean;
  /** Por que não está disponível, ou o que pesa contra, em uma frase. */
  observacao: string | null;
};

export type DiagnosticoRenovacao = {
  /** Obra segue o art. 111: não é aqui. */
  ehObra: boolean;
  vigencia: LeituraVigencia;
  opcoes: OpcaoDeCaminho[];
  /** Data-limite para publicar o edital, se a decisão for licitar. */
  editalAte: string | null;
  /** true quando a data-limite do edital já passou. */
  editalAtrasado: boolean;
  /** O limite de dez anos do art. 107, pela data de início do PNCP. */
  limiteDecenal: string | null;
  /** Grau de prioridade sugerido, que o DFD deixa em branco. */
  prioridade: "alta" | "media" | "normal" | null;
};

/** Data-limite para publicar o edital, recuando do fim só o prazo do art. 55. */
export function editalAte(contrato: Pick<ContratoParaRenovacao, "vigenciaFim" | "objeto">): string | null {
  const fim = dataValida(contrato.vigenciaFim);
  if (!fim) return null;
  return paraIso(recuarDiasUteis(meioDia(fim), prazoProvavel(contrato.objeto).dias));
}

export function limiteDecenal(contrato: Pick<ContratoParaRenovacao, "vigenciaInicio">): string | null {
  const inicio = dataValida(contrato.vigenciaInicio);
  return inicio ? somarDias(somarAnos(inicio, 10), -1) : null;
}

const PRIORIDADE: Record<LeituraVigencia["situacao"], DiagnosticoRenovacao["prioridade"]> = {
  vencido: "alta",
  sem_tempo_de_licitar: "alta",
  apertado: "alta",
  atencao: "media",
  ok: "normal",
  sem_data: null,
};

export function diagnosticar(contrato: ContratoParaRenovacao, hoje: Date = new Date()): DiagnosticoRenovacao {
  const vigencia = lerVigencia(
    { objeto: contrato.objeto, vigenciaFim: dataValida(contrato.vigenciaFim), fornecedorNome: contrato.fornecedorNome },
    hoje
  );
  const ehObra = ehObraOuEngenharia(contrato.categoria);
  const ate = editalAte(contrato);
  const hojeIso = paraIso(new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 12)));
  const decenal = limiteDecenal(contrato);
  const fim = dataValida(contrato.vigenciaFim);

  let prorrogar: OpcaoDeCaminho = { caminho: "prorrogar", disponivel: true, observacao: null };
  let licitar: OpcaoDeCaminho = { caminho: "licitar", disponivel: true, observacao: null };

  if (ehObra) {
    const motivo =
      "Contrato de obra: a vigência prorroga sozinha quando o objeto não é concluído (art. 111 da Lei 14.133/2021). " +
      "A decisão sobre o atraso fica na tela de Obras.";
    prorrogar = { caminho: "prorrogar", disponivel: false, observacao: motivo };
    licitar = { caminho: "licitar", disponivel: false, observacao: motivo };
  } else {
    if (vigencia.situacao === "vencido") {
      prorrogar = {
        caminho: "prorrogar",
        disponivel: false,
        observacao: "A vigência já acabou. Aditivo depois do vencimento não prorroga: não há mais contrato para aditar.",
      };
    } else if (decenal && fim && fim >= decenal) {
      prorrogar = {
        caminho: "prorrogar",
        disponivel: false,
        observacao: `Pela data de início registrada no PNCP, a vigência já chega a dez anos em ${dataBr(decenal)} — o teto do art. 107.`,
      };
    } else if (!fim) {
      prorrogar = { ...prorrogar, observacao: "Sem data de fim no cadastro: confira a vigência no contrato antes de tudo." };
    }

    if (ate && ate < hojeIso) {
      licitar = {
        caminho: "licitar",
        disponivel: true,
        observacao: `O edital precisaria ter saído até ${dataBr(ate)} para o novo contrato começar sem intervalo. Ainda é preciso contratar — com um período descoberto.`,
      };
    }
  }

  const prioridade = PRIORIDADE[vigencia.situacao];

  return {
    ehObra,
    vigencia,
    opcoes: [prorrogar, licitar],
    editalAte: ate,
    editalAtrasado: !!ate && ate < hojeIso,
    limiteDecenal: decenal,
    prioridade,
  };
}

// ── OS DOCUMENTOS ──

const p = (texto: string): Bloco => ({ tipo: "paragrafo", texto });
const lista = (itens: string[]): Bloco => ({ tipo: "lista", itens });
const tabela = (cabecalho: string[], linhas: string[][]): Bloco => ({ tipo: "tabela", cabecalho, linhas });

const NOME_SECRETARIA: Record<string, string> = {
  saude: "Secretaria de Saúde",
  educacao: "Secretaria de Educação",
  obras: "Secretaria de Obras e Serviços Urbanos",
  licitacoes: "Setor de Compras e Contratos",
};

function moeda(v: number | null): string | null {
  return v === null || !Number.isFinite(v) ? null : formatarMoedaExata(v);
}

type Fatos = {
  municipio: string;
  orgao: string;
  cnpjPrefeitura: string;
  prefeito: string;
  contratoNome: string;
  processo: string;
  contratada: string;
  documentoContratada: string;
  /** O objeto no meio da frase. */
  objeto: string;
  /** O objeto abrindo frase ou título, como o PNCP publicou. */
  objetoTitulo: string;
  fim: string | null;
  inicio: string | null;
  valorGlobal: string | null;
  mediaMensal: string | null;
  meses: number | null;
  setorSugerido: string | null;
  /** Contratado pessoa física: sem "representada por". */
  pessoaFisica: boolean;
};

/**
 * O objeto como entra no meio de uma frase ("cujo objeto é locação de…").
 * Só baixa a inicial quando a segunda letra é minúscula: "UBS do Centro" e
 * "SAMU" ficam como estão. O ponto final do PNCP sai, porque a frase põe o seu.
 */
export function objetoNaFrase(objeto: string): string {
  const t = objeto.trim().replace(/\.+$/, "");
  return /^\p{Lu}\p{Ll}/u.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
}

function fatos(c: ContratoParaRenovacao, pref: PrefeituraParaRenovacao): Fatos {
  const inicio = dataValida(c.vigenciaInicio);
  const fim = dataValida(c.vigenciaFim);
  const meses = inicio && fim && fim > inicio ? mesesEntre(inicio, fim) : null;
  const media = meses && meses >= 1 && c.valorGlobal ? c.valorGlobal / meses : null;
  // CPF nunca sai inteiro de um texto nosso (lib/contratos-pncp.ts): no
  // documento oficial, quem completa é quem tem o processo na mão.
  const pf = soDigitos(c.fornecedorDocumento).length === 11 || c.fornecedorTipoPessoa === "PF";
  const area = classificarArea(c.objeto, "");
  return {
    municipio: `${pref.municipio}/${pref.estado}`,
    orgao: `Prefeitura Municipal de ${pref.municipio}`,
    cnpjPrefeitura: pref.cnpj ? (documentoExibivel(pref.cnpj, "PJ") ?? pref.cnpj) : "[CNPJ do Município]",
    prefeito: pref.prefeito?.trim() || "[nome do(a) Prefeito(a)]",
    contratoNome: c.numeroContrato ? `Contrato nº ${c.numeroContrato}` : "Contrato nº [número do contrato]",
    processo: c.processo?.trim() || "[número do processo]",
    contratada: c.fornecedorNome?.trim() || "[razão social da contratada]",
    documentoContratada: pf
      ? "CPF [CPF do contratado]"
      : c.fornecedorDocumento
        ? `CNPJ ${documentoExibivel(c.fornecedorDocumento, c.fornecedorTipoPessoa)}`
        : "CNPJ [CNPJ da contratada]",
    objeto: objetoNaFrase(c.objeto),
    objetoTitulo: c.objeto.trim().replace(/\.+$/, ""),
    fim,
    inicio,
    valorGlobal: moeda(c.valorGlobal),
    mediaMensal: media ? moeda(media) : null,
    meses,
    setorSugerido: area ? NOME_SECRETARIA[area] : null,
    pessoaFisica: pf,
  };
}

function linhasDoHistorico(h: ContratoDoHistorico[]): string[][] {
  return h.map((x) => [
    x.numeroContrato ?? "—",
    `${x.fornecedorNome ?? "—"}${x.mesmoFornecedor ? " (a mesma contratada)" : ""}`,
    x.vigenciaInicio && x.vigenciaFim ? `${dataBr(x.vigenciaInicio)} a ${dataBr(x.vigenciaFim)}` : "—",
    moeda(x.valorGlobal) ?? "—",
  ]);
}

const CABECALHO_HISTORICO = ["Contrato", "Contratado", "Vigência", "Valor global"];

function blocoDoHistorico(h: ContratoDoHistorico[]): Bloco[] {
  if (!h.length) {
    return [p("Nenhum outro contrato de objeto semelhante foi encontrado entre os contratos do município importados do PNCP.")];
  }
  return [
    p("Contratos de objeto semelhante do próprio município, como constam no PNCP:"),
    tabela(CABECALHO_HISTORICO, linhasDoHistorico(h)),
  ];
}

function referenciaDeValor(f: Fatos): string {
  if (!f.valorGlobal) return "O valor do contrato atual não consta no PNCP.";
  const periodo = f.inicio && f.fim ? `, para a vigência de ${dataBr(f.inicio)} a ${dataBr(f.fim)}` : "";
  const media =
    f.mediaMensal && f.meses
      ? ` Dividido pelos ${f.meses} meses de vigência, dá ${f.mediaMensal} por mês — uma média, não uma estimativa.`
      : "";
  return `Valor global do contrato atual, como consta no PNCP: ${f.valorGlobal}${periodo}.${media}`;
}

// ─ prorrogar ─

function oficioContratada(f: Fatos): Documento {
  const vigencia = f.fim ? `tem vigência até ${dataBr(f.fim)}` : "tem vigência até [data de fim da vigência]";
  const ate = f.fim ? `antes de ${dataBr(f.fim)}` : "antes do fim da vigência";
  return {
    chave: "oficio-contratada",
    nome: "Ofício à contratada",
    subtitulo: "Consulta sobre o interesse na prorrogação",
    resumo: "Pergunta à contratada se ela aceita prorrogar e em que condições, e pede as certidões.",
    geramos: true,
    clausulas: [
      {
        titulo: `Ofício nº [número]/[ano] — ${f.orgao}`,
        blocos: [
          p(`${f.municipio}, [data].`),
          p(`À ${f.contratada}, ${f.documentoContratada}.`),
          p(`Assunto: prorrogação da vigência do ${f.contratoNome} (processo ${f.processo}).`),
        ],
      },
      {
        titulo: "Texto",
        blocos: [
          p(
            `O ${f.contratoNome}, firmado entre o Município de ${f.municipio} e essa contratada, cujo objeto é ${f.objeto}, ${vigencia}.`
          ),
          p(
            "A Administração avalia prorrogar a vigência, nos termos do art. 107 da Lei nº 14.133/2021, por [prazo da prorrogação], " +
              "e consulta essa contratada sobre o interesse na prorrogação, mantidas as condições contratuais, ou sobre a proposta de condições para o novo período."
          ),
          p(`Solicitamos resposta por escrito até [data-limite da resposta], ${ate}, acompanhada de:`),
          lista([
            "manifestação expressa de interesse na prorrogação;",
            "certidões de regularidade fiscal e trabalhista vigentes;",
            "[outros documentos exigidos pelo contrato ou pelo edital].",
          ]),
          p("Atenciosamente,"),
          p("[Nome do(a) responsável]\n[Cargo]"),
        ],
      },
    ],
  };
}

function checklistProrrogacao(f: Fatos, decenal: string | null): Documento {
  const assinarAte = f.fim ? `Assinar até ${dataBr(f.fim)}` : "[conferir a data de fim no contrato]";
  const dezAnos =
    decenal && f.inicio
      ? `Início registrado no PNCP em ${dataBr(f.inicio)}: a vigência total pode ir até ${dataBr(decenal)}.` +
        (f.fim && f.fim < decenal ? ` Até o fim atual são ${anosEMeses(mesesEntre(f.inicio, f.fim))}.` : "")
      : "[conferir a data de início do contrato original]";
  return {
    chave: "checklist-prorrogacao",
    nome: "Checklist da prorrogação",
    subtitulo: "O que precisa estar no processo antes de assinar o aditivo",
    resumo: "Cada exigência da lei para prorrogar, com o que o sistema já sabe ao lado.",
    geramos: true,
    clausulas: [
      {
        titulo: `${f.contratoNome} — ${f.contratada}`,
        blocos: [
          tabela(
            ["Exigência", "Base", "O que já se sabe"],
            [
              ["Contrato ainda vigente na assinatura do aditivo", "—", assinarAte],
              ["Serviço ou fornecimento contínuo", "Art. 107 da Lei 14.133/2021", "[declarar no processo]"],
              ["Prorrogação prevista no edital", "Art. 107", "[indicar a cláusula do edital e do contrato]"],
              ["Vigência total de até dez anos", "Art. 107", dezAnos],
              [
                "Atestado da autoridade competente de que as condições e os preços continuam vantajosos",
                "Art. 107",
                "[juntar a pesquisa de preços e o atestado]",
              ],
              ["Interesse da contratada", "—", "Ofício de consulta gerado neste pacote"],
              [
                "Regularidade fiscal, consulta ao CEIS e ao CNEP, certidões negativas de inidoneidade, de impedimento e de débitos trabalhistas",
                "Art. 91, § 4º",
                "[juntar ao processo]",
              ],
              ["Dotação orçamentária para o período prorrogado", "—", "[indicar a dotação]"],
              ["Parecer da assessoria jurídica", "Art. 53", "[juntar o parecer]"],
              ["Divulgação do aditivo no PNCP, depois de assinado", "Art. 94", "Condição de eficácia do aditamento"],
            ]
          ),
        ],
      },
    ],
  };
}

function termoAditivo(f: Fatos): Documento {
  const de = f.fim ? dataBr(somarDias(f.fim, 1)) : "[dia seguinte ao fim da vigência]";
  return {
    chave: "termo-aditivo",
    nome: "Minuta do termo aditivo",
    subtitulo: "Prorrogação de vigência",
    resumo: "O aditivo com partes, contrato, processo e datas preenchidos do cadastro.",
    geramos: true,
    clausulas: [
      {
        titulo: `[Nº] Termo Aditivo ao ${f.contratoNome}`,
        blocos: [
          p(
            `O MUNICÍPIO DE ${f.municipio.toUpperCase()}, inscrito no CNPJ sob o nº ${f.cnpjPrefeitura}, representado por ${f.prefeito}, ` +
              `doravante CONTRATANTE, e ${f.contratada}, ${f.documentoContratada}, ${f.pessoaFisica ? "[qualificação do contratado]" : "representada por [nome e qualificação do representante]"}, ` +
              `doravante CONTRATADA, resolvem celebrar o presente termo aditivo, nos autos do processo ${f.processo}, mediante as cláusulas seguintes.`
          ),
        ],
      },
      {
        titulo: "Cláusula primeira — Do objeto",
        blocos: [
          p(
            `Prorrogar a vigência do ${f.contratoNome}, cujo objeto é ${f.objeto}, por [prazo da prorrogação], de ${de} a [data final].`
          ),
        ],
      },
      {
        titulo: "Cláusula segunda — Do fundamento",
        blocos: [
          p(
            "Art. 107 da Lei nº 14.133/2021 e cláusula [nº] do contrato, atestado nos autos que as condições e os preços permanecem vantajosos para a Administração."
          ),
        ],
      },
      {
        titulo: "Cláusula terceira — Do valor e da dotação",
        blocos: [
          p("O valor estimado para o período prorrogado é de [valor], à conta da dotação [dotação orçamentária]."),
          p(
            f.valorGlobal
              ? `Para referência: valor global do contrato registrado no PNCP, ${f.valorGlobal}.`
              : "O valor global do contrato não consta no PNCP."
          ),
        ],
      },
      {
        titulo: "Cláusula quarta — Da ratificação",
        blocos: [p("Ficam mantidas as demais cláusulas e condições do contrato original não alteradas por este termo.")],
      },
      {
        titulo: "Cláusula quinta — Da divulgação",
        blocos: [p("Este termo será divulgado no Portal Nacional de Contratações Públicas, nos termos do art. 94 da Lei nº 14.133/2021.")],
      },
      {
        titulo: "Assinaturas",
        blocos: [p(`${f.municipio}, [data].`), p("CONTRATANTE: ______________________"), p("CONTRATADA: ______________________")],
      },
    ],
  };
}

// ─ licitar ─

function dfd(f: Fatos, h: ContratoDoHistorico[], edital: string | null): Documento {
  const setor = f.setorSugerido
    ? `[setor requisitante — pelo objeto, provavelmente ${f.setorSugerido}]`
    : "[setor requisitante]";
  const vigenteEm = f.fim ? dataBr(somarDias(f.fim, 1)) : "[data]";
  const justificativa = f.fim
    ? `O ${f.contratoNome}, firmado com ${f.contratada}, que hoje atende a esta necessidade, tem vigência até ${dataBr(f.fim)}.`
    : `O ${f.contratoNome}, firmado com ${f.contratada}, atende hoje a esta necessidade.`;
  return {
    chave: "dfd",
    nome: "Documento de formalização de demanda",
    subtitulo: `Nova contratação — ${f.objetoTitulo}`,
    resumo: "A demanda descrita a partir do contrato que vence, com a data em que o novo precisa estar valendo.",
    geramos: true,
    clausulas: [
      {
        titulo: "1. Setor requisitante e responsável",
        blocos: [p(`${f.orgao} — ${setor}.`), p("Responsável pela demanda: [nome, cargo e matrícula].")],
      },
      {
        titulo: "2. Objeto",
        blocos: [p(`${f.objetoTitulo}.`), p("[Ajuste a descrição se a necessidade mudou desde a contratação anterior.]")],
      },
      {
        titulo: "3. Justificativa da necessidade",
        blocos: [
          p(justificativa),
          p("[Descreva por que o serviço ou o fornecimento continua necessário e o que acontece com o atendimento se ele for interrompido.]"),
        ],
      },
      {
        titulo: "4. Quantidade e referência de valor",
        blocos: [
          p("Quantidade estimada: [quantidade e unidade, com a memória de cálculo]."),
          p(referenciaDeValor(f)),
          ...blocoDoHistorico(h),
        ],
      },
      {
        titulo: "5. Prazo",
        blocos: [
          p(`A nova contratação precisa estar vigente em ${vigenteEm}, dia seguinte ao fim do contrato atual.`),
          p(
            edital
              ? `Pelo prazo mínimo do art. 55 da Lei nº 14.133/2021, o edital precisa ser publicado até ${dataBr(edital)} — e isso supondo julgamento e assinatura sem nenhum dia de folga.`
              : "[Data-limite de publicação do edital: informe a data de fim do contrato atual para o cálculo.]"
          ),
        ],
      },
      {
        titulo: "6. Grau de prioridade",
        blocos: [p("[alta, média ou baixa]")],
      },
      {
        titulo: "7. Plano de contratações anual",
        blocos: [p("Previsão no plano de contratações anual (art. 12, VII, da Lei nº 14.133/2021): [item do plano, ou justificativa da ausência].")],
      },
      {
        titulo: "Assinatura",
        blocos: [p(`${f.municipio}, [data].`), p("[Nome do(a) responsável pela demanda]\n[Cargo]")],
      },
    ],
  };
}

function etp(f: Fatos, h: ContratoDoHistorico[]): Documento {
  const obrig = " (obrigatório — art. 18, § 2º)";
  const item = (n: string, titulo: string, blocos: Bloco[], obrigatorio = false): Clausula => ({
    titulo: `${n}. ${titulo}${obrigatorio ? obrig : ""}`,
    blocos,
  });
  const justificativa = f.fim
    ? `O ${f.contratoNome}, com ${f.contratada}, encerra a vigência em ${dataBr(f.fim)}.`
    : `O ${f.contratoNome}, com ${f.contratada}, atende hoje a esta necessidade.`;
  return {
    chave: "etp",
    nome: "Estudo técnico preliminar",
    subtitulo: `Nova contratação — ${f.objetoTitulo}`,
    resumo: "Os treze elementos do art. 18, § 1º, com o que o sistema já sabe preenchido e o resto marcado.",
    geramos: true,
    clausulas: [
      {
        titulo: "Sobre este estudo",
        blocos: [
          p(
            "Os elementos seguem o art. 18, § 1º, da Lei nº 14.133/2021. Os marcados como obrigatórios precisam constar; " +
              "os demais, quando não preenchidos, exigem justificativa da ausência."
          ),
        ],
      },
      item("I", "Descrição da necessidade", [p(justificativa), p("[O problema a resolver, sob a perspectiva do interesse público.]")], true),
      item("II", "Previsão no plano de contratações anual", [p("[Item do plano de contratações anual em que a contratação está prevista.]")]),
      item("III", "Requisitos da contratação", [p("[Requisitos técnicos, de qualificação e de prazo.]")]),
      item(
        "IV",
        "Estimativa das quantidades",
        [p("[Quantidades, com a memória de cálculo e os documentos que as sustentam.]"), p(referenciaDeValor(f))],
        true
      ),
      item("V", "Levantamento de mercado", [...blocoDoHistorico(h), p("[Alternativas de solução analisadas e a justificativa da escolha.]")]),
      item(
        "VI",
        "Estimativa do valor da contratação",
        [
          p("[Valor estimado, com os preços unitários de referência e a memória de cálculo, a partir da pesquisa de preços do art. 23 da Lei nº 14.133/2021.]"),
          p("As contratações do próprio município listadas no item V são um dos parâmetros dessa pesquisa, não o seu resultado."),
        ],
        true
      ),
      item("VII", "Descrição da solução como um todo", [p("[Inclusive manutenção e assistência técnica, quando for o caso.]")]),
      item("VIII", "Justificativa para o parcelamento ou não", [p("[Por que a contratação é ou não dividida em itens ou lotes.]")], true),
      item("IX", "Resultados pretendidos", [p("[Economicidade e melhor aproveitamento dos recursos.]")]),
      item("X", "Providências prévias ao contrato", [p("[Inclusive a designação e a capacitação de quem vai gerir e fiscalizar o contrato.]")]),
      item("XI", "Contratações correlatas ou interdependentes", [p("[Outras contratações de que esta depende ou que dependem dela.]")]),
      item("XII", "Impactos ambientais e medidas mitigadoras", [p("[Quando aplicável.]")]),
      item("XIII", "Posicionamento conclusivo", [p("[Conclusão sobre a adequação da contratação ao fim a que se destina.]")], true),
    ],
  };
}

// ── O PACOTE ──

export type PacoteRenovacao = {
  caminho: CaminhoRenovacao;
  documentos: Documento[];
  /** O que só a prefeitura pode preencher, sem repetição. */
  pendencias: string[];
  /** Impressão do texto: muda quando qualquer palavra dos documentos muda. */
  impressao: string;
};

export function montarPacote(
  caminho: CaminhoRenovacao,
  contrato: ContratoParaRenovacao,
  prefeitura: PrefeituraParaRenovacao,
  historico: ContratoDoHistorico[]
): PacoteRenovacao {
  const f = fatos(contrato, prefeitura);
  const documentos =
    caminho === "prorrogar"
      ? [oficioContratada(f), checklistProrrogacao(f, limiteDecenal(contrato)), termoAditivo(f)]
      : [dfd(f, historico, editalAte(contrato)), etp(f, historico)];
  return {
    caminho,
    documentos,
    pendencias: pendenciasDe(documentos),
    impressao: impressaoDoPacote(caminho, documentos),
  };
}

/** Os [colchetes] dos documentos, na ordem em que aparecem. */
export function pendenciasDe(documentos: Documento[]): string[] {
  const vistos = new Set<string>();
  for (const d of documentos) {
    for (const m of textoCorrido(d).match(/\[[^\]\n]+\]/g) ?? []) vistos.add(m);
  }
  return [...vistos];
}

/**
 * Impressão de oito caracteres do texto dos documentos (FNV-1a, 32 bits).
 *
 * Não é segurança: é o jeito de a trilha de auditoria dizer QUAL texto foi
 * aprovado sem guardar o texto inteiro — a tabela não tem onde, e criar uma
 * exigiria migração. Como o texto é reconstruído dos dados, se a impressão de
 * hoje bate com a aprovada, o texto é o mesmo; se não bate, algo no contrato
 * mudou depois da aprovação, e a tela avisa.
 */
export function impressaoDoPacote(caminho: CaminhoRenovacao, documentos: Documento[]): string {
  const texto = `${caminho}\n${documentos.map((d) => `${d.nome}\n${textoCorrido(d)}`).join("\n")}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ── A APROVAÇÃO NA TRILHA DE AUDITORIA ──

export const ENTIDADE_RENOVACAO = "contrato";
export const ACAO_APROVAR = "aprovar";

/** O resumo gravado na auditoria. Termina com a impressão, que é o que se lê de volta. */
export function resumoDaAprovacao(
  contrato: Pick<ContratoParaRenovacao, "numeroContrato" | "fornecedorNome">,
  pacote: Pick<PacoteRenovacao, "caminho" | "impressao">
): string {
  const qual = contrato.numeroContrato ? `contrato ${contrato.numeroContrato}` : "contrato sem número";
  const quem = contrato.fornecedorNome ? ` (${contrato.fornecedorNome.slice(0, 80)})` : "";
  const oque = pacote.caminho === "prorrogar" ? "rascunho da prorrogação" : "rascunho da nova contratação";
  return `${oque} do ${qual}${quem} conferido e aprovado para instruir o processo. Ref. ${pacote.impressao}`;
}

export function impressaoDoResumo(resumo: string): string | null {
  return resumo.match(/Ref\. ([0-9a-f]{8})\b/)?.[1] ?? null;
}

export type Aprovacao = { usuarioNome: string; usuarioCargo: string; createdAt: string; resumo: string };

export type SituacaoAprovacao =
  | { tipo: "rascunho" }
  | { tipo: "aprovado"; caminho: CaminhoRenovacao; aprovacao: Aprovacao }
  /** Houve aprovação, mas o texto de hoje não é mais o aprovado. */
  | { tipo: "desatualizado"; aprovacao: Aprovacao };

/**
 * Lê a aprovação mais recente contra os pacotes de hoje.
 *
 * `aprovacoes` vem em qualquer ordem; vale a mais recente. Uma aprovação mais
 * antiga com impressão que ainda bate não ressuscita: se alguém aprovou a
 * prorrogação e depois a nova contratação, vale a última decisão.
 */
export function situacaoDaAprovacao(aprovacoes: Aprovacao[], pacotes: PacoteRenovacao[]): SituacaoAprovacao {
  const ultima = [...aprovacoes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!ultima) return { tipo: "rascunho" };
  const ref = impressaoDoResumo(ultima.resumo);
  const pacote = ref ? pacotes.find((x) => x.impressao === ref) : undefined;
  return pacote ? { tipo: "aprovado", caminho: pacote.caminho, aprovacao: ultima } : { tipo: "desatualizado", aprovacao: ultima };
}

const NOME_CARGO: Record<string, string> = {
  prefeito: "prefeito(a)",
  secretario: "secretário(a)",
  admin: "administrador(a)",
};

export function nomeDoCargo(cargo: string): string {
  return NOME_CARGO[cargo] ?? cargo;
}

/**
 * A linha que vai no topo de cada documento baixado, dizendo o estado dele.
 *
 * Um arquivo .doc circula sem a tela em volta: impresso, anexado, encaminhado.
 * Se ele não disser no próprio corpo que é rascunho, alguém vai tratá-lo como
 * peça pronta. E aprovado não é assinado — o carimbo diz isso também.
 */
export function carimboDoPacote(
  situacao: SituacaoAprovacao,
  pacote: Pick<PacoteRenovacao, "caminho" | "impressao">,
  /** A data da aprovação no fuso do município (lib/horario.ts); sem ele, a data UTC. */
  formatarData: (iso: string) => string = dataBr
): string {
  if (situacao.tipo === "aprovado" && situacao.caminho === pacote.caminho) {
    const a = situacao.aprovacao;
    return (
      `Conferido e aprovado por ${a.usuarioNome} (${nomeDoCargo(a.usuarioCargo)}) em ${formatarData(a.createdAt)} para instruir o processo. ` +
      `Aprovar não é assinar: a assinatura é no processo. Ref. ${pacote.impressao}.`
    );
  }
  return (
    "RASCUNHO montado pelo CidadeIA com os dados do PNCP, ainda não aprovado. " +
    `Confira e preencha os campos entre colchetes antes de usar. Ref. ${pacote.impressao}.`
  );
}

/**
 * O que a lista de contratos diz sobre a renovação de cada um.
 *
 * Monta os dois pacotes para saber se a aprovação registrada ainda vale — é
 * texto em memória, sem consulta, e só para os contratos que pedem decisão.
 */
export function estadoDaRenovacaoNaLista(
  contrato: ContratoParaRenovacao,
  todos: ContratoParaRenovacao[],
  prefeitura: PrefeituraParaRenovacao,
  aprovacoes: Aprovacao[],
  formatarData: (iso: string) => string = dataBr
): { estado: "rascunho" | "aprovado" | "desatualizado" | "substituido"; texto: string } | null {
  if (ehObraOuEngenharia(contrato.categoria)) return null;
  const sucessor = contratoSucessor(contrato, todos);
  if (sucessor && !aprovacoes.length) {
    return {
      estado: "substituido",
      texto: `Já há contrato posterior para o mesmo objeto${sucessor.numeroContrato ? ` (${sucessor.numeroContrato})` : ""}: não há o que renovar`,
    };
  }
  const historico = historicoDoObjeto(contrato, todos);
  const pacotes = (["prorrogar", "licitar"] as const).map((c) => montarPacote(c, contrato, prefeitura, historico));
  const s = situacaoDaAprovacao(aprovacoes, pacotes);
  if (s.tipo === "aprovado") {
    return {
      estado: "aprovado",
      texto: `${NOME_CAMINHO[s.caminho]}: aprovado por ${s.aprovacao.usuarioNome} em ${formatarData(s.aprovacao.createdAt)}`,
    };
  }
  if (s.tipo === "desatualizado") {
    return { estado: "desatualizado", texto: "O contrato mudou depois da aprovação: conferir de novo" };
  }
  return { estado: "rascunho", texto: "Documentos montados, aguardando conferência" };
}
