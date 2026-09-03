// ── NÚMEROS DE EXEMPLO PARA AS TELAS DE CONFORMIDADE ──
//
// Mínimos e teto de pessoal dependem de número que só o contador fecha, e uma
// prefeitura recém-cadastrada não tem nenhum. As duas telas abriam pedindo
// dado, e uma tela que só pede dado não mostra por que vale a pena informá-lo:
// numa demonstração para prefeito, ela não vende nada.
//
// Então, ENQUANTO NÃO HOUVER NENHUM DADO, as telas mostram um município
// fictício. Três regras que não podem cair:
//
// 1. Tudo ou nada. Se a prefeitura informou saúde mas não o FUNDEB, o cartão
//    do FUNDEB fica vazio — nunca com exemplo ao lado de número real. Um
//    cartão inventado convivendo com um verdadeiro é a forma mais fácil de o
//    gestor levar o errado para uma reunião.
//
// 2. Município com nome próprio. "Serra do Ipê" não é a cidade de ninguém.
//    Usar o nome real do município no exemplo produziria exatamente a captura
//    de tela que não pode existir.
//
// 3. Não sai daqui. Estes números vivem só na renderização das duas telas.
//    Não entram em detecção, na Central, no telão, no PDF nem na exportação —
//    tudo isso lê o banco, e o banco continua vazio. É o que garante que o
//    exemplo não vira alerta e nem número em prestação de contas.

export const MUNICIPIO_EXEMPLO = "Serra do Ipê";

export const AVISO_EXEMPLO =
  "Números de exemplo, de um município fictício. Assim que você informar os " +
  "seus, esta tela passa a mostrar a sua prefeitura e o exemplo desaparece.";

/**
 * Bases dos três mínimos, acumuladas até agosto de um exercício qualquer.
 *
 * Escolhidos para a tela DEMONSTRAR o que ela faz, e não para tranquilizar:
 * um piso cumprido e dois abaixo do ritmo. Um exemplo todo verde mostraria
 * uma tela bonita e inútil — quem compra precisa ver o produto achando
 * problema, que é o serviço que ele contrata.
 *
 * Também não são todos vermelhos: uma prefeitura fictícia em colapso soaria
 * inventada, e o prefeito descartaria o exemplo inteiro.
 */
export const EXEMPLO_MINIMOS = {
  educacao: { baseCalculo: 48_000_000, aplicado: 12_600_000, mesReferencia: 8 },
  saude: { baseCalculo: 42_000_000, aplicado: 5_460_000, mesReferencia: 8 },
  fundeb: { baseCalculo: 18_000_000, aplicado: 11_520_000, mesReferencia: 8 },
} as const;

/**
 * Um período de despesa com pessoal no patamar prudencial.
 *
 * 51,98% da RCL: dentro da lei e já sob as vedações do art. 22. É o estado
 * mais instrutivo dos quatro, porque é o único que surpreende — o prefeito
 * que olha só o teto de 54% acha que tem folga, e descobre pela tela que já
 * não pode nomear nem reajustar.
 */
export const EXEMPLO_PESSOAL = {
  rcl: 96_000_000,
  despesa: 49_900_000,
  mesReferencia: 8,
  // Como se tivesse sido digitado. Marcar "siconfi" faria a tabela dizer que
  // veio do Tesouro um número que não existe em relatório nenhum.
  origem: "manual",
} as const;
