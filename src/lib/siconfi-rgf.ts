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

import { cacheDoPeriodo, consultarTipos, enteNoTesouro, SEM_PREFEITURA, TIPOS_RGF } from "@/lib/siconfi-tipos";
import { itensDoTesouro } from "@/lib/tesouro-http";
import { rgfsEntregues } from "@/lib/siconfi-entregas";

const URL_RGF ="https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf";

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
   * Limites em reais, como o próprio Tesouro publica no anexo.
   *
   * Servem de conferência: se o percentual que o limite máximo representa da
   * RCL ajustada não for 54%, alguma premissa nossa mudou — repartição do art.
   * 20 alterada por lei, ou município de esfera diferente — e é melhor a
   * importação recusar do que gravar sobre uma régua errada.
   *
   * E servem de ARGUMENTO: a home confronta a despesa declarada com o limite
   * declarado, os dois no mesmo documento assinado pela prefeitura. Não é a
   * nossa conta contra o número dela.
   *
   * Null, nunca zero, quando o anexo não traz a linha. Um limite de R$ 0 na
   * tela afirma que o município estourou tudo — o espelho exato do "0% de
   * despesa com pessoal" que `extrairRgf` já recusa logo abaixo.
   */
  limiteMaximo: number | null;
  limitePrudencial: number | null;
  limiteAlerta: number | null;
  /**
   * A RCL ajustada veio de reserva (a RCL do limite legal), porque o anexo não
   * trouxe a linha própria.
   *
   * Importa para o TEXTO: nesse caso o percentual sai de uma divisão nossa
   * sobre base diferente da que o Tesouro usou, e chamá-lo de "declarado pela
   * prefeitura" seria apresentar como declarado um número que ninguém
   * declarou.
   */
  rclVeioDeReserva: boolean;
};

/**
 * Por que não há número.
 *
 * Três ausências diferentes, e tratá-las igual acusa quem não tem culpa:
 *
 *   `nao_publicado`    perguntamos e o Tesouro não tem. É achado sobre a
 *                      prefeitura, e o único dos três que é;
 *   `em_branco`        o demonstrativo foi entregue sem os valores. A entrega
 *                      aconteceu; o conteúdo, não;
 *   `consulta_falhou`  não conseguimos perguntar. É problema NOSSO, e dizer
 *                      "não consta publicado" aqui seria afirmar sobre a
 *                      conduta do cliente o que não se sabe.
 *
 * A causa é um campo, e não uma frase, porque a camada de texto fazia regex
 * sobre a mensagem de erro para distinguir os casos — e a frase do em-branco
 * nunca saía de `buscarRgfMaisRecente`, então a prefeitura que entregou o
 * demonstrativo vazio era acusada de não ter entregado.
 */
export type CausaSemRgf =
  | "nao_publicado"
  | "em_branco"
  | "consulta_falhou"
  | "entregue_sem_dados"
  | "inconsistente"
  | "sem_prefeitura";

/**
 * Números que a prefeitura declarou e que não fecham entre si: despesa com
 * pessoal acima de toda a receita corrente líquida, ou praticamente zero.
 *
 * A auditoria de outubro de 2026 achou 53 assim em 5.571 municípios. O caso
 * típico: o RGF do 1º quadrimestre com a despesa de doze meses e a receita de
 * só quatro (Curralinho/PA: R$ 148,8 mi sobre R$ 32,9 mi, "451%"). Mostrar
 * esse percentual como veredito diria ao cidadão que a prefeitura gasta com
 * pessoal quatro vezes o que arrecada. O documento é dela, mas a conclusão
 * seria nossa, e errada.
 */
export type NumerosInconsistentes = { periodo: PeriodoRgf; despesa: number; rcl: number };

/** Abaixo de 5% ou acima de 100% da RCL, os números do anexo não fecham. */
export function numerosFecham(despesa: number, rcl: number): boolean {
  const pct = (despesa / rcl) * 100;
  return pct >= 5 && pct <= 100;
}

/** O que a tela precisa dizer AO LADO do número, para ele não enganar. */
export type ContextoRgf = {
  /** Período mais novo cujos números não fecham; o número exibido é anterior a ele. */
  inconsistenteMaisRecente?: NumerosInconsistentes;
  /**
   * O período seguinte ao exibido, quando o prazo de publicação dele já
   * passou. `entregue` vem do extrato: true é "entregue, mas sem números na
   * consulta aberta"; false é "não consta"; null é "o extrato não respondeu".
   */
  proximoVencido?: { periodo: PeriodoRgf; vencimento: string; entregue: boolean | null };
};

export type ResultadoRgf =
  | { ok: true; dados: ImportacaoRgf; contexto?: ContextoRgf }
  | {
      ok: false;
      erro: string;
      causa: CausaSemRgf;
      /** Quantos períodos foram procurados. É o que torna a ausência auditável. */
      periodosProcurados: number;
      /**
       * O RGF mais recente que o extrato de entregas do Tesouro registra como
       * entregue. Presente em `entregue_sem_dados`: a prefeitura entregou, e a
       * tela tem de dizer isso, nunca "não publicado".
       */
      periodoEntregue?: PeriodoRgf;
      /** Presente em `inconsistente`. */
      numerosInconsistentes?: NumerosInconsistentes;
      /** Presente em `sem_prefeitura`: por que este lugar não tem RGF próprio. */
      motivo?: string;
    };

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
    return { ok: false, erro: "O Tesouro ainda não tem o RGF deste período publicado.", causa: "nao_publicado", periodosProcurados: 1 };
  }

  const valor = (codConta: string): number | null => {
    const linha = itens.find((i) => i.cod_conta === codConta && i.coluna === COLUNA_VALOR);
    const v = linha?.valor;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const rclPublicada = valor(CONTAS.rclAjustada);
  const rclAjustada = rclPublicada ?? valor(CONTAS.rcl);
  const rcl = valor(CONTAS.rcl) ?? rclAjustada;
  const despesaTotal = valor(CONTAS.despesaTotal);
  const limiteMaximo = valor(CONTAS.limiteMaximo);
  const limitePrudencial = valor(CONTAS.limitePrudencial);
  const limiteAlerta = valor(CONTAS.limiteAlerta);

  if (rclAjustada === null || rclAjustada <= 0 || despesaTotal === null) {
    // Estrutura conhecida mas sem os números: acontece com demonstrativo
    // enviado em branco. Gravar zero faria a tela declarar 0% de despesa com
    // pessoal, que é o veredito mais falsamente tranquilizador possível.
    return {
      ok: false,
      erro: "O RGF deste período foi publicado sem os valores de despesa com pessoal.",
      causa: "em_branco",
      periodosProcurados: 1,
    };
  }

  if (!numerosFecham(despesaTotal, rclAjustada)) {
    return {
      ok: false,
      erro: "O RGF deste período traz despesa com pessoal e receita que não fecham entre si.",
      causa: "inconsistente",
      periodosProcurados: 1,
      numerosInconsistentes: { periodo, despesa: despesaTotal, rcl: rclAjustada },
    };
  }

  return {
    ok: true,
    dados: {
      periodo,
      instituicao: itens.find((i) => i.instituicao)?.instituicao ?? null,
      rclAjustada,
      rclVeioDeReserva: rclPublicada === null,
      rcl: rcl ?? rclAjustada,
      despesaTotal,
      limiteMaximo,
      limitePrudencial,
      limiteAlerta,
    },
  };
}

/**
 * Um período, nos dois tipos: o RGF comum e o RGF Simplificado, que é o que a
 * maioria dos municípios pequenos entrega (ver lib/siconfi-tipos.ts). O Anexo
 * 01 do simplificado traz as mesmas contas, então `extrairRgf` lê os dois.
 */
async function buscarPeriodo(codigoIbge: string, periodo: PeriodoRgf): Promise<LinhaRgf[] | null> {
  const anexo01 = await consultarTipos(TIPOS_RGF, (tipo) => buscarPeriodoDoTipo(codigoIbge, periodo, tipo, "RGF-Anexo 01"));
  if (anexo01 === null || anexo01.length > 0) return anexo01;
  // Parte dos municípios que entregam o simplificado só tem, na consulta
  // aberta, o Anexo 06 (o próprio demonstrativo simplificado). Os mesmos
  // números estão lá, com outros nomes de conta.
  const anexo06 = await buscarPeriodoDoTipo(codigoIbge, periodo, "RGF Simplificado", "RGF-Anexo 06");
  return anexo06 === null ? null : anexo06LidoComoAnexo01(anexo06);
}

/** Contas do Anexo 06 (simplificado) → contas do Anexo 01 que `extrairRgf` lê. */
const CONTAS_DO_ANEXO_06: Record<string, string> = {
  DespesaTotalComPessoalDemonstrativoSimplificado: CONTAS.despesaTotal,
  ReceitaCorrenteLiquidaAjustada: CONTAS.rclAjustada,
  ReceitaCorrenteLiquida: CONTAS.rcl,
  LimiteMaximoDespesaComPessoalDemonstrativoSimplificado: CONTAS.limiteMaximo,
  LimitePrudencialDespesaComPessoalDemonstrativoSimplificado: CONTAS.limitePrudencial,
  LimiteDeAlertaDespesaComPessoalDemonstrativoSimplificado: CONTAS.limiteAlerta,
};

export function anexo06LidoComoAnexo01(itens: LinhaRgf[]): LinhaRgf[] {
  const lidas: LinhaRgf[] = [];
  for (const i of itens) {
    const conta = i.cod_conta ? CONTAS_DO_ANEXO_06[i.cod_conta] : undefined;
    // A coluna em reais começa com "VALOR" ("VALOR", "VALOR ATÉ O SEMESTRE
    // DE REFERÊNCIA"); a de percentual começa com "%".
    if (!conta || !/^valor/i.test(i.coluna ?? "")) continue;
    lidas.push({ ...i, cod_conta: conta, coluna: COLUNA_VALOR });
  }
  const instituicao = itens.find((i) => i.instituicao)?.instituicao;
  if (lidas.length && instituicao) lidas.push({ instituicao });
  // Sem nenhuma conta reconhecida, devolve o que veio: `extrairRgf` vai ler
  // como demonstrativo em branco, que é o que ele é para nós.
  return lidas.length ? lidas : itens;
}

async function buscarPeriodoDoTipo(
  codigoIbge: string,
  periodo: PeriodoRgf,
  tipo: string,
  anexo: string
): Promise<LinhaRgf[] | null> {
  const query = new URLSearchParams({
    an_exercicio: String(periodo.exercicio),
    in_periodicidade: periodo.periodicidade,
    nr_periodo: String(periodo.periodo),
    co_tipo_demonstrativo: tipo,
    no_anexo: anexo,
    // Poder Executivo: é da prefeitura que este sistema trata. A câmara tem
    // limite próprio (6%) e presta contas por conta dela.
    co_poder: "E",
    co_esfera: enteNoTesouro(codigoIbge).esfera,
    id_ente: enteNoTesouro(codigoIbge).id,
  });

  // null é "não consegui perguntar"; [] é "perguntei e não tem". Confundir os
  // dois faz a tela acusar a prefeitura de não publicar numa visita em que o
  // problema era nosso. Mesma distinção que raio-x.ts já faz.
  return itensDoTesouro<LinhaRgf>(
    `${URL_RGF}?${query}`,
    cacheDoPeriodo(periodo.exercicio, periodo.mesReferencia)
  );
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
export function periodosParaTentar(
  exercicioAtual: number,
  mesAtual: number
): PeriodoRgf[] {
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

  return (
    lista
      // Descarta período que ainda nem terminou. Em setembro, o quadrimestre
      // que fecha em dezembro não existe em lugar nenhum — e gastar as
      // tentativas nele é o que fazia a busca não alcançar o exercício
      // anterior. Foi assim que Toledo/MG apareceu como "sem RGF" tendo três
      // períodos publicados.
      .filter((p) => p.exercicio < exercicioAtual || p.mesReferencia <= mesAtual)
      // Do fechamento mais recente para o mais antigo, para a busca não
      // devolver um quadrimestre velho só por vir antes na lista.
      .sort((a, b) => b.exercicio - a.exercicio || b.mesReferencia - a.mesReferencia)
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
  mesAtual: number,
  // Oito cobre o exercício corrente inteiro e ainda alcança o anterior. Cinco
  // não alcançava: uma prefeitura em dia com o RGF do ano passado, mas ainda
  // sem enviar o deste, aparecia como se nunca tivesse publicado nada.
  tentativas = 8,
  hoje: Date = new Date()
): Promise<ResultadoRgf> {
  // Lugar sem prefeitura (Fernando de Noronha): não há o que cobrar.
  const motivo = SEM_PREFEITURA[codigoIbge];
  if (motivo) {
    return { ok: false, erro: motivo, causa: "sem_prefeitura", periodosProcurados: 0, motivo };
  }

  // Primeiro o atalho: o extrato de entregas diz qual RGF a prefeitura
  // entregou, e basta buscar esse (lib/siconfi-entregas.ts). Poupa até
  // catorze perguntas ao Tesouro, que é o que o fazia recusar consultas.
  const chave = (p: PeriodoRgf) => `${p.exercicio}${p.periodicidade}${p.periodo}`;
  const jaTentados = new Set<string>();
  // A varredura lembra o que viu: um período em branco é achado diferente de
  // nenhum período, e uma falha de rede não é achado nenhum sobre a prefeitura.
  let viuEmBranco = false;
  let falhouAConsulta = false;
  let inconsistente: NumerosInconsistentes | undefined;

  const entregues = await rgfsEntregues(codigoIbge, [exercicioAtual, exercicioAtual - 1]);
  const pronto = (r: ResultadoRgf & { ok: true }): ResultadoRgf => ({
    ...r,
    contexto: contextoDoNumero(r.dados.periodo, inconsistente, entregues, hoje),
  });

  /** Lê um período. Devolve o resultado só se for número bom. */
  const ler = async (periodo: PeriodoRgf, contaFalha: boolean) => {
    jaTentados.add(chave(periodo));
    const itens = await buscarPeriodo(codigoIbge, periodo);
    if (itens === null) {
      if (contaFalha) falhouAConsulta = true;
      return null;
    }
    if (itens.length === 0) return null;
    const resultado = extrairRgf(itens, periodo);
    if (resultado.ok) return resultado;
    // Período em branco ou com números que não fecham não encerra a busca: o
    // anterior pode estar bom, e é melhor um número de meses atrás, dito
    // como tal, que nenhum.
    if (resultado.causa === "em_branco") viuEmBranco = true;
    if (resultado.causa === "inconsistente" && !inconsistente) inconsistente = resultado.numerosInconsistentes;
    return null;
  };

  for (const periodo of (entregues ?? [])
    .filter((p) => p.exercicio < exercicioAtual || p.mesReferencia <= mesAtual)
    .slice(0, 3)) {
    const r = await ler(periodo, false);
    if (r) return pronto(r);
  }

  // Sem atalho (ou ele não levou a número), a busca completa. Só ela pode
  // concluir que nada foi publicado.
  const candidatos = periodosParaTentar(exercicioAtual, mesAtual)
    .slice(0, tentativas)
    .filter((p) => !jaTentados.has(chave(p)));

  for (const periodo of candidatos) {
    const r = await ler(periodo, true);
    if (r) return pronto(r);
  }

  const procurados = jaTentados.size;

  // Números declarados que não fecham: é o achado, com os números.
  if (inconsistente) {
    return {
      ok: false,
      erro: "O RGF traz despesa com pessoal e receita que não fecham entre si.",
      causa: "inconsistente",
      periodosProcurados: procurados,
      numerosInconsistentes: inconsistente,
    };
  }

  // O extrato de entregas registra RGF da prefeitura: ela ENTREGOU. Seja qual
  // for o motivo de não termos lido os números (consulta aberta ainda sem os
  // dados, anexo em outro formato, Tesouro fora do ar), dizer "não publicado"
  // aqui seria acusação falsa. Foi o caso de Caseiros/RS na auditoria.
  const entregueMaisRecente = (entregues ?? []).find(
    (p) => p.exercicio < exercicioAtual || p.mesReferencia <= mesAtual
  );
  if (entregueMaisRecente && !viuEmBranco) {
    return {
      ok: false,
      erro: "O RGF consta entregue no Tesouro, mas os valores não puderam ser lidos na consulta aberta.",
      causa: "entregue_sem_dados",
      periodosProcurados: procurados,
      periodoEntregue: entregueMaisRecente,
    };
  }

  // Falha nossa antes de achado sobre o cliente. Sem o extrato, falta a
  // segunda fonte para afirmar ausência: vale como consulta que não chegou.
  if (falhouAConsulta || entregues === null) {
    return {
      ok: false,
      erro: "A consulta ao Tesouro não respondeu nesta tentativa.",
      causa: "consulta_falhou",
      periodosProcurados: procurados,
    };
  }

  if (viuEmBranco) {
    return {
      ok: false,
      erro: "O RGF foi publicado sem os valores de despesa com pessoal.",
      causa: "em_branco",
      periodosProcurados: procurados,
    };
  }

  return {
    ok: false,
    erro:
      "Nenhum RGF encontrado no Tesouro para este município nos últimos períodos. " +
      "Pode ser que ainda não tenha sido publicado — informe os valores à mão abaixo.",
    causa: "nao_publicado",
    periodosProcurados: procurados,
  };
}

/** O período que vem depois de `p`, na mesma periodicidade. */
export function periodoSeguinte(p: PeriodoRgf): PeriodoRgf {
  const ultimo = p.periodicidade === "S" ? 2 : 3;
  const exercicio = p.periodo === ultimo ? p.exercicio + 1 : p.exercicio;
  const periodo = p.periodo === ultimo ? 1 : p.periodo + 1;
  return { exercicio, periodicidade: p.periodicidade, periodo, mesReferencia: mesDeReferencia(p.periodicidade, periodo) };
}

/** Prazo de publicação do RGF: 30 dias após o fim do período (LRF, art. 55, § 2º). */
export function vencimentoDoRgf(p: PeriodoRgf): string {
  const fim = Date.UTC(p.exercicio, p.mesReferencia, 0);
  return new Date(fim + 30 * 86_400_000).toISOString().slice(0, 10);
}

function contextoDoNumero(
  exibido: PeriodoRgf,
  inconsistente: NumerosInconsistentes | undefined,
  entregues: PeriodoRgf[] | null,
  hoje: Date
): ContextoRgf | undefined {
  const contexto: ContextoRgf = {};
  if (inconsistente) contexto.inconsistenteMaisRecente = inconsistente;

  const seguinte = periodoSeguinte(exibido);
  const vencimento = vencimentoDoRgf(seguinte);
  // Se o seguinte foi justamente o inconsistente, a frase dele já explica.
  const ehOInconsistente =
    inconsistente &&
    inconsistente.periodo.exercicio === seguinte.exercicio &&
    inconsistente.periodo.periodicidade === seguinte.periodicidade &&
    inconsistente.periodo.periodo === seguinte.periodo;
  if (vencimento < hoje.toISOString().slice(0, 10) && !ehOInconsistente) {
    contexto.proximoVencido = {
      periodo: seguinte,
      vencimento,
      entregue:
        entregues === null
          ? null
          : entregues.some(
              (p) => p.exercicio === seguinte.exercicio && p.periodicidade === seguinte.periodicidade && p.periodo === seguinte.periodo
            ),
    };
  }
  return contexto.inconsistenteMaisRecente || contexto.proximoVencido ? contexto : undefined;
}

/**
 * Vários períodos do RGF, do mais antigo para o mais novo.
 *
 * `buscarRgfMaisRecente` para no primeiro período que extrai — é o que a tela
 * de importação precisa. A trajetória da despesa com pessoal precisa do
 * contrário: de uma SÉRIE, porque uma reta sobre um ponto não existe.
 *
 * Período publicado em branco não entra. Entraria como ponto falso numa reta
 * que depois decide uma data, e `lib/antecipacao.ts` recusa previsão sobre
 * base ruim justamente para isso não acontecer.
 */
export async function buscarSerieRgf(
  codigoIbge: string,
  periodos = 8
): Promise<ImportacaoRgf[]> {
  const agora = new Date();
  const candidatos = periodosParaTentar(agora.getFullYear(), agora.getMonth() + 1).slice(
    0,
    periodos
  );

  const serie: ImportacaoRgf[] = [];
  for (const periodo of candidatos) {
    const itens = await buscarPeriodo(codigoIbge, periodo);
    if (itens === null || itens.length === 0) continue;
    const resultado = extrairRgf(itens, periodo);
    if (resultado.ok) serie.push(resultado.dados);
  }

  // `periodosParaTentar` devolve do mais recente para o mais antigo. A série
  // vai ao contrário: regressão sobre série invertida produz ritmo com o sinal
  // trocado, isto é, um aviso dizendo o oposto da realidade.
  return serie.sort(
    (a, b) =>
      a.periodo.exercicio * 12 + a.periodo.mesReferencia -
      (b.periodo.exercicio * 12 + b.periodo.mesReferencia)
  );
}
