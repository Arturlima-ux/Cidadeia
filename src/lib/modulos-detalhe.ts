import { PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";

// ── O QUE CADA MÓDULO REALMENTE FAZ ──
//
// A home descrevia cada módulo em uma frase ("Dashboard de obras, progresso,
// mapa e relatório em PDF, com IA aplicada à secretaria"). Para um comprador
// público — que é conservador e precisa justificar a escolha internamente —
// isso é pouca superfície de confiança. Ele não consegue levar uma frase para
// dentro da prefeitura e defender a contratação com ela.
//
// Cada linha abaixo corresponde a um campo que existe no banco ou a uma regra
// que roda no código. Nada aqui é aspiração: se a capacidade não está
// implementada, ela não está escrita.
//
// A separação entre `automacao` e `ia` é deliberada e importa:
//
//   - `automacao` são regras determinísticas em lib/deteccao-automatica.ts.
//     Rodam sempre, não custam nada por uso e não dependem de chave nenhuma.
//   - `ia` é chamada ao modelo da Anthropic. Depende de ANTHROPIC_API_KEY
//     configurada no ambiente. Sem a chave, a função devolve erro explicando
//     isso em vez de inventar resposta.
//
// Misturar as duas na mesma frase seria vender como inteligência artificial
// aquilo que é um `if`, e prometer como pronto aquilo que depende de uma
// variável de ambiente que pode não estar lá.

export type ModuloDetalhe = {
  chave: PlanoAddon;
  /** Uma linha do que o módulo entrega, para o card. */
  resumo: string;
  /** Cada item mapeia um campo real do banco ou uma tela existente. */
  capacidades: string[];
  /** Regra determinística. Roda sem chave de API. */
  automacao: string | null;
  /** Depende de ANTHROPIC_API_KEY. Null quando o módulo não chama o modelo. */
  ia: string | null;
  /** true quando o cidadão consegue conferir isso no portal público. */
  noPortal: boolean;
};

export const MODULOS_DETALHE: ModuloDetalhe[] = [
  {
    chave: "essencial",
    resumo: "Os três canais de relação com o cidadão, abertos ao público.",
    capacidades: [
      "Protocolo com número e chave privada de consulta emitidos na hora",
      "Ouvidoria que aceita manifestação sem identificação, com protocolo aleatório",
      "Portal com endereço público próprio do município, que abre sem cadastro",
      "Reclamação, denúncia, sugestão, elogio e pedido de informação no mesmo canal",
      "Contagem do prazo legal de resposta, com aviso antes de vencer",
    ],
    automacao:
      "Conta os 20 dias da Lei de Acesso à Informação e os 30 da Lei 13.460 por manifestação, avisa cinco dias antes de vencer e separa o que já venceu.",
    ia: "As manifestações entram no contexto que o modelo lê para sugerir alertas.",
    noPortal: true,
  },
  {
    chave: "gestao",
    resumo: "A visão do prefeito sobre a prefeitura inteira, numa tela só.",
    capacidades: [
      "Acompanhamento dos mínimos de 25% em educação e 15% em saúde, durante o exercício",
      "Receita, despesa, investimento e saldo consolidados do município",
      "Alertas de todas as secretarias reunidos numa lista única",
      "Relatório executivo em PDF, sem limite de geração",
      "Administração de usuários: cada secretário só enxerga a própria área",
    ],
    automacao:
      "Calcula quanto falta aplicar para fechar o ano dentro dos mínimos constitucionais, e quantas vezes o ritmo mensal precisa subir para chegar lá. Aponta saldo negativo assim que aparece.",
    ia: "Sugere alertas a partir dos dados já cadastrados — sempre para aprovação humana, nunca publicados sozinhos.",
    noPortal: false,
  },
  {
    chave: "saude",
    resumo: "Onde estão as unidades e como andam os indicadores da secretaria.",
    capacidades: [
      "Unidades por tipo — UBS, posto, hospital e SAMU — com bairro e mapa",
      "Tempo médio de atendimento e número de médicos ativos",
      "Percentual de faltas e nível de estoque de medicamentos",
      "Relatório da secretaria em PDF",
    ],
    automacao: "Avisa quando o indicador passa de 30 dias sem atualização.",
    ia: "Aponta o ponto mais importante agora e sugere uma ação concreta — ou diz que não há dado suficiente, em vez de forçar um insight genérico.",
    noPortal: false,
  },
  {
    chave: "educacao",
    resumo: "A rede municipal com frequência, notas e evasão por escola.",
    capacidades: [
      "Escolas com bairro, percentual de evasão e mapa",
      "Frequência média e nota média da rede",
      "Alunos no transporte escolar e professores ativos",
      "Relatório da secretaria em PDF",
    ],
    automacao: "Avisa quando o indicador passa de 30 dias sem atualização.",
    ia: "Aponta o ponto mais importante agora e sugere uma ação concreta — ou diz que não há dado suficiente, em vez de forçar um insight genérico.",
    noPortal: false,
  },
  {
    chave: "obras",
    resumo: "Progresso real contra o previsto, obra por obra.",
    capacidades: [
      "Progresso atual comparado ao progresso esperado de cada obra",
      "Situação: planejada, em andamento, atrasada, concluída ou paralisada",
      "Valor de contrato e localização por bairro, com mapa",
      "Relatório da secretaria em PDF",
    ],
    automacao:
      "Sinaliza obra sem atualização há 14 dias como atenção, e há 30 dias como urgente.",
    ia: "Aponta o ponto mais importante agora e sugere uma ação concreta — ou diz que não há dado suficiente, em vez de forçar um insight genérico.",
    noPortal: true,
  },
  {
    chave: "licitacoes",
    resumo: "Os processos e os prazos que ninguém pode perder.",
    capacidades: [
      "Conferência de quais processos constam no Portal Nacional de Contratações Públicas",
      "Soma das dispensas de mesmo objeto no exercício, contra o limite anual",
      "Número, objeto, modalidade, valor estimado e fornecedor de cada processo",
      "Prazo final acompanhado processo a processo",
      "Observação de risco registrada junto ao processo",
      "Relatório da secretaria em PDF",
    ],
    automacao:
      "Consulta o PNCP e aponta o processo que não foi divulgado lá — divulgação é condição de eficácia do contrato. Agrupa dispensas de objeto semelhante e avisa quando a soma do exercício se aproxima do limite, antes do próximo empenho. Avisa 7 e 3 dias antes do prazo final.",
    ia: "Aponta o ponto mais importante agora e sugere uma ação concreta — ou diz que não há dado suficiente, em vez de forçar um insight genérico.",
    noPortal: true,
  },
];

export function detalheDoModulo(chave: PlanoAddon): ModuloDetalhe | undefined {
  return MODULOS_DETALHE.find((m) => m.chave === chave);
}

/**
 * Módulos na ordem em que a home apresenta: primeiro o que o cidadão vê,
 * depois o gabinete, depois as secretarias. É a ordem em que uma prefeitura
 * costuma contratar, e não a ordem alfabética.
 */
export const ORDEM_HOME: PlanoAddon[] = [
  "essencial",
  "gestao",
  "saude",
  "educacao",
  "obras",
  "licitacoes",
];

export function modulosNaOrdemDaHome(): { chave: PlanoAddon; nome: string; detalhe: ModuloDetalhe }[] {
  return ORDEM_HOME.flatMap((chave) => {
    const plano = PLANOS_ADDON.find((p) => p.chave === chave);
    const detalhe = detalheDoModulo(chave);
    return plano && detalhe ? [{ chave, nome: plano.nome, detalhe }] : [];
  });
}
