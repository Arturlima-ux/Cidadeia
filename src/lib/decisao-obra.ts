// ── A DECISÃO SOBRE A OBRA QUE PASSOU DO PRAZO ──
//
// O módulo apontava a obra cujo contrato venceu sem conclusão e parava ali. O
// gestor via o problema e não tinha onde registrar o que decidiu — nem a
// justificativa que o Tribunal de Contas vai pedir depois, quando perguntar
// por que a obra ficou dois anos parada e ninguém fez nada.
//
// Apontar sem permitir agir transforma o sistema em acusador. Este módulo
// fecha o ciclo.
//
// ── E CORRIGE UMA LEITURA ERRADA DA LEI ──
//
// O texto anterior dizia que o contrato vencido deixava a execução "sem
// cobertura contratual". Para obra, isso está errado.
//
// Art. 111 da Lei 14.133/2021, caput:
//
//   "Na contratação que previr a conclusão de escopo predefinido, o prazo de
//   vigência será automaticamente prorrogado quando seu objeto não for
//   concluído no período firmado no contrato."
//
// Obra é contratação de escopo predefinido. A vigência prorroga SOZINHA, sem
// aditivo, sem assinatura, sem nada. Dizer ao gestor que ele está executando
// sem contrato é assustá-lo com uma coisa que a lei resolveu.
//
// O que não prorroga sozinho é a responsabilidade. Parágrafo único:
//
//   "Quando a não conclusão decorrer de culpa do contratado:
//    I - o contratado será constituído em mora, aplicáveis a ele as
//        respectivas sanções administrativas;
//    II - a Administração poderá optar pela extinção do contrato e, nesse
//        caso, adotará as medidas admitidas em lei para a continuidade da
//        execução contratual."
//
// Então a pergunta certa não é "o contrato ainda vale?". É "de quem foi a
// culpa, e o que a Administração decidiu fazer a respeito?". É isso que fica
// registrado aqui, e é isso que o Tribunal pergunta.

export const BASE_LEGAL_ESCOPO = "Art. 111 da Lei 14.133/2021";

export type TipoDecisaoObra =
  /** A obra acabou; faltava registrar. */
  | "concluida"
  /** Segue em execução sob a prorrogação automática do caput. */
  | "prorrogacao_automatica"
  /** Atraso por culpa do contratado: mora e sanção (§ único, I). */
  | "mora_do_contratado"
  /** A Administração optou por extinguir (§ único, II). */
  | "extincao"
  /** A data no cadastro estava errada. */
  | "correcao_de_cadastro";

export type OpcaoDecisao = {
  tipo: TipoDecisaoObra;
  rotulo: string;
  /** O que esta escolha afirma, em uma frase. */
  significado: string;
  base: string | null;
  /** true quando a escolha exige informar uma nova data de conclusão. */
  exigeData: boolean;
  /** true quando a escolha afirma culpa do contratado. */
  afirmaCulpa: boolean;
};

export const OPCOES_DECISAO: OpcaoDecisao[] = [
  {
    tipo: "concluida",
    rotulo: "A obra foi concluída",
    significado:
      "A execução terminou e faltava registrar. O progresso vai a 100% e a obra sai da lista.",
    base: null,
    exigeData: true,
    afirmaCulpa: false,
  },
  {
    tipo: "prorrogacao_automatica",
    rotulo: "Segue em execução, com prazo prorrogado por lei",
    significado:
      "O objeto não foi concluído no prazo e a vigência está automaticamente prorrogada. A " +
      "execução continua regular; não é preciso termo aditivo para isso.",
    base: `${BASE_LEGAL_ESCOPO}, caput`,
    exigeData: true,
    afirmaCulpa: false,
  },
  {
    tipo: "mora_do_contratado",
    rotulo: "O atraso é do contratado — mora e sanção",
    significado:
      "A não conclusão decorreu de culpa do contratado, que fica constituído em mora, com as " +
      "sanções administrativas cabíveis. A obra segue, e a responsabilização corre em paralelo.",
    base: `${BASE_LEGAL_ESCOPO}, parágrafo único, I`,
    exigeData: true,
    afirmaCulpa: true,
  },
  {
    tipo: "extincao",
    rotulo: "Extinguir o contrato",
    significado:
      "A Administração optou por extinguir. Exige adotar as medidas admitidas em lei para a " +
      "continuidade da execução — a obra não pode simplesmente parar.",
    base: `${BASE_LEGAL_ESCOPO}, parágrafo único, II`,
    exigeData: false,
    afirmaCulpa: true,
  },
  {
    tipo: "correcao_de_cadastro",
    rotulo: "A data no cadastro está errada",
    significado:
      "Não há atraso: a vigência registrada não corresponde ao contrato. Corrigida a data, a obra " +
      "volta ao acompanhamento normal.",
    base: null,
    exigeData: true,
    afirmaCulpa: false,
  },
];

export function opcaoDe(tipo: TipoDecisaoObra): OpcaoDecisao {
  return OPCOES_DECISAO.find((o) => o.tipo === tipo)!;
}

export type DecisaoObra = {
  tipo: TipoDecisaoObra;
  justificativa: string;
  /** Nova previsão de conclusão, quando a decisão exige. */
  novaPrevisao: string | null;
  /** Nº do processo, ofício ou termo que documenta a decisão. */
  documento: string | null;
  decididoPor: string;
  decididoEm: string;
};

/**
 * Tamanho mínimo da justificativa.
 *
 * ── POR QUE EXISTE UM MÍNIMO ──
 *
 * Campo livre que aceita "ok" vira campo preenchido com "ok", e um registro de
 * decisão com "ok" na justificativa é pior que nenhum registro: dá aparência
 * de processo a uma decisão que não foi fundamentada, e é exatamente isso que
 * o Tribunal de Contas aponta.
 *
 * Quarenta caracteres não garantem qualidade, mas impedem o clique automático.
 */
export const MINIMO_JUSTIFICATIVA = 40;

export type ProblemaNaDecisao = { campo: string; mensagem: string };

export function validarDecisao(
  entrada: {
    tipo: TipoDecisaoObra;
    justificativa: string;
    novaPrevisao: string | null;
  },
  hoje: Date = new Date()
): ProblemaNaDecisao[] {
  const problemas: ProblemaNaDecisao[] = [];
  const opcao = OPCOES_DECISAO.find((o) => o.tipo === entrada.tipo);

  if (!opcao) {
    return [{ campo: "tipo", mensagem: "Escolha uma das decisões da lista." }];
  }

  const texto = entrada.justificativa.trim();
  if (texto.length < MINIMO_JUSTIFICATIVA) {
    problemas.push({
      campo: "justificativa",
      mensagem:
        `Descreva em pelo menos ${MINIMO_JUSTIFICATIVA} caracteres por que esta é a decisão. ` +
        "É este texto que responde ao Tribunal de Contas depois.",
    });
  }

  if (opcao.exigeData) {
    if (!entrada.novaPrevisao) {
      problemas.push({
        campo: "novaPrevisao",
        mensagem:
          opcao.tipo === "concluida"
            ? "Informe a data em que a obra foi concluída."
            : "Informe até quando a obra deve ficar pronta.",
      });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(entrada.novaPrevisao)) {
      problemas.push({ campo: "novaPrevisao", mensagem: "Data inválida." });
    } else {
      const d = new Date(`${entrada.novaPrevisao}T12:00:00Z`);
      const agora = new Date(
        Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 12)
      );
      // Conclusão é fato passado; previsão é compromisso futuro. Trocar os dois
      // de lugar é o erro de digitação mais comum num formulário de data, e
      // aqui ele produziria uma obra "concluída daqui a seis meses".
      if (opcao.tipo === "concluida" && d.getTime() > agora.getTime()) {
        problemas.push({
          campo: "novaPrevisao",
          mensagem: "A data de conclusão não pode estar no futuro.",
        });
      }
      if (opcao.tipo !== "concluida" && d.getTime() < agora.getTime()) {
        problemas.push({
          campo: "novaPrevisao",
          mensagem: "A previsão de conclusão não pode estar no passado.",
        });
      }
    }
  }

  return problemas;
}

/**
 * A decisão ainda vale hoje?
 *
 * ── POR QUE UMA DECISÃO VENCE ──
 *
 * "Prorrogado, previsão para 30/06" é um compromisso, não um encerramento de
 * assunto. Se 30/06 passa e a obra não ficou pronta, o alerta precisa voltar —
 * senão bastaria registrar uma decisão qualquer para a obra sumir da tela para
 * sempre, e o registro viraria um jeito de calar o sistema.
 *
 * Decisão sem data (extinção) não vence: ela encerra o acompanhamento daquele
 * contrato, e o que vier depois é outro contrato.
 */
export function decisaoAindaVale(d: DecisaoObra, hoje: Date = new Date()): boolean {
  if (d.tipo === "concluida" || d.tipo === "extincao") return true;
  if (!d.novaPrevisao) return true;
  const limite = new Date(`${d.novaPrevisao}T12:00:00Z`);
  const agora = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 12);
  return limite.getTime() >= agora;
}

/** A frase que a tela mostra sobre a decisão registrada. */
export function resumoDaDecisao(d: DecisaoObra, hoje: Date = new Date()): string {
  const o = opcaoDe(d.tipo);
  const quando = d.decididoEm.slice(0, 10).split("-").reverse().join("/");
  const partes = [`${o.rotulo} — decidido por ${d.decididoPor} em ${quando}`];
  if (d.documento) partes.push(`Documento: ${d.documento}`);
  if (d.novaPrevisao) {
    const data = d.novaPrevisao.split("-").reverse().join("/");
    partes.push(
      d.tipo === "concluida" ? `Concluída em ${data}` : `Previsão de conclusão: ${data}`
    );
  }
  if (!decisaoAindaVale(d, hoje)) {
    partes.push("A previsão desta decisão venceu — é preciso decidir de novo.");
  }
  return partes.join(". ") + ".";
}
