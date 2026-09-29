// ── PADRÕES ENTRE PROCESSOS DE LICITAÇÃO ──
//
// As regras de Licitações olhavam um processo por vez: prazo vencendo, risco
// anotado por um servidor. O que um processo sozinho nunca mostra é o
// PADRÃO — e é no padrão que o Tribunal de Contas olha primeiro:
//
//   1. O mesmo fornecedor vencendo processo atrás de processo.
//   2. Dispensa com valor colado no limite legal.
//
// O terceiro padrão clássico — várias dispensas do mesmo ramo que somadas
// passam do limite (fracionamento, art. 75, § 1º) — já tem módulo próprio em
// lib/fracionamento.ts e painel próprio na tela. Não se repete aqui.
//
// ── O QUE ESTE MÓDULO NÃO AFIRMA ──
//
// Nenhum destes padrões é ilegal por si. Um município pequeno pode ter um
// único fornecedor de merenda; uma dispensa pode legitimamente valer 98% do
// limite. O texto de cada achado diz o que foi CONTADO e manda conferir o que
// só o processo físico responde. Nunca "irregularidade", nunca "fraude".
//
// Quando o limite de dispensa não está vigente (virou o ano e ninguém
// atualizou lib/contratacao.ts), a regra 2 fica em silêncio: acusar com
// número velho é pior que não acusar.

import { LIMITE_DISPENSA, limiteEstaVigente } from "@/lib/contratacao";
import { juntarContratados, comoFoiAgrupado, type ContratoParaContratado } from "@/lib/contratados";
import { formatarMoeda } from "@/lib/formatadores";

export type ProcessoParaPadrao = {
  numero: string;
  objeto: string;
  modalidade: string | null;
  valorEstimado: number | null;
  fornecedor: string | null;
  status: string;
  /**
   * Chave do PNCP, quando o processo veio da importação.
   *
   * Declarada aqui de propósito, embora este arquivo não a leia: é por ela que
   * juntarContratados sabe que um processo já está representado por um
   * contrato e não o conta duas vezes. O campo chegava por acaso, porque o
   * select do banco traz a coluna — e dedupe que funciona por acaso some no
   * primeiro refactor que estreitar o objeto.
   */
  numeroControlePncp?: string | null;
};

export type PadraoLicitacao = {
  tipo: "fornecedor" | "teto_dispensa";
  chave: string;
  texto: string;
  acao: string;
  /** Dinheiro envolvido — ordena entre padrões. */
  peso: number;
};

// ── Limiares ──
/** A partir de quantos processos vencidos o mesmo fornecedor vira padrão. */
export const FORNECEDOR_MINIMO_PROCESSOS = 3;
/** Ou a partir de que fatia do valor homologado, com pelo menos dois processos. */
export const FORNECEDOR_FATIA_MINIMA = 0.5;
/** Dispensa a partir desta fração do limite é "colada no teto". */
export const TETO_FRACAO_ATENCAO = 0.9;

// ── Normalização ──

const PALAVRAS_VAZIAS = new Set([
  "de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "para", "com",
  "em", "no", "na", "nos", "nas", "por", "um", "uma", "ao", "aos", "the",
  "aquisicao", "contratacao", "servicos", "servico", "fornecimento", "prestacao",
  "ltda", "me", "epp", "eireli", "sa", "s", "a", "cia",
]);

function semAcento(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** "Alimentos Boa Mesa LTDA." e "alimentos boa mesa ltda" são o mesmo fornecedor. */
export function normalizarFornecedor(nome: string): string {
  return semAcento(nome)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p && !PALAVRAS_VAZIAS.has(p))
    .join(" ");
}

/** Modalidade é texto livre no cadastro; "dispensa" é reconhecida por conteúdo. */
export function ehDispensa(modalidade: string | null): boolean {
  return modalidade !== null && /dispensa/i.test(semAcento(modalidade));
}

/**
 * O limite em lib/contratacao.ts é o do art. 75, II (compras e serviços em
 * geral). Obra e serviço de engenharia têm limite próprio (inciso I), maior,
 * que este módulo não conhece — então não julga.
 */
export function pareceObraOuEngenharia(objeto: string): boolean {
  return /\b(obra|obras|engenharia|reforma|pavimenta|constru|edifica|terraplen|drenagem)/i.test(
    semAcento(objeto)
  );
}

function pct(v: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;
}

// ── 1. Concentração de fornecedor ──

export function detectarConcentracaoDeFornecedor(
  processos: ProcessoParaPadrao[],
  // ── POR QUE OS CONTRATOS ENTRAM AQUI ──
  //
  // Sem eles, este detector agrupa empresas por SEMELHANÇA DE NOME, porque o
  // campo `fornecedor` da licitação é texto livre digitado à mão. Nos dados
  // reais de um município, isso conta 115 fornecedores onde existem 114: uma
  // empresa com duas grafias vira duas, e o padrão "o mesmo fornecedor vencendo
  // processo atrás de processo" se divide em dois grupos pequenos demais para
  // disparar — justamente o caso que o detector existe para achar.
  //
  // O contrato traz CNPJ/CPF. Quando há contratos, a identidade é o documento.
  // O parâmetro é opcional para não quebrar quem só tem editais cadastrados.
  contratos: ContratoParaContratado[] = []
): PadraoLicitacao[] {
  const contratados = juntarContratados(processos, contratos);

  // O total é o do universo comparável, não o da lista inteira: a fatia só faz
  // sentido contra o que foi de fato contratado ou homologado.
  const valorTotal = contratados.reduce((s, c) => s + c.valor, 0);
  const totalDeNegocios = contratados.reduce((s, c) => s + c.quantidade, 0);
  if (totalDeNegocios < 2) return [];

  const padroes: PadraoLicitacao[] = [];
  for (const c of contratados) {
    const n = c.quantidade;
    const fatia = valorTotal > 0 ? c.valor / valorTotal : 0;
    const porQuantidade = n >= FORNECEDOR_MINIMO_PROCESSOS;
    const porValor = n >= 2 && fatia >= FORNECEDOR_FATIA_MINIMA;
    if (!porQuantidade && !porValor) continue;

    const dinheiro =
      valorTotal > 0 ? ` (${formatarMoeda(c.valor)}, ${pct(fatia * 100)} do valor homologado)` : "";

    // As referências: número do processo quando há, número de contrato quando
    // o negócio só existe como contrato.
    const referencias = [
      ...c.processosSemContrato.map((p) => p.numero),
      ...c.contratos.map((k) => k.numeroControlePncpCompra ?? k.numeroControlePncp ?? k.id),
    ];

    padroes.push({
      tipo: "fornecedor",
      // A chave muda de forma conforme a identidade, e isso é de propósito: um
      // aviso dispensado por nome não deve reaparecer silenciosamente como
      // dispensado por documento, nem o contrário.
      chave: `licitacoes:fornecedor:${c.porDocumento ? c.documento : normalizarFornecedor(c.nome)}`,
      texto:
        `${c.nome} venceu ${n} dos ${totalDeNegocios} processos homologados${dinheiro}: ` +
        `${referencias.join(", ")}. Esse agrupamento foi ${comoFoiAgrupado(c)}.`,
      acao:
        `Peça à Comissão de Licitação a relação de licitantes habilitados em cada um desses ${n} processos — ` +
        `concorrência real costuma ter mais de um habilitado, e é isso que o Tribunal de Contas pergunta primeiro.`,
      peso: c.valor,
    });
  }
  return padroes;
}

// ── 2. Dispensa colada no teto ──

export function detectarDispensaNoTeto(processos: ProcessoParaPadrao[], hoje = new Date()): PadraoLicitacao[] {
  if (!limiteEstaVigente(hoje)) return [];
  const limite = LIMITE_DISPENSA.valor;
  const padroes: PadraoLicitacao[] = [];

  for (const p of processos) {
    if (!ehDispensa(p.modalidade) || p.valorEstimado === null) continue;
    if (p.status === "cancelada") continue;
    if (pareceObraOuEngenharia(p.objeto)) continue;
    const fracao = p.valorEstimado / limite;
    if (fracao < TETO_FRACAO_ATENCAO || fracao > 1) continue;

    const folga = ((limite - p.valorEstimado) / limite) * 100;
    padroes.push({
      tipo: "teto_dispensa",
      chave: `licitacao:${p.numero}:teto`,
      texto:
        `Dispensa ${p.numero} (${p.objeto}) com valor de ${formatarMoeda(p.valorEstimado)}, ` +
        `a ${pct(folga)} do limite de dispensa de ${formatarMoeda(limite)} (${LIMITE_DISPENSA.base}).`,
      acao:
        `Confirme com a Comissão de Licitação se há outra contratação do mesmo objeto neste exercício — ` +
        `duas dispensas que somadas passam do limite configuram o fracionamento que o art. 75, § 1º, veda.`,
      peso: p.valorEstimado,
    });
  }
  return padroes;
}

/** Os dois detectores, em ordem de dinheiro envolvido. */
export function detectarPadroes(
  processos: ProcessoParaPadrao[],
  hoje = new Date(),
  contratos: ContratoParaContratado[] = []
): PadraoLicitacao[] {
  return [
    ...detectarConcentracaoDeFornecedor(processos, contratos),
    ...detectarDispensaNoTeto(processos, hoje),
  ].sort((a, b) => b.peso - a.peso);
}
