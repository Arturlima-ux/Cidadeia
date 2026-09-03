// ── IMPORTAÇÃO DO RGF: DESPESA COM PESSOAL ──
//
// O Relatório de Gestão Fiscal que a prefeitura já é obrigada a enviar ao
// Tesouro traz, no Anexo 01, exatamente os dois números que a tela de pessoal
// pedia à mão — e traz também os três limites já calculados, o que permite
// conferir nossa própria régua contra a fonte oficial.
//
// Registro de erro meu, porque estava escrito no código o contrário: eu havia
// concluído que este endpoint voltava zerado para todos os municípios e
// removido o caminho. Estava errado. O RGF responde normalmente; o que volta
// vazio são os Anexos 08 e 12 do RREO (MDE e ASPS) — daí a confusão. Os
// mínimos continuam sem fonte automática; a despesa com pessoal não.
//
// ── A RCL não é a RCL ──
//
// O limite da LRF não incide sobre a Receita Corrente Líquida, e sim sobre a
// RCL AJUSTADA: o art. 20, § 6º manda deduzir as transferências obrigatórias
// da União relativas a emendas parlamentares e à remuneração dos agentes
// comunitários de saúde. Em Teresina/2024 a diferença é de R$ 110 milhões, o
// que move o percentual de 44,22% para 45,36%.
//
// Errar isso erra para MENOS — diz ao prefeito que ele tem folga que não tem,
// que é a direção em que o teto estoura. Por isso o campo que a tela guarda é
// a ajustada, e é ela que a importação grava.

const URL_RGF = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf";
const TIMEOUT_MS = 25000;

/** A coluna em reais. O anexo repete cada conta em "Valor" e em "%". */
const COLUNA_VALOR = "Valor";

const CONTAS = {
  despesaTotal: "DespesaComPessoalTotal",
  rcl: "ReceitaCorrenteLiquidaLimiteLegal",
  rclAjustada: "ReceitaCorrenteLiquidaAjustada",
  limiteMaximo: "LimiteMaximoDespesaComPessoalTotal",
  limitePrudencial: "LimitePrudencialDespesaComPessoalTotal",
  limiteAlerta: "LimiteDeAlertaDespesaComPessoalTotal",
} as const;

type LinhaRgf = {
  cod_conta?: string;
  coluna?: string;
  valor?: number;
  instituicao?: string;
};

export type Periodicidade = "Q" | "S";

/**
 * Mês em que se encerra a janela de doze meses de cada período.
 *
 * O RGF quadrimestral fecha em abril, agosto e dezembro; o semestral, em junho
 * e dezembro. É o que converte o "período 2" da API no mesReferencia que a
 * tela e o cálculo de recondução usam.
 */
export function mesDeReferencia(periodicidade: Periodicidade, periodo: number): number {
  return periodicidade === "S" ? periodo * 6 : periodo * 4;
}

export type PeriodoRgf = {
  exercicio: number;
  periodicidade: Periodicidade;
  periodo: number;
  mesReferencia: number;
};

export type ImportacaoRgf = {
  periodo: PeriodoRgf;
  instituicao: string | null;
  /** RCL ajustada — o denominador dos limites. É esta que a tela guarda. */
  rclAjustada: number;
  /** RCL sem os ajustes do art. 20, § 6º. Só para exibição comparativa. */
  rcl: number;
  despesaTotal: number;
  /**
   * Limites em reais, como o próprio Tesouro calcula.
   *
   * Servem de conferência: se o percentual que o limite máximo representa da
   * RCL ajustada não for 54%, alguma premissa nossa mudou — repartição do art.
   * 20 alterada por lei, ou município de esfera diferente — e é melhor a
   * importação recusar do que gravar sobre uma régua errada.
   */
  limiteMaximo: number;
};

export type ResultadoRgf =
  | { ok: true; dados: ImportacaoRgf }
  | { ok: false; erro: string };

/**
 * Extrai os valores do corpo devolvido pela API.
 *
 * Separada da rede para poder ser testada com resposta real gravada — testar
 * contra a internet tornaria a suíte dependente de um serviço público sair do
 * ar, e é justamente aqui que a análise precisa continuar verificável.
 */
export function extrairRgf(
  itens: LinhaRgf[],
  periodo: PeriodoRgf
): ResultadoRgf {
  if (itens.length === 0) {
    return { ok: false, erro: "O Tesouro ainda não tem o RGF deste período publicado." };
  }

  const valor = (codConta: string): number | null => {
    const linha = itens.find((i) => i.cod_conta === codConta && i.coluna === COLUNA_VALOR);
    const v = linha?.valor;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const rclAjustada = valor(CONTAS.rclAjustada) ?? valor(CONTAS.rcl);
  const rcl = valor(CONTAS.rcl) ?? rclAjustada;
  const despesaTotal = valor(CONTAS.despesaTotal);
  const limiteMaximo = valor(CONTAS.limiteMaximo);

  if (rclAjustada === null || rclAjustada <= 0 || despesaTotal === null) {
    // Estrutura conhecida mas sem os números: acontece com demonstrativo
    // enviado em branco. Gravar zero faria a tela declarar 0% de despesa com
    // pessoal, que é o veredito mais falsamente tranquilizador possível.
    return {
      ok: false,
      erro: "O RGF deste período foi publicado sem os valores de despesa com pessoal.",
    };
  }

  return {
    ok: true,
    dados: {
      periodo,
      instituicao: itens.find((i) => i.instituicao)?.instituicao ?? null,
      rclAjustada,
      rcl: rcl ?? rclAjustada,
      despesaTotal,
      limiteMaximo: limiteMaximo ?? 0,
    },
  };
}

async function buscarPeriodo(
  codigoIbge: string,
  periodo: PeriodoRgf
): Promise<LinhaRgf[]> {
  const query = new URLSearchParams({
    an_exercicio: String(periodo.exercicio),
    in_periodicidade: periodo.periodicidade,
    nr_periodo: String(periodo.periodo),
    co_tipo_demonstrativo: "RGF",
    no_anexo: "RGF-Anexo 01",
    // Poder Executivo: é da prefeitura que este sistema trata. A câmara tem
    // limite próprio (6%) e presta contas por conta dela.
    co_poder: "E",
    co_esfera: "M",
    id_ente: codigoIbge,
  });

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TIMEOUT_MS);
  try {
    const resposta = await fetch(`${URL_RGF}?${query}`, { signal: controle.signal });
    if (!resposta.ok) return [];
    const corpo = (await resposta.json()) as { items?: LinhaRgf[] };
    return corpo.items ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Períodos a tentar, do mais recente para o mais antigo.
 *
 * O gestor não sabe (nem deveria precisar saber) qual foi o último período que
 * o Tesouro processou — costuma haver semanas entre o envio e a publicação.
 * Então a importação anda para trás até achar algo, em vez de devolver "não
 * encontrado" para um período que ainda nem venceu.
 *
 * Tenta as duas periodicidades em cada exercício: um município abaixo de 50
 * mil habitantes pode publicar semestralmente, e nada garante que a opção
 * registrada no nosso cadastro seja a que ele de fato usou.
 */
export function periodosParaTentar(exercicioAtual: number): PeriodoRgf[] {
  const lista: PeriodoRgf[] = [];
  for (const exercicio of [exercicioAtual, exercicioAtual - 1]) {
    for (const periodicidade of ["Q", "S"] as Periodicidade[]) {
      const maximo = periodicidade === "S" ? 2 : 3;
      for (let periodo = maximo; periodo >= 1; periodo--) {
        lista.push({
          exercicio,
          periodicidade,
          periodo,
          mesReferencia: mesDeReferencia(periodicidade, periodo),
        });
      }
    }
  }
  // Ordena por data de fechamento, do mais recente para o mais antigo, para
  // que a busca não devolva um quadrimestre velho só por vir antes na lista.
  return lista.sort(
    (a, b) => b.exercicio - a.exercicio || b.mesReferencia - a.mesReferencia
  );
}

/**
 * Busca o RGF mais recente publicado para o município.
 *
 * Percorre no máximo `tentativas` períodos: a API do Tesouro responde com
 * folga a poucas chamadas, mas varrer dois exercícios inteiros a cada clique
 * transformaria um botão em dez requisições.
 */
export async function buscarRgfMaisRecente(
  codigoIbge: string,
  exercicioAtual: number,
  tentativas = 5
): Promise<ResultadoRgf> {
  const candidatos = periodosParaTentar(exercicioAtual).slice(0, tentativas);

  for (const periodo of candidatos) {
    const itens = await buscarPeriodo(codigoIbge, periodo);
    if (itens.length === 0) continue;

    const resultado = extrairRgf(itens, periodo);
    // Período publicado em branco não encerra a busca: o anterior pode estar
    // completo, e é melhor um número de quatro meses atrás que nenhum.
    if (resultado.ok) return resultado;
  }

  return {
    ok: false,
    erro:
      "Nenhum RGF encontrado no Tesouro para este município nos últimos períodos. " +
      "Pode ser que ainda não tenha sido publicado — informe os valores à mão abaixo.",
  };
}
