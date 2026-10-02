import { PLANOS_ADDON, NOME_PLANO_ADDON, type PlanoAddon } from "@/lib/planos";
import { PRECO_MENSAL, type PorteMunicipio } from "@/lib/precos";
import { LIMITE_DISPENSA, caminhoSugerido, type CaminhoContratacao } from "@/lib/contratacao";

// ── ACRESCENTAR UM MÓDULO: POR QUAL CAMINHO ──
//
// O que trava expansão em prefeitura não é a decisão, é o processo. Um
// secretário convencido do módulo de Saúde ainda não sabe se acrescentá-lo
// significa uma dispensa de alguns dias ou um pregão de alguns meses — e,
// sem saber, não leva o assunto ao prefeito.
//
// ── O ERRO QUE EU IA COMETER AQUI ──
//
// Este arquivo nasceu para avisar de um risco que NÃO EXISTE: o de a soma dos
// módulos contratados ao longo do exercício estourar o limite de dispensa e
// configurar o fracionamento que o art. 75, § 1º veda — o mesmo achado que
// lib/fracionamento.ts aponta nos contratos da prefeitura.
//
// A tabela de preços já resolve isso por desenho. Nas três faixas com valor
// definido, a soma dos SEIS módulos cabe no limite com folga, e
// tests/contratacao.test.ts trava a propriedade: se um preço subir a ponto de
// quebrá-la, a suíte quebra antes da home mentir para o prefeito.
//
// Então o que sobra aqui não é alarme, é informação: a soma do exercício é a
// que o § 1º manda fazer, e o resultado dela é uma boa notícia que o produto
// não estava contando a ninguém.
//
// ── A LEITURA É CONSERVADORA DE PROPÓSITO ──
//
// Somam-se TODOS os módulos ativos pelo valor anual, porque o produto guarda a
// lista do que está ativo e não a data de cada contrato. Um contrato em curso
// consome orçamento do exercício, então somá-lo é a leitura correta; se a
// prefeitura assinou coisas em exercícios diferentes, quem fecha a conta exata
// é o procurador dela. Errar para mais significa indicar pregão onde talvez
// coubesse dispensa — chato. Errar para menos significaria empurrar o cliente
// para a irregularidade que o produto vende para evitar.

export type ItemExpansao = {
  modulo: PlanoAddon;
  nome: string;
  /** Valor anual deste módulo na faixa do município. Null quando sob consulta. */
  anual: number | null;
};

export type Expansao = {
  /** Módulos ativos hoje, que já consomem limite no exercício. */
  jaContratados: ItemExpansao[];
  /** Módulos sendo considerados agora. */
  novos: ItemExpansao[];
  anualAtual: number;
  anualNovo: number;
  /** Anual acumulado no exercício com o mesmo fornecedor (art. 75, § 1º). */
  anualAcumulado: number;
  /** O caminho que a SOMA indica — nunca o do contrato isolado. */
  caminho: CaminhoContratacao;
  /** Quanto ainda cabe na dispensa depois de tudo. Zero quando estourou. */
  margem: number;
  /** Algum módulo envolvido está sob consulta: o total não é total. */
  incompleta: boolean;
};

function item(modulo: PlanoAddon, porte: PorteMunicipio): ItemExpansao {
  const mensal = PRECO_MENSAL[modulo][porte];
  return {
    modulo,
    nome: NOME_PLANO_ADDON[modulo],
    // Anual = mensal × 12, porque é o valor anual que o art. 75 usa. Comparar
    // o mensal com o limite anual seria o fracionamento que a lei veda.
    anual: mensal === null ? null : mensal * 12,
  };
}

const somar = (itens: ItemExpansao[]) => itens.reduce((s, i) => s + (i.anual ?? 0), 0);

export function avaliarExpansao(entrada: {
  porte: PorteMunicipio;
  jaContratados: PlanoAddon[];
  novos: PlanoAddon[];
}): Expansao {
  const ativos = new Set(entrada.jaContratados);
  // Um módulo já contratado não entra como novo: se aparecer nos dois lados,
  // conta uma vez só. Sem isto, pedir um módulo ativo dobraria o valor dele.
  const jaContratados = [...ativos].map((m) => item(m, entrada.porte));
  const novos = entrada.novos.filter((m) => !ativos.has(m)).map((m) => item(m, entrada.porte));

  const anualAtual = somar(jaContratados);
  const anualNovo = somar(novos);
  const anualAcumulado = anualAtual + anualNovo;
  const incompleta = [...jaContratados, ...novos].some((i) => i.anual === null);

  return {
    jaContratados,
    novos,
    anualAtual,
    anualNovo,
    anualAcumulado,
    caminho: caminhoSugerido(anualAcumulado),
    margem: Math.max(0, LIMITE_DISPENSA.valor - anualAcumulado),
    incompleta,
  };
}

export type ModuloDisponivel = ItemExpansao & {
  /** Se este módulo, somado ao exercício, ainda cabe na dispensa. */
  cabeNaDispensa: boolean;
  /** Sob consulta: não dá para afirmar o caminho. */
  sobConsulta: boolean;
};

/**
 * Para cada módulo ainda não contratado, se ele cabe no que resta da dispensa.
 *
 * Um por vez, e não o conjunto: a pergunta do gestor é "posso acrescentar
 * ESTE?", e responder sobre o pacote inteiro esconderia que dois dos quatro
 * ainda caberiam.
 */
export function modulosDisponiveis(
  porte: PorteMunicipio,
  jaContratados: PlanoAddon[]
): ModuloDisponivel[] {
  const ativos = new Set(jaContratados);
  return PLANOS_ADDON.filter((p) => !ativos.has(p.chave)).map((p) => {
    const e = avaliarExpansao({ porte, jaContratados, novos: [p.chave] });
    const i = e.novos[0]!;
    return {
      ...i,
      // Sob consulta não é "cabe": é "não sei". Marcar como cabendo seria a
      // afirmação mais cara que esta tela pode fazer sobre um valor que
      // ninguém decidiu ainda.
      cabeNaDispensa: i.anual !== null && e.caminho === "dispensa",
      sobConsulta: i.anual === null,
    };
  });
}

export type ResumoCaminho = {
  tom: "dispensa" | "misto" | "pregao" | "sob_consulta" | "completo";
  titulo: string;
  texto: string;
  fundamento: string;
};

/**
 * O que a tela diz sobre o caminho de contratação — SEM valores.
 *
 * A tabela de preços é interna: o cliente recebe os números na proposta, e
 * essa é decisão comercial tomada, não detalhe de implementação. O que falta
 * dentro do produto não é o preço, é a resposta sobre o PROCESSO — e ela pode
 * ser dada inteira sem revelar um real.
 *
 * Nunca afirma o enquadramento. Diz qual caminho a soma indica; quem enquadra
 * é o procurador da prefeitura, e um produto que decide isso por ele está
 * assinando um parecer que não pode assinar.
 */
export function resumoDoCaminho(
  porte: PorteMunicipio,
  jaContratados: PlanoAddon[]
): ResumoCaminho {
  const fundamento =
    `${LIMITE_DISPENSA.base}, com o limite atualizado pelo ${LIMITE_DISPENSA.atualizadoPor} ` +
    // "a conta abaixo" não existia: esta tela não mostra conta nenhuma, porque
    // a tabela é interna. A frase prometia um número que o leitor procuraria e
    // não acharia.
    `para ${LIMITE_DISPENSA.ano}. O § 1º manda somar o gasto do exercício com objetos de mesma ` +
    `natureza, e é essa soma — incluindo o que a prefeitura já tem contratado — que decide o ` +
    `caminho acima.`;

  const disponiveis = modulosDisponiveis(porte, jaContratados);

  if (disponiveis.length === 0) {
    return {
      tom: "completo",
      titulo: "Todos os módulos já estão ativos",
      texto: "Não há o que acrescentar: a prefeitura usa o produto inteiro.",
      // Sem base legal: não há contratação a enquadrar, e citar o limite de
      // dispensa aqui seria jogar norma na tela de quem não tem o que decidir.
      fundamento: "",
    };
  }

  if (disponiveis.every((m) => m.sobConsulta)) {
    return {
      tom: "sob_consulta",
      titulo: "Valores sob consulta para a faixa deste município",
      texto:
        "A tabela ainda não tem valor fechado para municípios deste porte, então o caminho de " +
        "contratação sai junto com a proposta, e não antes dela.",
      fundamento,
    };
  }

  const cabem = disponiveis.filter((m) => m.cabeNaDispensa);
  const naoCabem = disponiveis.filter((m) => !m.cabeNaDispensa && !m.sobConsulta);

  if (naoCabem.length === 0) {
    return {
      tom: "dispensa",
      titulo: "Qualquer módulo que falta cabe em dispensa",
      texto:
        `Somando o que já está contratado, acrescentar ${
          disponiveis.length === 1 ? "o módulo que falta" : "qualquer um dos módulos que faltam"
        } mantém o total do exercício abaixo do limite de dispensa. Na prática: processo de dias, ` +
        `sem edital e sem sessão pública — e o termo de referência sai pronto com a proposta.`,
      fundamento,
    };
  }

  if (cabem.length === 0) {
    return {
      tom: "pregao",
      titulo: "O caminho é pregão eletrônico",
      texto:
        "Somando o que já está contratado, acrescentar qualquer módulo passa do limite de " +
        "dispensa no exercício. O pregão leva mais tempo, e o termo de referência vai pronto.",
      fundamento,
    };
  }

  return {
    tom: "misto",
    titulo: "Parte cabe em dispensa, parte pede pregão",
    texto:
      `Somando o exercício, ${cabem.map((m) => m.nome).join(", ")} ainda ${
        cabem.length === 1 ? "cabe" : "cabem"
      } em dispensa. ${naoCabem.map((m) => m.nome).join(", ")} ${
        naoCabem.length === 1 ? "passa" : "passam"
      } do limite e ${naoCabem.length === 1 ? "pede" : "pedem"} pregão.`,
    fundamento,
  };
}
