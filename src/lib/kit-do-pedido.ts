// ── O KIT DEIXA DE SER GENÉRICO QUANDO EXISTE UM PEDIDO ──
//
// A página /kit publica os modelos em branco, e é assim que tem de ser: ela é
// pública e serve a qualquer município que queira ver antes de conversar.
//
// Mas quando alguém pede proposta, três marcadores deixam de ser pendência e
// viram dado: o município, o valor mensal e o valor de doze meses. Eles estão
// no pedido e na tabela de preços, e mandar a minuta em branco quando se sabe
// o valor é dar trabalho ao jurídico da prefeitura à toa.
//
// ── O QUE CONTINUA EM BRANCO, E POR QUÊ ──
//
// [CNPJ DO MUNICÍPIO] e [AUTORIDADE] são da prefeitura, e ela os preenche na
// assinatura. Existiria como adivinhar o CNPJ — o PNCP devolve o CNPJ do órgão
// junto do código IBGE em qualquer contratação do município —, mas seria uma
// varredura cara para preencher um campo que quem assina digita em dez
// segundos, e errar o CNPJ numa minuta é pior que deixá-lo em branco.
//
// [RAZÃO SOCIAL], [CNPJ], [ENDEREÇO] e [REPRESENTANTE LEGAL] são da empresa
// contratada e saem de lib/empresa.ts, pelo mesmo caminho do rodapé do site.

import { type Documento, type Bloco } from "@/lib/kit-contratacao";
import { EMPRESA, type DadosEmpresa } from "@/lib/empresa";

export type DadosDoPedido = {
  municipio: string;
  uf: string;
  /** Valor mensal total já calculado. Null quando alguma faixa é sob consulta. */
  mensal: number | null;
};

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Monta a tabela de substituições para um pedido.
 *
 * Só entra o que existe. Valor nulo — faixa de população sob consulta — deixa
 * o marcador no lugar, porque um contrato com "R$ 0,00" é pior que um contrato
 * com um campo visivelmente a preencher.
 */
export function substituicoesDoPedido(
  pedido: DadosDoPedido,
  empresa: DadosEmpresa = EMPRESA
): Map<string, string> {
  const m = new Map<string, string>();

  // A cláusula diz "MUNICÍPIO DE [MUNICÍPIO]", então entra só o nome, em caixa
  // alta como o resto da qualificação das partes, com a UF entre parênteses
  // para não haver dúvida entre homônimos — e há muitos no Brasil.
  m.set("[MUNICÍPIO]", `${pedido.municipio.toUpperCase()} (${pedido.uf.toUpperCase()})`);

  if (pedido.mensal !== null && pedido.mensal > 0) {
    m.set("[VALOR MENSAL]", moeda(pedido.mensal));
    m.set("[VALOR ANUAL]", moeda(pedido.mensal * 12));
  }

  // A identificação da contratada entra toda de uma vez, e só o que existe.
  // Enquanto a empresa não estiver constituída, os marcadores ficam à vista —
  // que é o certo: um contrato com a qualificação da contratada inventada é
  // pior que um com o campo em branco.
  if (empresa.razaoSocial) m.set("[RAZÃO SOCIAL]", empresa.razaoSocial);
  if (empresa.cnpj) m.set("[CNPJ]", empresa.cnpj);
  if (empresa.endereco) m.set("[ENDEREÇO]", empresa.endereco);
  if (empresa.representante) m.set("[REPRESENTANTE LEGAL]", empresa.representante);
  if (empresa.emailSuporte) m.set("[E-MAIL DE SUPORTE]", empresa.emailSuporte);
  if (empresa.telefoneSuporte) m.set("[TELEFONE]", empresa.telefoneSuporte);

  return m;
}

function aplicar(texto: string, subs: Map<string, string>): string {
  let saida = texto;
  for (const [marcador, valor] of subs) saida = saida.split(marcador).join(valor);
  return saida;
}

function preencherBloco(b: Bloco, subs: Map<string, string>): Bloco {
  if (b.tipo === "paragrafo") return { ...b, texto: aplicar(b.texto, subs) };
  if (b.tipo === "lista") return { ...b, itens: b.itens.map((i) => aplicar(i, subs)) };
  return {
    ...b,
    cabecalho: b.cabecalho.map((c) => aplicar(c, subs)),
    linhas: b.linhas.map((l) => l.map((c) => aplicar(c, subs))),
  };
}

/**
 * O documento com os dados do pedido no lugar dos marcadores.
 *
 * Recebe o documento JÁ passado por documentoPreenchido — os compromissos de
 * serviço entram antes, porque valem para qualquer município. Aqui entra só o
 * que muda de pedido para pedido.
 */
export function documentoDoPedido(
  d: Documento,
  pedido: DadosDoPedido,
  empresa: DadosEmpresa = EMPRESA
): Documento {
  const subs = substituicoesDoPedido(pedido, empresa);
  return {
    ...d,
    clausulas: d.clausulas.map((c) => ({
      titulo: aplicar(c.titulo, subs),
      blocos: c.blocos.map((b) => preencherBloco(b, subs)),
    })),
  };
}
