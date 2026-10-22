import type { ObraFederal } from "@/lib/obras-federais";
import { encerrada } from "@/lib/obras-federais";

// ── A OBRA PARADA VAI A PÚBLICO SOZINHA ──
//
// Lei 14.133/2021, art. 115, § 6º:
//
//   "Nas contratações de obras, verificada a ocorrência do disposto no § 5º
//   deste artigo por mais de 1 (um) mês, a Administração deverá divulgar, em
//   sítio eletrônico oficial e em placa a ser afixada em local da obra de
//   fácil visualização, aviso público de obra paralisada, com o motivo e o
//   responsável pela inexecução temporária do objeto do contrato e a data
//   prevista para o reinício da sua execução."
//
// A regra existe desde 2021 e quase nenhuma prefeitura cumpre: depende de
// alguém lembrar, redigir e publicar. Aqui ninguém precisa lembrar. O sistema
// já sabe quais obras pararam (o ObrasGov registra paralisação e
// justificativa das obras com dinheiro federal; a prefeitura marca as suas),
// monta o aviso com o que a lei pede e publica no portal da cidade, com a
// placa pronta para imprimir.
//
// Junto vai a conta que o morador não consegue fazer sozinho: quanto da obra
// foi executado e quanto do dinheiro já foi pago. Obra começada, paga adiante
// e largada é exatamente a prática que a transparência desmonta. Mostramos
// os dois números lado a lado, sem adjetivo: o fato fala.
//
// Esta é a parte pura. A leitura está em lib/portal-servidor.ts.

export const DIAS_PARA_AVISO = 30;
/** Diferença, em pontos percentuais, a partir da qual o pagamento está à frente da obra. */
export const PAGAMENTO_A_FRENTE_PP = 20;

export type ObraParadaPublica = {
  id: string;
  origem: "federal" | "municipal";
  nome: string;
  bairro: string | null;
  situacao: "paralisada" | "inacabada";
  paradaDesde: string | null;
  diasParada: number | null;
  motivo: string | null;
  responsavel: string | null;
  retomadaPrevista: string | null;
  /** Percentual físico executado. */
  executado: number | null;
  /** Base do percentual pago: valor do contrato (municipal) ou empenhado (federal). */
  valorBase: number | null;
  pago: number | null;
  pagoPct: number | null;
  pagamentoAFrente: boolean;
  fonte: string;
};

type ObraMunicipal = {
  id: string;
  nome: string;
  bairro: string | null;
  status: string;
  progressoAtual: number | null;
  valorContrato: number | null;
  fornecedorNome: string | null;
  atualizadoEm: string;
};

type DecisaoMunicipal = {
  obraId: string;
  tipo: string;
  justificativa: string;
  novaPrevisao: string | null;
  decididoEm: string;
};

const DIA = 86_400_000;
const dia = (t: string | null | undefined) => (t && /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null);
const diasDesde = (iso: string | null, hoje: Date) =>
  iso ? Math.max(0, Math.floor((hoje.getTime() - Date.parse(`${iso}T12:00:00Z`)) / DIA)) : null;

function pagamento(executado: number | null, valorBase: number | null, pago: number | null) {
  const pagoPct = valorBase && valorBase > 0 && pago !== null ? Math.min(100, (pago / valorBase) * 100) : null;
  const pagamentoAFrente = pagoPct !== null && executado !== null && pagoPct - executado >= PAGAMENTO_A_FRENTE_PP;
  return { pagoPct, pagamentoAFrente };
}

export function obrasParadasParaPublicar(
  municipais: ObraMunicipal[],
  decisoes: DecisaoMunicipal[],
  federais: ObraFederal[],
  hoje: Date = new Date()
): ObraParadaPublica[] {
  const ultimaDecisao = new Map<string, DecisaoMunicipal>();
  for (const d of decisoes) {
    const atual = ultimaDecisao.get(d.obraId);
    if (!atual || d.decididoEm > atual.decididoEm) ultimaDecisao.set(d.obraId, d);
  }

  const lista: ObraParadaPublica[] = [];

  for (const o of municipais) {
    if (o.status !== "paralisada") continue;
    const d = ultimaDecisao.get(o.id);
    const desde = dia(o.atualizadoEm);
    const executado = o.progressoAtual;
    lista.push({
      id: `m-${o.id}`,
      origem: "municipal",
      nome: o.nome,
      bairro: o.bairro,
      situacao: "paralisada",
      paradaDesde: desde,
      diasParada: diasDesde(desde, hoje),
      // A justificativa registrada na decisão sobre a obra é o motivo que o
      // gestor já escreveu para o Tribunal: o mesmo texto serve ao morador.
      motivo: d?.justificativa?.trim() || null,
      responsavel: o.fornecedorNome,
      retomadaPrevista: dia(d?.novaPrevisao),
      executado,
      valorBase: o.valorContrato,
      pago: null,
      ...pagamento(executado, o.valorContrato, null),
      fonte: "Prefeitura",
    });
  }

  for (const o of federais) {
    if (encerrada(o.situacao)) continue;
    const sit = (o.situacao ?? "").toLowerCase();
    if (!sit.includes("paralis") && !sit.includes("inacab")) continue;
    const desde = o.paralisadaEm;
    lista.push({
      id: `f-${o.id}`,
      origem: "federal",
      nome: o.nome,
      bairro: null,
      situacao: sit.includes("inacab") ? "inacabada" : "paralisada",
      paradaDesde: desde,
      diasParada: diasDesde(desde, hoje),
      motivo: o.justificativa,
      responsavel: o.responsavel,
      retomadaPrevista: null,
      executado: o.percentual,
      valorBase: o.empenhado,
      pago: o.pago,
      ...pagamento(o.percentual, o.empenhado, o.pago),
      fonte: "ObrasGov",
    });
  }

  return (
    lista
      // A lei manda avisar depois de um mês parada; sem data, publica-se (o
      // ObrasGov já a dá como paralisada, e esconder seria o pior erro).
      .filter((o) => o.diasParada === null || o.diasParada >= DIAS_PARA_AVISO)
      .sort((a, b) => (b.diasParada ?? 0) - (a.diasParada ?? 0) || a.nome.localeCompare(b.nome, "pt-BR"))
  );
}

/** As frases do aviso, iguais no portal e na placa. */
export function textosDoAviso(o: ObraParadaPublica) {
  const br = (iso: string) => iso.split("-").reverse().join("/");
  return {
    situacao: o.situacao === "inacabada" ? "Obra inacabada" : "Obra paralisada",
    desde: o.paradaDesde ? `Parada desde ${br(o.paradaDesde)}${o.diasParada !== null ? ` (${o.diasParada} dias)` : ""}` : "Data da paralisação não registrada",
    motivo: o.motivo ?? "Motivo ainda não informado pela prefeitura",
    responsavel: o.responsavel ?? "Responsável ainda não informado",
    retomada: o.retomadaPrevista ? `Reinício previsto para ${br(o.retomadaPrevista)}` : "Sem data de reinício informada",
  };
}
