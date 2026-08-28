/**
 * Cruza INVESTIMENTO (dinheiro) com RESULTADO (indicador) por secretaria,
 * para o plano Gestão responder: "onde estou gastando e não está dando certo?".
 *
 * Regras de honestidade que valem para todo este arquivo:
 * - Nenhum "score de eficiência" inventado. Só comparações diretas entre
 *   números que a prefeitura realmente cadastrou.
 * - Sem dado suficiente => "sem_dados". Nunca chuta tendência com 1 registro.
 * - "Piorou" é sempre relativo ao registro anterior do próprio município,
 *   nunca a uma média nacional que não temos.
 */

export type SituacaoEficacia = "critico" | "atencao" | "ok" | "sem_dados";

export type SinalEficacia = {
  texto: string;
  /** Dinheiro diretamente associado ao problema, quando dá pra atribuir. */
  valorEmRisco?: number;
};

export type EficaciaSecretaria = {
  secretaria: "saude" | "educacao" | "obras" | "licitacoes";
  nome: string;
  /** Total investido: lançamentos manuais + contratos da própria área. */
  investimento: number;
  /** De onde veio o número (transparência sobre a origem). */
  origemInvestimento: string[];
  situacao: SituacaoEficacia;
  sinais: SinalEficacia[];
  /** Resumo do resultado medido, em linguagem direta. */
  resultado: string;
};

export const NOME_SECRETARIA: Record<EficaciaSecretaria["secretaria"], string> = {
  saude: "Saúde",
  educacao: "Educação",
  obras: "Obras",
  licitacoes: "Licitações",
};

const TOLERANCIA_ATRASO_PP = 10; // pontos percentuais

function somar(valores: (number | null | undefined)[]): number {
  return valores.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

/** Variação entre dois registros. null se não der pra comparar. */
function variacao(atual: number | null, anterior: number | null): number | null {
  if (atual === null || anterior === null) return null;
  return atual - anterior;
}

// ── OBRAS ──
export function eficaciaObras(
  obras: { nome: string; status: string; progressoAtual: number; progressoEsperado: number; valorContrato: number | null }[],
  investimentoManual: number
): EficaciaSecretaria {
  const emAndamento = obras.filter((o) => o.status !== "concluida");
  const atrasadas = emAndamento.filter(
    (o) => o.progressoAtual < o.progressoEsperado - TOLERANCIA_ATRASO_PP
  );

  const investimentoContratos = somar(obras.map((o) => o.valorContrato));
  const investimento = investimentoContratos + investimentoManual;

  const origemInvestimento: string[] = [];
  if (investimentoContratos > 0) origemInvestimento.push("valor dos contratos cadastrados");
  if (investimentoManual > 0) origemInvestimento.push("lançamentos manuais");

  const sinais: SinalEficacia[] = [];
  if (atrasadas.length > 0) {
    sinais.push({
      texto: `${atrasadas.length} de ${emAndamento.length} obra(s) em andamento estão com progresso abaixo do esperado: ${atrasadas.map((o) => o.nome).join(", ")}.`,
      valorEmRisco: somar(atrasadas.map((o) => o.valorContrato)),
    });
  }
  const paralisadas = obras.filter((o) => o.status === "paralisada");
  if (paralisadas.length > 0) {
    sinais.push({
      texto: `${paralisadas.length} obra(s) paralisada(s): ${paralisadas.map((o) => o.nome).join(", ")}.`,
      valorEmRisco: somar(paralisadas.map((o) => o.valorContrato)),
    });
  }

  let situacao: SituacaoEficacia = "ok";
  if (obras.length === 0) situacao = "sem_dados";
  else if (paralisadas.length > 0 || atrasadas.length > emAndamento.length / 2) situacao = "critico";
  else if (atrasadas.length > 0) situacao = "atencao";

  const concluidas = obras.filter((o) => o.status === "concluida").length;
  const resultado =
    obras.length === 0
      ? "Nenhuma obra cadastrada ainda."
      : `${concluidas} de ${obras.length} obra(s) concluída(s); ${atrasadas.length} atrasada(s).`;

  return {
    secretaria: "obras",
    nome: NOME_SECRETARIA.obras,
    investimento,
    origemInvestimento,
    situacao,
    sinais,
    resultado,
  };
}

// ── LICITAÇÕES ──
export function eficaciaLicitacoes(
  licitacoes: { numero: string; status: string; valorEstimado: number | null; observacaoRisco: string | null }[],
  investimentoManual: number
): EficaciaSecretaria {
  const homologadas = licitacoes.filter((l) => l.status === "homologada");
  const canceladas = licitacoes.filter((l) => l.status === "cancelada");
  const comRisco = licitacoes.filter((l) => l.observacaoRisco);

  const investimentoHomologado = somar(homologadas.map((l) => l.valorEstimado));
  const investimento = investimentoHomologado + investimentoManual;

  const origemInvestimento: string[] = [];
  if (investimentoHomologado > 0)
    origemInvestimento.push("valor estimado dos processos homologados");
  if (investimentoManual > 0) origemInvestimento.push("lançamentos manuais");

  const sinais: SinalEficacia[] = [];
  if (comRisco.length > 0) {
    sinais.push({
      texto: `${comRisco.length} processo(s) com risco registrado: ${comRisco.map((l) => l.numero).join(", ")}.`,
      valorEmRisco: somar(comRisco.map((l) => l.valorEstimado)),
    });
  }
  if (canceladas.length > 0) {
    sinais.push({
      texto: `${canceladas.length} processo(s) cancelado(s) — recurso planejado que não virou entrega.`,
      valorEmRisco: somar(canceladas.map((l) => l.valorEstimado)),
    });
  }

  let situacao: SituacaoEficacia = "ok";
  if (licitacoes.length === 0) situacao = "sem_dados";
  else if (comRisco.length > 0) situacao = "critico";
  else if (canceladas.length > 0) situacao = "atencao";

  const resultado =
    licitacoes.length === 0
      ? "Nenhum processo cadastrado ainda."
      : `${homologadas.length} de ${licitacoes.length} processo(s) homologado(s); ${canceladas.length} cancelado(s).`;

  return {
    secretaria: "licitacoes",
    nome: NOME_SECRETARIA.licitacoes,
    investimento,
    origemInvestimento,
    situacao,
    sinais,
    resultado,
  };
}

// ── SAÚDE ──
// Sem "meta" cadastrada, o único julgamento honesto é a TENDÊNCIA: comparar
// o registro mais recente com o anterior do próprio município.
export function eficaciaSaude(
  historico: {
    tempoMedioAtendimentoMin: number | null;
    faltasPercentual: number | null;
    estoqueMedicamentosPercentual: number | null;
  }[],
  investimentoManual: number
): EficaciaSecretaria {
  const origemInvestimento = investimentoManual > 0 ? ["lançamentos manuais"] : [];

  if (historico.length < 2) {
    return {
      secretaria: "saude",
      nome: NOME_SECRETARIA.saude,
      investimento: investimentoManual,
      origemInvestimento,
      situacao: "sem_dados",
      sinais: [],
      resultado:
        historico.length === 0
          ? "Nenhum indicador registrado ainda."
          : "Só 1 registro — é preciso pelo menos 2 para comparar evolução.",
    };
  }

  const atual = historico[historico.length - 1];
  const anterior = historico[historico.length - 2];
  const sinais: SinalEficacia[] = [];

  const dFaltas = variacao(atual.faltasPercentual, anterior.faltasPercentual);
  if (dFaltas !== null && dFaltas > 0) {
    sinais.push({
      texto: `Faltas subiram de ${anterior.faltasPercentual}% para ${atual.faltasPercentual}%.`,
    });
  }
  const dTempo = variacao(atual.tempoMedioAtendimentoMin, anterior.tempoMedioAtendimentoMin);
  if (dTempo !== null && dTempo > 0) {
    sinais.push({
      texto: `Tempo médio de atendimento subiu de ${anterior.tempoMedioAtendimentoMin} para ${atual.tempoMedioAtendimentoMin} min.`,
    });
  }
  const dEstoque = variacao(
    atual.estoqueMedicamentosPercentual,
    anterior.estoqueMedicamentosPercentual
  );
  if (dEstoque !== null && dEstoque < 0) {
    sinais.push({
      texto: `Estoque de medicamentos caiu de ${anterior.estoqueMedicamentosPercentual}% para ${atual.estoqueMedicamentosPercentual}%.`,
    });
  }

  const situacao: SituacaoEficacia =
    sinais.length >= 2 ? "critico" : sinais.length === 1 ? "atencao" : "ok";

  return {
    secretaria: "saude",
    nome: NOME_SECRETARIA.saude,
    investimento: investimentoManual,
    origemInvestimento,
    situacao,
    sinais,
    resultado:
      sinais.length === 0
        ? "Indicadores estáveis ou melhorando em relação ao registro anterior."
        : `${sinais.length} indicador(es) pioraram desde o registro anterior.`,
  };
}

// ── EDUCAÇÃO ──
export function eficaciaEducacao(
  historico: { frequenciaPercentual: number | null; notaMedia: number | null }[],
  escolas: { nome: string; evasaoPercentual: number | null }[],
  investimentoManual: number
): EficaciaSecretaria {
  const origemInvestimento = investimentoManual > 0 ? ["lançamentos manuais"] : [];
  const sinais: SinalEficacia[] = [];

  const evasaoAlta = escolas.filter((e) => (e.evasaoPercentual ?? 0) > 10);
  if (evasaoAlta.length > 0) {
    sinais.push({
      texto: `${evasaoAlta.length} escola(s) com evasão acima de 10%: ${evasaoAlta.map((e) => `${e.nome} (${e.evasaoPercentual}%)`).join(", ")}.`,
    });
  }

  if (historico.length < 2) {
    return {
      secretaria: "educacao",
      nome: NOME_SECRETARIA.educacao,
      investimento: investimentoManual,
      origemInvestimento,
      situacao: evasaoAlta.length > 0 ? "atencao" : "sem_dados",
      sinais,
      resultado:
        historico.length === 0
          ? "Nenhum indicador registrado ainda."
          : "Só 1 registro — é preciso pelo menos 2 para comparar evolução.",
    };
  }

  const atual = historico[historico.length - 1];
  const anterior = historico[historico.length - 2];

  const dFreq = variacao(atual.frequenciaPercentual, anterior.frequenciaPercentual);
  if (dFreq !== null && dFreq < 0) {
    sinais.push({
      texto: `Frequência caiu de ${anterior.frequenciaPercentual}% para ${atual.frequenciaPercentual}%.`,
    });
  }
  const dNota = variacao(atual.notaMedia, anterior.notaMedia);
  if (dNota !== null && dNota < 0) {
    sinais.push({
      texto: `Nota média caiu de ${anterior.notaMedia} para ${atual.notaMedia}.`,
    });
  }

  const situacao: SituacaoEficacia =
    sinais.length >= 2 ? "critico" : sinais.length === 1 ? "atencao" : "ok";

  return {
    secretaria: "educacao",
    nome: NOME_SECRETARIA.educacao,
    investimento: investimentoManual,
    origemInvestimento,
    situacao,
    sinais,
    resultado:
      sinais.length === 0
        ? "Indicadores estáveis ou melhorando em relação ao registro anterior."
        : `${sinais.length} ponto(s) de atenção identificado(s).`,
  };
}

/** Ordena pior primeiro — é o que o gestor precisa ver no topo. */
export function ordenarPorGravidade(lista: EficaciaSecretaria[]): EficaciaSecretaria[] {
  const peso: Record<SituacaoEficacia, number> = {
    critico: 0,
    atencao: 1,
    ok: 2,
    sem_dados: 3,
  };
  return [...lista].sort((a, b) => {
    const d = peso[a.situacao] - peso[b.situacao];
    if (d !== 0) return d;
    // Empate: quem tem mais dinheiro envolvido aparece primeiro.
    return b.investimento - a.investimento;
  });
}

export function totalEmRisco(lista: EficaciaSecretaria[]): number {
  return lista.reduce(
    (acc, s) => acc + s.sinais.reduce((a, sinal) => a + (sinal.valorEmRisco ?? 0), 0),
    0
  );
}
