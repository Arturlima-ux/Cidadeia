import { LIMITE_DISPENSA } from "@/lib/contratacao";

// ── FRACIONAMENTO DE DESPESA ──
//
// A dispensa por valor tem limite anual, e a lei manda somar antes de
// enquadrar: contam o total gasto no exercício pela unidade gestora E o
// total gasto com objetos de mesma natureza — "aqueles relativos a
// contratações no mesmo ramo de atividade" (art. 75, § 1º, da Lei
// 14.133/2021).
//
// Dividir uma compra grande em várias dispensas pequenas para caber no limite
// é a irregularidade mais comum em município pequeno, e raramente por
// má-fé: acontece porque ninguém somou. Três compras de material de limpeza
// em meses diferentes, cada uma bem abaixo do limite, juntas passam dele — e
// o achado só aparece na auditoria, anos depois.
//
// ── ISTO APONTA SUSPEITA, NÃO VEREDITO ──
//
// "Mesmo ramo de atividade" é juízo, não cálculo. Agrupar por semelhança de
// texto acerta na maioria dos casos e erra em alguns — e errar aqui significa
// insinuar irregularidade a um gestor que não cometeu nenhuma. Por isso o
// módulo devolve GRUPOS PARA CONFERIR, com o texto dos objetos à vista, e a
// tela precisa pedir a conferência humana em vez de afirmar a infração.

/**
 * Palavras que aparecem em quase todo objeto de licitação e por isso não
 * distinguem nada. Tirá-las é o que faz "aquisição de material de limpeza" e
 * "compra de materiais de limpeza" caírem no mesmo grupo, enquanto "material
 * de expediente" fica de fora — o que distingue é "limpeza" e "expediente",
 * não "material".
 */
const VAZIAS = new Set([
  "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos", "e",
  "em", "na", "nas", "no", "nos", "o", "os", "para", "pela", "pelo", "por",
  "sob", "sobre", "um", "uma",
  // Filler de compra pública: presente em tudo, informativo em nada.
  //
  // Listado no SINGULAR porque o descarte roda DEPOIS da redução ao singular —
  // "aquisições" já chega aqui como "aquisicao". Escrever a forma plural aqui
  // não teria efeito, e a palavra escaparia do filtro.
  "aquisicao", "compra", "contratacao", "eventual", "fornecimento", "futura",
  "prestacao", "servico", "empresa", "especializada", "atender", "atendimento",
  "necessidade", "demanda", "diverso", "diversa", "objeto", "municipio",
  "municipal", "prefeitura", "secretaria", "destinado", "visando", "referente",
  "conforme", "geral", "item", "itens", "lote", "processo",
]);

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Reduz a palavra ao singular.
 *
 * Sem isto, "material de limpeza" e "materiais de limpeza" não se encontram, e
 * o fracionamento deixa de ser detectado — em silêncio, que é o pior modo de
 * falhar numa verificação. O plural português não é só "tirar o s": material
 * vira materiais, papel vira papéis, licitação vira licitações. As regras
 * abaixo cobrem essas formas, na ordem do mais específico para o mais geral.
 */
export function singular(palavra: string): string {
  if (palavra.length <= 3) return palavra;

  if (palavra.endsWith("oes") || palavra.endsWith("aes")) return palavra.slice(0, -3) + "ao";
  if (palavra.endsWith("ais")) return palavra.slice(0, -3) + "al";
  if (palavra.endsWith("eis")) return palavra.slice(0, -3) + "el";
  if (palavra.endsWith("ois")) return palavra.slice(0, -3) + "ol";
  if (palavra.endsWith("ns")) return palavra.slice(0, -2) + "m";
  // "veiculos" → "veiculo", mas também "reses" → "res": tirar só "es" quando
  // sobra palavra com corpo suficiente.
  if (palavra.endsWith("es") && palavra.length > 5) return palavra.slice(0, -2);
  if (palavra.endsWith("s")) return palavra.slice(0, -1);
  return palavra;
}

/**
 * Reduz o objeto ao conjunto de palavras que de fato o caracterizam.
 *
 * Números saem: "aquisição de 500 resmas" e "aquisição de 200 resmas" são o
 * mesmo ramo, e a quantidade só atrapalharia a comparação.
 */
export function termosDoObjeto(objeto: string): Set<string> {
  const palavras = semAcento(objeto.toLowerCase())
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length >= 4)
    .map(singular)
    // O descarte vem DEPOIS de reduzir ao singular, senão "aquisições" escapa
    // da lista de palavras vazias por estar no plural.
    .filter((p) => p.length >= 4 && !VAZIAS.has(p));

  return new Set(palavras);
}

/** Semelhança de Jaccard: interseção sobre união dos termos. */
export function semelhanca(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersecao = 0;
  for (const t of a) if (b.has(t)) intersecao += 1;
  const uniao = a.size + b.size - intersecao;
  return uniao === 0 ? 0 : intersecao / uniao;
}

/**
 * Acima deste ponto dois objetos entram no mesmo grupo.
 *
 * Deliberadamente alto. Um limiar frouxo junta "merenda escolar" com
 * "transporte escolar" e faz a tela insinuar irregularidade onde não há —
 * e um alerta injusto queima a confiança do gestor de vez. Preferimos deixar
 * passar um caso a acusar um inocente.
 */
const LIMIAR_SEMELHANCA = 0.5;

export type ProcessoDispensa = {
  id: string;
  numero: string;
  objeto: string;
  valor: number;
  /** Data em formato ISO — usada só para dizer em que exercício caiu. */
  data: string;
};

export type GrupoFracionamento = {
  /** Termos que uniram o grupo. É o que a tela mostra como "mesmo ramo". */
  termos: string[];
  processos: ProcessoDispensa[];
  total: number;
  /** true quando a soma do grupo ultrapassa o limite anual de dispensa. */
  excedeLimite: boolean;
  /** Quanto passou do limite. Zero quando não passou. */
  excedente: number;
};

/**
 * Agrupa dispensas por semelhança de objeto e soma cada grupo.
 *
 * Agrupamento por ligação simples: se A se parece com B e B com C, os três
 * ficam juntos mesmo que A e C não se pareçam diretamente. É o comportamento
 * certo aqui — o que a lei olha é a natureza comum, e uma cadeia de compras
 * parecidas é exatamente o padrão do fracionamento.
 */
export function agruparPorObjeto(processos: ProcessoDispensa[]): GrupoFracionamento[] {
  const termos = processos.map((p) => termosDoObjeto(p.objeto));
  const grupoDe = processos.map((_, i) => i);

  function raiz(i: number): number {
    while (grupoDe[i] !== i) {
      grupoDe[i] = grupoDe[grupoDe[i]];
      i = grupoDe[i];
    }
    return i;
  }

  for (let i = 0; i < processos.length; i++) {
    for (let j = i + 1; j < processos.length; j++) {
      if (semelhanca(termos[i], termos[j]) >= LIMIAR_SEMELHANCA) {
        const ri = raiz(i);
        const rj = raiz(j);
        if (ri !== rj) grupoDe[rj] = ri;
      }
    }
  }

  const porRaiz = new Map<number, number[]>();
  for (let i = 0; i < processos.length; i++) {
    const r = raiz(i);
    porRaiz.set(r, [...(porRaiz.get(r) ?? []), i]);
  }

  const grupos: GrupoFracionamento[] = [];
  for (const indices of porRaiz.values()) {
    // Processo sozinho não é fracionamento — é uma compra.
    if (indices.length < 2) continue;

    const doGrupo = indices.map((i) => processos[i]);
    const total = doGrupo.reduce((s, p) => s + p.valor, 0);

    // Termos que TODOS compartilham: é o que descreve honestamente o que uniu
    // o grupo. Mostrar os termos de um só dos processos daria a impressão
    // errada de que o agrupamento saiu dele.
    const comuns = indices
      .map((i) => termos[i])
      .reduce((acc, t) => new Set([...acc].filter((x) => t.has(x))));

    grupos.push({
      termos: [...comuns].sort(),
      processos: doGrupo.sort((a, b) => a.data.localeCompare(b.data)),
      total,
      excedeLimite: total > LIMITE_DISPENSA.valor,
      excedente: Math.max(0, total - LIMITE_DISPENSA.valor),
    });
  }

  // Maior soma primeiro: é a ordem em que o gestor quer olhar.
  return grupos.sort((a, b) => b.total - a.total);
}

export type AnaliseFracionamento = {
  exercicio: number;
  limite: number;
  /** Soma de TODAS as dispensas do exercício, independente de objeto. */
  totalDispensas: number;
  gruposSuspeitos: GrupoFracionamento[];
  /** Grupos que ainda não passaram do limite, mas já estão perto. */
  gruposEmAtencao: GrupoFracionamento[];
};

/**
 * Percentual do limite a partir do qual um grupo entra em atenção mesmo sem
 * ter passado. Serve para o gestor saber ANTES de abrir a próxima dispensa
 * que aquele ramo já está no fim da margem.
 */
const FAIXA_ATENCAO = 0.8;

export function analisarFracionamento(
  processos: ProcessoDispensa[],
  exercicio: number
): AnaliseFracionamento {
  const grupos = agruparPorObjeto(processos);

  return {
    exercicio,
    limite: LIMITE_DISPENSA.valor,
    totalDispensas: processos.reduce((s, p) => s + p.valor, 0),
    gruposSuspeitos: grupos.filter((g) => g.excedeLimite),
    gruposEmAtencao: grupos.filter(
      (g) => !g.excedeLimite && g.total >= LIMITE_DISPENSA.valor * FAIXA_ATENCAO
    ),
  };
}

export const BASE_LEGAL_FRACIONAMENTO =
  "Art. 75, § 1º, da Lei 14.133/2021 — soma-se o gasto do exercício com objetos de mesma natureza.";
