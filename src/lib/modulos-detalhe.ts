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
    resumo: "O portal do município: a prefeitura publica de um lado, o cidadão lê e se manifesta do outro.",
    capacidades: [
      "Protocolo com número e chave privada de consulta emitidos na hora",
      "Ouvidoria que aceita manifestação sem identificação, com protocolo aleatório",
      "Portal com endereço público próprio do município, que abre sem cadastro",
      "Reclamação, denúncia, sugestão, elogio e pedido de informação no mesmo canal",
      "Contagem do prazo legal de resposta, com aviso antes de vencer",
      "Publicação de comunicados, Carta de Serviços, secretarias e perguntas frequentes no portal",
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
      "Calendário das obrigações fiscais do ano — RREO, gestão fiscal, SIOPS e SIOPE",
      "Mapa único da cidade com obras, escolas e unidades de saúde, e a obra atrasada em destaque",
      "Modo apresentação em tela cheia para o gabinete ou a sessão da câmara",
      "Receita, despesa, investimento e saldo consolidados do município",
      "Alertas de todas as secretarias reunidos numa lista única",
      "Relatório executivo em PDF, sem limite de geração",
      "Administração de usuários: cada secretário só enxerga a própria área",
    ],
    automacao:
      "Calcula quanto falta aplicar para fechar o ano dentro dos mínimos constitucionais, e quantas vezes o ritmo mensal precisa subir para chegar lá. Consulta o Tesouro para saber se o relatório bimestral foi mesmo entregue, e o alerta some sozinho quando aparece lá. Aponta saldo negativo assim que surge.",
    ia: "Sugere alertas a partir dos dados já cadastrados — sempre para aprovação humana, nunca publicados sozinhos.",
    noPortal: false,
  },
  {
    chave: "saude",
    resumo: "A rede inteira vinda do CNES, e o que está acontecendo dentro de cada unidade.",
    capacidades: [
      "Toda a rede importada do CNES — UBS, postos, hospitais, UPA, CAPS — com endereço, turno, SUS e mapa, sem digitar",
      "Ficha por unidade: cadastro, data da última atualização no CNES e linha do tempo do que acontece lá",
      "Ocorrências pelo celular em segundos: sem médico, faltou insulina, geladeira de vacina quebrou, fila",
      "Situação de cada unidade — normal, atenção, urgente — pelo que está aberto nela",
      "Estoque por unidade em dias de cobertura: a gerência lança saldo e consumo, e o pedido de reposição sai sozinho antes de faltar",
      "Acesso próprio para a gerência do hospital e da UBS — o dado nasce onde acontece",
      "Leitura automática por unidade: cruza CNES, ocorrências, estoque e ouvidoria e diz o que fazer primeiro — e qual unidade precisa de você hoje",
      "Qualidade da APS: os 15 indicadores do cofinanciamento federal por quadrimestre, com meta pactuada, tendência e aviso do prazo de envio ao SIAPS",
      "Tempo médio de atendimento, médicos ativos, faltas e estoque de medicamentos da rede",
      "Relatório da secretaria em PDF",
    ],
    automacao:
      "Mantém a rede igual ao CNES e avisa unidade com cadastro parado há mais de 180 dias (trava repasse) ou que sumiu de lá. Marca urgente a unidade com ocorrência urgente aberta há dois dias. Monta o pedido de reposição com tudo abaixo de 15 dias de cobertura, em CSV para a farmácia central. Avisa indicador sem atualização há 30 dias.",
    ia: "Aponta o ponto mais importante agora e sugere uma ação concreta — ou diz que não há dado suficiente, em vez de forçar um insight genérico.",
    noPortal: false,
  },
  {
    chave: "educacao",
    resumo:
      "A rede vinda do Censo Escolar, e o que cada escola vive por dentro — da merenda ao aluno que sumiu.",
    capacidades: [
      "Rede inteira importada do Catálogo de Escolas do INEP, com código INEP, etapas ofertadas e matrícula declarada",
      "Ficha por escola com leitura automática, e acesso próprio para a direção registrar o que acontece",
      "Matrícula declarada ao Censo contra a de hoje, convertida em reais de FUNDEB",
      "Contador dos 200 dias letivos da LDB, somado do que custou aula",
      "Estoque da merenda em dias de aula, com pedido de reposição em CSV",
      "Os 30% de compra da agricultura familiar no PNAE, acompanhados durante o ano",
      "Busca ativa com as etapas datadas e o ofício ao Conselho Tutelar saindo pronto",
      "IDEB, distorção idade-série, aprovação e abandono por escola, com meta e série",
      "Escolas, mapa da rede e relatório da secretaria em PDF",
    ],
    automacao:
      "Soma sozinho os dias de aula perdidos contra os 200 da LDB (art. 24) e avisa quanta folga sobra. Converte a diferença de matrícula em reais pelo valor aluno/ano informado. Acompanha os 30% da agricultura familiar (Lei 11.947/2009, art. 14) com projeção de onde o ano fecha. Marca quem está há mais de 15 dias fora da sala sem comunicação ao Conselho Tutelar (ECA, art. 56, II) e monta o ofício com o que a escola já tentou.",
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
