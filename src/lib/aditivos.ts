// ── QUANDO O CONTRATO CRESCE ──
//
// O art. 125 da Lei 14.133/2021 obriga o contratado a aceitar acréscimos e
// supressões de até 25% do valor inicial atualizado (50% no caso de reforma de
// edifício ou de equipamento). Acima disso, não é mais alteração: é contratação
// nova, que exige licitação nova.
//
// ── O ERRO QUE ESTE MÓDULO SE RECUSA A COMETER ──
//
// É tentador comparar valorGlobal com valorInicial e chamar a diferença de
// aditivo. Nos contratos reais de um município isso acusaria errado.
//
// Medido em São Sepé/RS: dos 134 contratos, 18 têm valor global acima do
// inicial, e cinco passam de 25%. Mas três deles são locações de imóvel com
// exatamente +8,7% cada — um índice de preços aplicado na mesma data. Isso é
// REAJUSTE, e reajuste não é acréscimo: ele recompõe o valor da moeda, não
// aumenta o objeto contratado, e por isso NÃO entra no limite do art. 125.
//
// A consulta do PNCP não separa os dois. Nenhum campo diz "isto é reajuste" ou
// "isto é acréscimo quantitativo" — só existem valorInicial, valorGlobal e um
// contador de retificações.
//
// Então este módulo NÃO conclui ilegalidade. Ele mede a variação, diz que a
// origem dela não está no dado, e manda conferir no termo aditivo — que é onde
// a resposta existe. Uma tela que acusa cinco contratos e erra em três ensina
// o gestor a ignorar a tela.

/** Limite geral de acréscimos e supressões, em pontos percentuais. */
export const LIMITE_ALTERACAO = 25;

/** Limite especial de reforma de edifício ou de equipamento. */
export const LIMITE_ALTERACAO_REFORMA = 50;

export const BASE_LEGAL_ALTERACAO = "Art. 125 da Lei 14.133/2021";

export type ContratoParaAditivo = {
  objeto: string;
  valorInicial: number | null;
  valorGlobal: number | null;
  /** Quantas retificações o PNCP registra. Indica que houve mexida. */
  numeroRetificacao: number | null;
};

export type SituacaoAditivo =
  /** Valor global igual ao inicial. */
  | "sem_variacao"
  /** Cresceu, mas dentro do limite mesmo se tudo fosse acréscimo. */
  | "dentro_do_limite"
  /** Cresceu acima do limite SE a variação for acréscimo — e isso não se sabe. */
  | "acima_se_for_acrescimo"
  /** Encolheu. */
  | "supressao"
  /** Falta valor para comparar. */
  | "sem_base";

export type LeituraAditivo = {
  situacao: SituacaoAditivo;
  /** Variação percentual do global sobre o inicial. */
  variacao: number | null;
  /** Em reais. */
  diferenca: number | null;
  /** O limite aplicável ao objeto (25% ou 50% de reforma). */
  limite: number;
  texto: string;
  acao: string;
  peso: number;
};

/**
 * Reforma de edifício ou de equipamento tem limite de 50%.
 *
 * Reconhecer isso importa justamente para NÃO acusar: um contrato de reforma a
 * 40% está dentro do limite dele, e tratá-lo pela régua de 25% seria um alarme
 * falso no exato caso em que a lei é mais permissiva.
 */
export function ehReforma(objeto: string): boolean {
  const t = objeto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  return /\breforma|reformar|readequacao|recuperacao de (predio|edificio|escola|posto)/.test(t);
}

export function limiteDoObjeto(objeto: string): number {
  return ehReforma(objeto) ? LIMITE_ALTERACAO_REFORMA : LIMITE_ALTERACAO;
}

function pct(v: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;
}

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function lerAditivo(contrato: ContratoParaAditivo): LeituraAditivo {
  const limite = limiteDoObjeto(contrato.objeto);
  const inicial = contrato.valorInicial;
  const global = contrato.valorGlobal;

  // Dividir por zero devolveria Infinity e a tela mostraria "∞%". Um contrato
  // com valor inicial zero existe nos dados reais.
  if (!inicial || inicial <= 0 || global === null) {
    return {
      situacao: "sem_base",
      variacao: null,
      diferenca: null,
      limite,
      texto: "Valor inicial não informado — não há base para comparar com o valor global.",
      acao: "Confira o valor inicial no termo de contrato.",
      peso: 0,
    };
  }

  const diferenca = global - inicial;
  const variacao = (diferenca / inicial) * 100;

  if (Math.abs(variacao) < 0.01) {
    return {
      situacao: "sem_variacao",
      variacao: 0,
      diferenca: 0,
      limite,
      texto: `Valor global igual ao inicial (${moeda(inicial)}).`,
      acao: "",
      peso: 0,
    };
  }

  if (variacao < 0) {
    return {
      situacao: "supressao",
      variacao,
      diferenca,
      limite,
      texto: `Valor global ${pct(Math.abs(variacao))} abaixo do inicial (${moeda(global)} contra ${moeda(inicial)}).`,
      acao:
        Math.abs(variacao) > limite
          ? `Supressão acima de ${limite}% só com concordância do contratado (${BASE_LEGAL_ALTERACAO}). ` +
            "Confirme se há termo aditivo com o aceite registrado."
          : "",
      peso: Math.abs(diferenca),
    };
  }

  // ── A FRASE QUE NÃO ACUSA ──
  //
  // Só o que o dado sustenta: o valor global está X% acima do inicial. A origem
  // dessa diferença — reajuste por índice (não entra no limite) ou acréscimo de
  // objeto (entra) — não está em nenhum campo da consulta.
  const retificacoes =
    contrato.numeroRetificacao && contrato.numeroRetificacao > 0
      ? ` O PNCP registra ${contrato.numeroRetificacao} ${
          contrato.numeroRetificacao === 1 ? "retificação" : "retificações"
        } neste contrato.`
      : "";

  const comum =
    `Valor global ${pct(variacao)} acima do inicial: ${moeda(global)} contra ${moeda(inicial)}, ` +
    `diferença de ${moeda(diferenca)}.${retificacoes}`;

  const conferir =
    "A consulta do PNCP não separa reajuste de acréscimo, e a diferença entre os dois decide tudo: " +
    "reajuste recompõe o valor da moeda e NÃO entra no limite; acréscimo de objeto entra. " +
    "O termo aditivo diz qual é — é lá que se confere.";

  if (variacao > limite) {
    return {
      situacao: "acima_se_for_acrescimo",
      variacao,
      diferenca,
      limite,
      texto: comum,
      acao:
        `Se a diferença for acréscimo, passa do limite de ${limite}% do valor inicial atualizado ` +
        `(${BASE_LEGAL_ALTERACAO}${limite === LIMITE_ALTERACAO_REFORMA ? ", limite de reforma" : ""}), ` +
        `e acima do limite a alteração deixa de ser aditivo e vira contratação nova. ${conferir}`,
      peso: diferenca,
    };
  }

  return {
    situacao: "dentro_do_limite",
    variacao,
    diferenca,
    limite,
    texto: comum,
    // A conclusão ("está dentro") não depende de a diferença ser reajuste ou
    // acréscimo — é verdadeira nos dois casos. A ressalva fica mesmo assim,
    // porque o NÚMERO aparece na tela: sem ela, quem lê "+8,7%" conclui que
    // houve aditivo e repete isso na câmara, quando pode ter sido só a
    // correção do valor da moeda.
    acao:
      `Dentro do limite de ${limite}% mesmo se toda a diferença fosse acréscimo ` +
      `(${BASE_LEGAL_ALTERACAO}). Vale lembrar que parte dela pode ser reajuste por índice, ` +
      `que recompõe o valor da moeda e não é aditivo — o termo aditivo diz qual é.`,
    peso: diferenca,
  };
}
