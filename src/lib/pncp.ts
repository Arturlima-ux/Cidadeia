// ── PORTAL NACIONAL DE CONTRATAÇÕES PÚBLICAS (PNCP) ──
//
// Desde abril de 2024 todo ente federativo é obrigado a divulgar no PNCP os
// editais, contratos e atas — e isso não é formalidade de arquivo: a
// divulgação é CONDIÇÃO DE EFICÁCIA do contrato (art. 94 da Lei 14.133/2021).
// Processo não publicado não produz efeito, e pagamento feito sobre ele vira
// despesa irregular na conta do gestor.
//
// ── POR QUE CONFERIMOS EM VEZ DE PUBLICAR ──
//
// Publicar exige que a plataforma seja credenciada junto ao Ministério da
// Gestão e receba login próprio para representar os CNPJs dos municípios. É
// um passo de credenciamento, não de código, e enquanto ele não existe
// qualquer promessa de "publicamos por você" seria falsa.
//
// A consulta, por outro lado, é PÚBLICA e sem autenticação. Dá para responder
// hoje a pergunta que ninguém responde ao prefeito: dos processos que a
// prefeitura registrou, quais de fato constam no PNCP? Achar um que não consta
// vale mais do que publicar automaticamente o que já estava certo.

const BASE = "https://pncp.gov.br/api/consulta/v1";
const TIMEOUT_MS = 20000;

/**
 * O parâmetro de modalidade é OBRIGATÓRIO na consulta, então não existe
 * "buscar tudo": é preciso varrer modalidade por modalidade.
 *
 * A lista cobre as usadas por município. Leilão e diálogo competitivo ficam de
 * fora porque prefeitura pequena não os usa, e cada modalidade a mais é uma
 * requisição a mais contra um limite bem apertado (ver abaixo).
 */
export const MODALIDADES_MUNICIPAIS: { codigo: number; nome: string }[] = [
  { codigo: 6, nome: "Pregão eletrônico" },
  { codigo: 8, nome: "Dispensa" },
  { codigo: 9, nome: "Inexigibilidade" },
  { codigo: 4, nome: "Concorrência eletrônica" },
];

/**
 * O PNCP devolve 429 com facilidade — chegamos ao limite durante o
 * desenvolvimento com poucas chamadas seguidas. Por isso o cliente vai devagar
 * de propósito e o resultado precisa ser guardado em cache por quem chama:
 * conferir publicação é tarefa de rotina diária, não de cada abertura de tela.
 */
const PAUSA_ENTRE_CHAMADAS_MS = 400;
const TAMANHO_PAGINA = 50; // o mínimo aceito é 10; o máximo reduz idas e vindas

/**
 * Teto de requisições por consulta, somando todas as modalidades.
 *
 * ── POR QUE ESTE TETO EXISTE, E POR QUE É ALTO ──
 *
 * A versão anterior pedia `pagina=1` e parava. Não era uma escolha: era um
 * parâmetro escrito e esquecido. Medindo um município de verdade (São Sepé/RS,
 * 2026) o PNCP devolve 336 dispensas, 95 pregões e 49 inexigibilidades — 480
 * processos em 10 páginas. Lendo só a primeira de cada, entravam 150.
 *
 * E o dano não era "faltar dado": conferirPublicacao concluía AUSÊNCIA a
 * partir dessa fatia. A tela diria ao prefeito que dois terços dos contratos
 * dele não constam no PNCP, o que pelo art. 94 significa contrato sem
 * eficácia e pagamento irregular na conta dele. Acusação falsa, por escrito,
 * no módulo cujo valor inteiro é ser confiável.
 *
 * 40 requisições × 50 = 2.000 processos, acima de qualquer município. O teto
 * fica como cinto de segurança contra um CNPJ de capital, não como limite de
 * uso — e quando ele é alcançado a consulta se declara INCOMPLETA, porque
 * varredura parcial não pode virar acusação.
 */
const MAXIMO_REQUISICOES = 40;

export type ContratacaoPncp = {
  numeroCompra: string;
  anoCompra: number;
  modalidade: string;
  objeto: string;
  valorEstimado: number | null;
  numeroControlePncp: string;
  publicadaEm: string;
};

export type ResultadoConsultaPncp =
  | {
      ok: true;
      contratacoes: ContratacaoPncp[];
      /**
       * true quando TODAS as páginas de TODAS as modalidades foram lidas.
       *
       * Só com ela verdadeira é permitido concluir que um processo não está no
       * PNCP. Falsa, a tela diz "não foi possível confirmar" — que é a verdade
       * e não acusa ninguém.
       */
      completa: boolean;
      /** Quantas modalidades ficaram pela metade, para a tela explicar. */
      modalidadesIncompletas: string[];
    }
  | { ok: false; erro: string; limiteExcedido: boolean };

function esperar(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Consulta as contratações que o PNCP tem publicadas para um CNPJ, num ano.
 *
 * O CNPJ é o do próprio município — vem da tabela prefeituras, não de campo
 * digitado na hora, para a conferência não poder apontar para outro ente.
 */
export async function buscarContratacoesPncp(
  cnpj: string,
  ano: number
): Promise<ResultadoConsultaPncp> {
  const limpo = cnpj.replace(/\D/g, "");
  if (limpo.length !== 14) {
    return { ok: false, erro: "CNPJ do município inválido ou não cadastrado.", limiteExcedido: false };
  }

  const encontradas: ContratacaoPncp[] = [];
  const modalidadesIncompletas: string[] = [];
  let requisicoes = 0;

  for (const modalidade of MODALIDADES_MUNICIPAIS) {
    // O PNCP informa quantas páginas restam; paramos por essa conta, e não por
    // um número de páginas chutado aqui.
    let pagina = 1;
    let restam = true;

    while (restam) {
      if (requisicoes >= MAXIMO_REQUISICOES) {
        modalidadesIncompletas.push(modalidade.nome);
        restam = false;
        break;
      }
      if (requisicoes > 0) await esperar(PAUSA_ENTRE_CHAMADAS_MS);
      requisicoes++;

      const url =
        `${BASE}/contratacoes/publicacao?dataInicial=${ano}0101&dataFinal=${ano}1231` +
        `&codigoModalidadeContratacao=${modalidade.codigo}&cnpj=${limpo}` +
        `&pagina=${pagina}&tamanhoPagina=${TAMANHO_PAGINA}`;

      try {
        const resposta = await fetch(url, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        // 429 precisa ser distinguido de erro de verdade: significa "tente mais
        // tarde", e a tela deve dizer isso em vez de acusar falha do PNCP.
        if (resposta.status === 429) {
          return {
            ok: false,
            erro: "O PNCP está limitando as consultas agora. Tente novamente em alguns minutos.",
            limiteExcedido: true,
          };
        }

        // 204 é a resposta do PNCP para "nada encontrado" nesta modalidade.
        if (resposta.status === 204) break;
        if (!resposta.ok) {
          // Página que falhou no meio da modalidade deixa um buraco: o que
          // estava nela some sem ninguém saber. Registrar a modalidade como
          // incompleta é o que impede esse buraco de virar "não publicado".
          if (pagina > 1) modalidadesIncompletas.push(modalidade.nome);
          break;
        }

        const json = (await resposta.json()) as {
          data?: unknown[];
          paginasRestantes?: number;
          totalPaginas?: number;
        };
        for (const bruto of json.data ?? []) {
          const c = bruto as Record<string, unknown>;
          encontradas.push({
            numeroCompra: String(c.numeroCompra ?? ""),
            anoCompra: Number(c.anoCompra) || ano,
            modalidade: String(c.modalidadeNome ?? modalidade.nome),
            objeto: String(c.objetoCompra ?? ""),
            valorEstimado: typeof c.valorTotalEstimado === "number" ? c.valorTotalEstimado : null,
            numeroControlePncp: String(c.numeroControlePNCP ?? ""),
            publicadaEm: String(c.dataPublicacaoPncp ?? ""),
          });
        }

        // `paginasRestantes` é o campo do próprio envelope. A conta com
        // totalPaginas é reserva: se um dia o campo sumir, a varredura continua
        // em vez de parar calada na primeira página — que é o defeito que
        // estamos consertando aqui.
        const sobram =
          typeof json.paginasRestantes === "number"
            ? json.paginasRestantes
            : typeof json.totalPaginas === "number"
              ? json.totalPaginas - pagina
              : 0;
        restam = sobram > 0 && (json.data?.length ?? 0) > 0;
        pagina++;
      } catch {
        // Uma modalidade que falhou não invalida as outras — mas também não
        // passa por completa. É a mesma regra da página com erro acima.
        modalidadesIncompletas.push(modalidade.nome);
        break;
      }
    }
  }

  const unicas = [...new Set(modalidadesIncompletas)];
  return {
    ok: true,
    contratacoes: encontradas,
    completa: unicas.length === 0,
    modalidadesIncompletas: unicas,
  };
}

// ── CONFERÊNCIA ──
// Daqui para baixo é função pura: é onde mora a regra, e é o que os testes
// cobrem. Nenhuma chamada de rede.

export type LicitacaoLocal = {
  id: string;
  numero: string;
  objeto: string;
  status: string;
  /** Preenchido nos processos que vieram da importação. Chave exata. */
  numeroControlePncp?: string | null;
  /** Texto livre do cadastro. Serve para desempatar número repetido. */
  modalidade?: string | null;
};

/**
 * Família da modalidade, para comparar cadastro livre com o rótulo do portal.
 *
 * O PNCP escreve "Pregão - Eletrônico", "Concorrência - Eletrônica",
 * "Dispensa", "Inexigibilidade"; o cadastro tem o que o servidor digitou
 * ("pregão eletrônico", "Dispensa por valor"). Comparar texto inteiro nunca
 * casaria; a família casa.
 */
export function familiaModalidade(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const t = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (t.includes("inexigibilidade")) return "inexigibilidade";
  if (t.includes("dispensa")) return "dispensa";
  if (t.includes("pregao")) return "pregao";
  if (t.includes("concorrencia")) return "concorrencia";
  if (t.includes("leilao")) return "leilao";
  if (t.includes("dialogo")) return "dialogo";
  return null;
}

/**
 * ── POR QUE TRÊS ESTADOS, E NÃO UM BOOLEANO ──
 *
 * Era `publicada: boolean`, e false significava duas coisas muito diferentes:
 * "o PNCP não tem este processo" e "não consegui olhar tudo". A segunda é
 * frequente (limite de requisições, página com erro) e, dita como a primeira,
 * afirma ao prefeito que o contrato dele não tem eficácia pelo art. 94.
 *
 * Um booleano não tem onde guardar "não sei". Por isso são três.
 */
export type SituacaoConferencia = "publicada" | "ausente" | "indeterminada";

export type Conferencia = {
  licitacao: LicitacaoLocal;
  situacao: SituacaoConferencia;
  /** Preenchido quando encontrada — dá o link e a prova. */
  correspondente: ContratacaoPncp | null;
  /**
   * Por que ficou indeterminada. São coisas diferentes para quem lê a tela:
   * uma se resolve tentando de novo, a outra se resolve informando a
   * modalidade no cadastro.
   */
  motivo?: "varredura_parcial" | "numero_ambiguo";
};

/**
 * Reduz um número de processo à sua parte comparável.
 *
 * "PE 014/2026", "Pregão 14/2026" e "0014" precisam casar: o PNCP guarda
 * "0014" e a prefeitura digita do jeito que usa internamente. Tiramos tudo que
 * não é dígito da parte antes da barra e derrubamos os zeros à esquerda.
 */
export function normalizarNumero(numero: string): string {
  const antesDaBarra = numero.split("/")[0] ?? "";
  const digitos = antesDaBarra.replace(/\D/g, "");
  return digitos.replace(/^0+/, "") || digitos;
}

/** Ano no fim do número ("PE 014/2026" → 2026), quando houver. */
export function anoDoNumero(numero: string): number | null {
  const m = numero.match(/\/\s*(\d{4})\s*$/);
  return m ? Number(m[1]) : null;
}

/**
 * Cruza o que a prefeitura registrou com o que o PNCP publicou.
 *
 * Casa por número e, quando o número local traz o ano, também por ano — sem
 * isso o processo 14/2025 casaria com o 14/2026 e a tela diria "publicado"
 * para algo que não está.
 */
export function conferirPublicacao(
  locais: LicitacaoLocal[],
  noPncp: ContratacaoPncp[],
  // Sem este parâmetro a função não sabe se pode afirmar ausência, e o valor
  // seguro é o pessimista: varredura parcial não acusa ninguém. Por isso o
  // padrão é `false` — quem tem certeza precisa dizer que tem.
  varreduraCompleta = false
): Conferencia[] {
  return locais.map((licitacao): Conferencia => {
    const semPar = (): Conferencia =>
      varreduraCompleta
        ? { licitacao, situacao: "ausente", correspondente: null }
        : { licitacao, situacao: "indeterminada", correspondente: null, motivo: "varredura_parcial" };

    // 1. Chave exata, quando o processo veio da importação. numeroControlePNCP
    //    é único no país: não há ambiguidade a resolver.
    if (licitacao.numeroControlePncp) {
      const exato = noPncp.find((c) => c.numeroControlePncp === licitacao.numeroControlePncp);
      return exato ? { licitacao, situacao: "publicada", correspondente: exato } : semPar();
    }

    // 2. Processo cadastrado à mão: só há número e, se o servidor preencheu,
    //    modalidade.
    const alvo = normalizarNumero(licitacao.numero);
    if (alvo === "") return semPar();
    const ano = anoDoNumero(licitacao.numero);

    let candidatos = noPncp.filter(
      (c) => normalizarNumero(c.numeroCompra) === alvo && (ano === null || c.anoCompra === ano)
    );

    // ── POR QUE ESTE DESEMPATE EXISTE ──
    //
    // A numeração do PNCP reinicia por modalidade. Nos dados reais de um
    // município, 496 contratações do ano têm só 416 pares número+ano
    // distintos: "Dispensa 5/2026" e "Pregão 5/2026" convivem.
    //
    // Sem desempatar, um processo cadastrado como dispensa encontrava o pregão
    // homônimo e a tela dizia PUBLICADO. É o erro na direção pior — tranquiliza
    // o gestor sobre um contrato que, sem divulgação, não produz efeito.
    // O filtro vale SEMPRE que a modalidade local é conhecida, e não só no
    // empate. Um teste pegou isto: com um candidato único da família errada — o
    // pregão homônimo da dispensa procurada — filtrar só no empate devolvia
    // "publicada", que é o erro exato que este bloco existe para impedir.
    //
    // Contratação cujo rótulo não reconhecemos (familiaModalidade null) fica no
    // conjunto: não dá para excluir por uma família que não sabemos qual é.
    const familiaLocal = familiaModalidade(licitacao.modalidade);
    if (familiaLocal) {
      candidatos = candidatos.filter((c) => {
        const f = familiaModalidade(c.modalidade);
        return f === null || f === familiaLocal;
      });
    }

    if (candidatos.length === 1) {
      return { licitacao, situacao: "publicada", correspondente: candidatos[0]! };
    }
    if (candidatos.length > 1) {
      // Empate que a modalidade não resolveu. Escolher um seria escolher no
      // escuro, e as duas escolhas erradas mentem: dizer publicado sobre o
      // processo errado, ou dizer ausente sobre um que está lá.
      return { licitacao, situacao: "indeterminada", correspondente: null, motivo: "numero_ambiguo" };
    }
    return semPar();
  });
}

export type ResumoConferencia = {
  total: number;
  publicadas: number;
  ausentes: Conferencia[];
  /** Os que não deu para confirmar. Aparecem na tela, sem cobrança. */
  indeterminadas: Conferencia[];
};

export function resumirConferencia(conferencias: Conferencia[]): ResumoConferencia {
  return {
    total: conferencias.length,
    publicadas: conferencias.filter((c) => c.situacao === "publicada").length,
    ausentes: conferencias.filter((c) => c.situacao === "ausente"),
    indeterminadas: conferencias.filter((c) => c.situacao === "indeterminada"),
  };
}

/**
 * ── A PERGUNTA INVERSA ──
 *
 * A conferência acima pergunta "o que eu registrei está no PNCP?". A pergunta
 * que ninguém fazia é a de trás para frente: o PNCP tem 480 contratações deste
 * CNPJ e a tela do gestor tem quatro — quem digitou as quatro escolheu quais
 * mostrar, e o que ficou de fora é justamente o que ninguém quer olhar.
 *
 * Isso muda o módulo de lugar. Antes, fracionamento e concentração de
 * fornecedor eram calculados sobre o que um servidor teve paciência de digitar,
 * e o próprio texto da tela admitia isso ("depende de um histórico real de
 * processos"). O histórico real existe, é público, é obrigatório por lei desde
 * abril de 2024 e está a uma consulta de distância.
 *
 * Esta função devolve o que está no PNCP e não tem par no cadastro local, para
 * o gestor importar de uma vez. O casamento usa a mesma regra da conferência —
 * número normalizado e ano — para as duas direções nunca discordarem.
 */
export function processosSoNoPncp(
  locais: LicitacaoLocal[],
  noPncp: ContratacaoPncp[]
): ContratacaoPncp[] {
  // Chave exata dos que já vieram do portal. É esta que torna reimportar o ano
  // inofensivo — a alternativa por número deixaria passar cópias, porque a
  // numeração do PNCP reinicia por modalidade.
  const porControle = new Set(
    locais.map((l) => l.numeroControlePncp).filter((x): x is string => !!x)
  );

  // Os cadastrados à mão não têm a chave exata; para eles a comparação inclui a
  // modalidade, quando informada, pelo mesmo motivo. Sem a modalidade, o número
  // vale para qualquer família — pessimista de propósito: é melhor não oferecer
  // um processo para importar do que criar uma segunda cópia do que já existe.
  // `null` é CURINGA NOS DOIS LADOS, e isso é deliberado. Ano ausente no
  // cadastro casa com qualquer ano — é a regra `ano === null || ...` da
  // conferência, e as duas direções precisam concordar, senão um processo
  // apareceria ao mesmo tempo como publicado e como faltando. Modalidade
  // ausente em qualquer dos lados também casa: entre oferecer uma importação
  // duplicada e deixar de oferecer uma, a segunda é a que não estraga dado.
  const digitados = locais
    .filter((l) => !l.numeroControlePncp)
    .map((l) => ({
      n: normalizarNumero(l.numero),
      ano: anoDoNumero(l.numero),
      fam: familiaModalidade(l.modalidade),
    }))
    .filter((l) => l.n !== "");

  return noPncp.filter((c) => {
    if (c.numeroControlePncp && porControle.has(c.numeroControlePncp)) return false;
    const n = normalizarNumero(c.numeroCompra);
    if (n === "") return false;
    const fam = familiaModalidade(c.modalidade);
    const jaCadastrado = digitados.some(
      (l) =>
        l.n === n &&
        (l.ano === null || l.ano === c.anoCompra) &&
        (l.fam === null || fam === null || l.fam === fam)
    );
    return !jaCadastrado;
  });
}

/**
 * Converte uma contratação do PNCP nos campos da tabela `licitacoes`.
 *
 * ── O QUE ESTA FUNÇÃO NÃO INVENTA ──
 *
 * `status` entra como "publicada", e não "homologada". O endpoint de consulta
 * diz que a contratação foi DIVULGADA; quem venceu e se foi homologada estão
 * noutro endereço (/contratos). Marcar homologada aqui faria o detector de
 * concentração de fornecedor rodar sobre um vencedor que não sabemos, e o
 * módulo passaria a apontar padrão em cima de um campo vazio.
 *
 * `fornecedor` fica null pelo mesmo motivo — é dado de contrato, não de edital.
 *
 * ── E POR QUE A DATA É A DA PUBLICAÇÃO ──
 *
 * Se `createdAt` ficasse com o instante da importação, as 336 dispensas de 2025
 * de um município entrariam todas no exercício corrente. A tela filtra o
 * fracionamento por exercício, então isso somaria dois anos num grupo só e
 * produziria a acusação que o § 1º do art. 75 descreve — sobre um fato que não
 * aconteceu. A data que vale é a do PNCP.
 */
export function paraLicitacaoLocal(c: ContratacaoPncp): {
  numero: string;
  objeto: string;
  modalidade: string;
  valorEstimado: number | null;
  status: "publicada";
  createdAt: string;
  numeroControlePncp: string;
} | null {
  if (normalizarNumero(c.numeroCompra) === "") return null;
  // Sem o identificador do portal a linha entraria sem chave exata, e a
  // conferência do ano seguinte voltaria a casar por número — que é o defeito
  // que esta coluna existe para fechar.
  if (!c.numeroControlePncp) return null;
  // O número guardado traz o ano de propósito: é o que faz a conferência do
  // ano seguinte reencontrar este processo em vez de cobrar publicação dele.
  return {
    numero: `${c.numeroCompra}/${c.anoCompra}`,
    objeto: c.objeto.trim() || "Objeto não informado no PNCP",
    modalidade: c.modalidade,
    valorEstimado: c.valorEstimado,
    status: "publicada",
    createdAt: c.publicadaEm || `${c.anoCompra}-01-01`,
    numeroControlePncp: c.numeroControlePncp,
  };
}

/** Endereço público da contratação no PNCP, para o gestor abrir e conferir. */
export function linkPncp(c: ContratacaoPncp): string | null {
  // Formato do identificador: <cnpj>-1-<sequencial>/<ano>
  const m = c.numeroControlePncp.match(/^(\d{14})-\d+-(\d+)\/(\d{4})$/);
  if (!m) return null;
  const [, cnpj, sequencial, ano] = m;
  return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${Number(sequencial)}`;
}
