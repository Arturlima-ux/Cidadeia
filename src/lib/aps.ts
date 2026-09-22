// ── O COMPONENTE DE QUALIDADE DA APS ──
//
// Desde a Portaria GM/MS 3.493/2024, o repasse federal da Atenção Primária
// tem três componentes: fixo (por equipe, pelo IED), vínculo e
// acompanhamento territorial, e QUALIDADE — este, pago conforme o
// resultado da equipe nos indicadores pactuados, apurado por quadrimestre.
// A partir de maio de 2025 o pagamento já segue o desempenho real.
//
// São 15 indicadores em três blocos: 7 para equipes de Saúde da Família e
// de Atenção Primária, 6 para Saúde Bucal e 2 para eMulti.
//
// ── DE ONDE VEM O NÚMERO ──
// Do SIAPS (Portaria GM/MS 7.639/2025), que substituiu o SISAB como
// sistema oficial para fins de financiamento. NÃO há API pública desses
// indicadores — o Ministério publica painel e arquivo; a prefeitura baixa.
// Por isso aqui o resultado é informado por quem tem o relatório, e o
// sistema faz o que o painel do Ministério não faz: guarda a série,
// compara com a meta pactuada, aponta a tendência e diz o que olhar.
//
// ── POR QUE NÃO HÁ META FIXA NO CÓDIGO ──
// As metas saem das fichas técnicas do Ministério e podem mudar a cada
// ciclo. Inventar um número aqui seria vender certeza que não temos: a
// meta é informada pelo gestor, e a tela diz de onde ela deve sair.

export type BlocoAps = "esf_eap" | "esb" | "emulti";

export const NOME_BLOCO: Record<BlocoAps, string> = {
  esf_eap: "Saúde da Família e Atenção Primária (eSF/eAP)",
  esb: "Saúde Bucal (eSB)",
  emulti: "Equipe Multiprofissional (eMulti)",
};

export type IndicadorAps = {
  chave: string;
  nome: string;
  bloco: BlocoAps;
  /** O que o indicador mede, em uma frase de gestor. */
  sobre: string;
  /** Direção boa: percentual maior é melhor, ou menor é melhor. */
  sentido: "maior_melhor" | "menor_melhor";
};

// Nomes conforme a lista oficial do componente de qualidade (SAPS/MS,
// maio de 2025). Mantidos como o Ministério escreve, para o gestor
// reconhecer na hora.
export const INDICADORES_APS: IndicadorAps[] = [
  { chave: "acesso", nome: "Mais Acesso à Atenção Primária à Saúde", bloco: "esf_eap", sobre: "Quanto a equipe atende da população que acompanha.", sentido: "maior_melhor" },
  { chave: "infantil", nome: "Cuidado no Desenvolvimento Infantil", bloco: "esf_eap", sobre: "Acompanhamento das crianças do território.", sentido: "maior_melhor" },
  { chave: "gestante", nome: "Cuidado da Gestante e da Puérpera", bloco: "esf_eap", sobre: "Pré-natal e consulta após o parto.", sentido: "maior_melhor" },
  { chave: "diabetes", nome: "Cuidado da pessoa com Diabetes Mellitus", bloco: "esf_eap", sobre: "Acompanhamento de quem tem diabetes.", sentido: "maior_melhor" },
  { chave: "hipertensao", nome: "Cuidado da pessoa com Hipertensão Arterial", bloco: "esf_eap", sobre: "Acompanhamento de quem tem pressão alta.", sentido: "maior_melhor" },
  { chave: "idosa", nome: "Cuidado da Pessoa Idosa", bloco: "esf_eap", sobre: "Acompanhamento das pessoas idosas do território.", sentido: "maior_melhor" },
  { chave: "cancer_mulher", nome: "Cuidado da Mulher na Prevenção do Câncer", bloco: "esf_eap", sobre: "Exames de prevenção em dia.", sentido: "maior_melhor" },
  { chave: "consulta_odonto", nome: "Consulta Odontológica programada na APS", bloco: "esb", sobre: "Primeira consulta odontológica programada.", sentido: "maior_melhor" },
  { chave: "tratamento_concluido", nome: "Tratamento odontológico concluído", bloco: "esb", sobre: "Tratamentos levados até o fim.", sentido: "maior_melhor" },
  { chave: "exodontia", nome: "Taxa de exodontias na APS", bloco: "esb", sobre: "Extrações em relação aos procedimentos — quanto menor, melhor.", sentido: "menor_melhor" },
  { chave: "escovacao", nome: "Escovação Supervisionada na APS", bloco: "esb", sobre: "Escovação supervisionada, sobretudo na escola.", sentido: "maior_melhor" },
  { chave: "preventivos_odonto", nome: "Procedimentos Odontológicos preventivos na APS", bloco: "esb", sobre: "Prevenção em vez de só tratar.", sentido: "maior_melhor" },
  { chave: "art", nome: "Tratamento Restaurador Atraumático na APS", bloco: "esb", sobre: "Restauração sem anestesia nem broca, muito usada em criança.", sentido: "maior_melhor" },
  { chave: "emulti_media", nome: "Média de atendimentos da eMulti por pessoa", bloco: "emulti", sobre: "Quantas vezes cada pessoa é atendida pela equipe multi.", sentido: "maior_melhor" },
  { chave: "emulti_interprofissional", nome: "Ações interprofissionais da eMulti na APS", bloco: "emulti", sobre: "Atendimentos feitos em conjunto por profissões diferentes.", sentido: "maior_melhor" },
];

export function indicadorAps(chave: string): IndicadorAps | undefined {
  return INDICADORES_APS.find((i) => i.chave === chave);
}

// ── QUADRIMESTRE ──
// A apuração do componente de qualidade é quadrimestral. Um envio mensal
// ao SIAPS alimenta o cálculo: até o 10º dia útil do mês seguinte.

export type Quadrimestre = { ano: number; numero: 1 | 2 | 3 };

export function quadrimestreDe(data: Date): Quadrimestre {
  const m = data.getUTCMonth() + 1;
  return { ano: data.getUTCFullYear(), numero: (m <= 4 ? 1 : m <= 8 ? 2 : 3) as 1 | 2 | 3 };
}

export function rotuloQuadrimestre(q: Quadrimestre): string {
  return `${q.numero}º quadrimestre de ${q.ano}`;
}

/** Quadrimestres para escolher na tela: o atual e os quatro anteriores. */
export function quadrimestresRecentes(hoje: Date = new Date()): Quadrimestre[] {
  const atual = quadrimestreDe(hoje);
  const lista: Quadrimestre[] = [];
  let { ano, numero } = atual;
  for (let i = 0; i < 5; i++) {
    lista.push({ ano, numero: numero as 1 | 2 | 3 });
    numero = numero === 1 ? 3 : ((numero - 1) as 1 | 2 | 3);
    if (numero === 3) ano -= 1;
  }
  return lista;
}

/** Dia limite do envio mensal ao SIAPS: 10º dia útil do mês seguinte. */
export function prazoEnvioSiaps(mesReferencia: Date, feriados: string[] = []): Date {
  const ano = mesReferencia.getUTCFullYear();
  const mes = mesReferencia.getUTCMonth() + 1;
  const d = new Date(Date.UTC(mes === 12 ? ano + 1 : ano, mes === 12 ? 0 : mes, 1));
  let uteis = 0;
  while (uteis < 10) {
    const diaSemana = d.getUTCDay();
    const iso = d.toISOString().slice(0, 10);
    if (diaSemana !== 0 && diaSemana !== 6 && !feriados.includes(iso)) uteis++;
    if (uteis < 10) d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

// ── DESEMPENHO ──

export type SituacaoIndicador = "sem_meta" | "atingido" | "perto" | "abaixo";

export const ROTULO_SITUACAO_APS: Record<SituacaoIndicador, string> = {
  sem_meta: "Sem meta informada",
  atingido: "Meta atingida",
  perto: "Perto da meta",
  abaixo: "Abaixo da meta",
};

/** "Perto" é faltar no máximo 10% do caminho até a meta. */
export function situacaoIndicador(resultado: number, meta: number | null, sentido: IndicadorAps["sentido"]): SituacaoIndicador {
  if (meta === null || !Number.isFinite(meta)) return "sem_meta";
  const atingiu = sentido === "maior_melhor" ? resultado >= meta : resultado <= meta;
  if (atingiu) return "atingido";
  const distancia = Math.abs(meta - resultado);
  return distancia <= Math.abs(meta) * 0.1 ? "perto" : "abaixo";
}

/** Distância até a meta, em pontos percentuais (positivo = falta). */
export function distanciaDaMeta(resultado: number, meta: number | null, sentido: IndicadorAps["sentido"]): number | null {
  if (meta === null) return null;
  const d = sentido === "maior_melhor" ? meta - resultado : resultado - meta;
  return Math.round(d * 10) / 10;
}

export type Tendencia = "subiu" | "caiu" | "estavel" | "sem_serie";

/** Comparação com o quadrimestre anterior; 1 ponto de variação já conta. */
export function tendencia(atual: number, anterior: number | null, sentido: IndicadorAps["sentido"]): Tendencia {
  if (anterior === null) return "sem_serie";
  const delta = atual - anterior;
  if (Math.abs(delta) < 1) return "estavel";
  const melhorou = sentido === "maior_melhor" ? delta > 0 : delta < 0;
  return melhorou ? "subiu" : "caiu";
}

export type ResultadoApsEntrada = {
  indicador: string;
  equipe: string | null;
  resultado: number;
  meta: number | null;
  ano: number;
  quadrimestre: number;
};

export type LinhaDesempenho = {
  indicador: IndicadorAps;
  equipe: string | null;
  resultado: number;
  meta: number | null;
  situacao: SituacaoIndicador;
  distancia: number | null;
  tendencia: Tendencia;
  anterior: number | null;
};

/**
 * Monta o desempenho de um quadrimestre, comparando com o anterior.
 * Ordena pelo que mais precisa de atenção.
 */
export function montarDesempenho(
  doQuadrimestre: ResultadoApsEntrada[],
  doAnterior: ResultadoApsEntrada[]
): LinhaDesempenho[] {
  const chaveDe = (r: ResultadoApsEntrada) => `${r.indicador}::${r.equipe ?? ""}`;
  const antes = new Map(doAnterior.map((r) => [chaveDe(r), r.resultado]));
  const ordem: Record<SituacaoIndicador, number> = { abaixo: 0, perto: 1, sem_meta: 2, atingido: 3 };
  return doQuadrimestre
    .map((r) => {
      const ind = indicadorAps(r.indicador);
      if (!ind) return null;
      const anterior = antes.get(chaveDe(r)) ?? null;
      return {
        indicador: ind,
        equipe: r.equipe,
        resultado: r.resultado,
        meta: r.meta,
        situacao: situacaoIndicador(r.resultado, r.meta, ind.sentido),
        distancia: distanciaDaMeta(r.resultado, r.meta, ind.sentido),
        tendencia: tendencia(r.resultado, anterior, ind.sentido),
        anterior,
      } satisfies LinhaDesempenho;
    })
    .filter((x): x is LinhaDesempenho => x !== null)
    .sort(
      (a, b) =>
        ordem[a.situacao] - ordem[b.situacao] ||
        (b.distancia ?? -1) - (a.distancia ?? -1) ||
        a.indicador.nome.localeCompare(b.indicador.nome, "pt-BR")
    );
}

/** Uma frase para o topo da tela, sem inventar número nenhum. */
export function resumoDesempenho(linhas: LinhaDesempenho[], q: Quadrimestre): string {
  if (linhas.length === 0) return `Nenhum resultado lançado para o ${rotuloQuadrimestre(q)}.`;
  const abaixo = linhas.filter((l) => l.situacao === "abaixo");
  const caindo = linhas.filter((l) => l.tendencia === "caiu");
  if (abaixo.length === 0 && caindo.length === 0) {
    return `${linhas.length} indicador(es) lançado(s) no ${rotuloQuadrimestre(q)}: nenhum abaixo da meta informada.`;
  }
  const partes: string[] = [];
  if (abaixo.length > 0) partes.push(`${abaixo.length} abaixo da meta (pior: ${abaixo[0]!.indicador.nome}, faltam ${abaixo[0]!.distancia} pontos)`);
  if (caindo.length > 0) partes.push(`${caindo.length} caiu(íram) em relação ao quadrimestre anterior`);
  return `${rotuloQuadrimestre(q)}: ${partes.join("; ")}.`;
}
