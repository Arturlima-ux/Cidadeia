// ── BUSCA ATIVA ESCOLAR ──
//
// O aluno que some é o problema mais caro da educação municipal, e o mais
// mal resolvido: a escola sabe quem faltou, o Conselho Tutelar não é
// avisado no prazo, e a conta chega como ação do Ministério Público — ou
// como família perdendo o Bolsa Família por descumprimento de
// condicionalidade que ninguém explicou.
//
// ── O QUE A LEI PEDE ──
// LDB (Lei 9.394/1996), art. 24, VI: frequência mínima de 75% do total de
// horas letivas para aprovação.
// LDB, art. 12, VIII (Lei 13.803/2019): a escola deve notificar o Conselho
// Tutelar a relação de alunos com faltas acima de 30% do percentual
// permitido em lei.
// ECA (Lei 8.069/1990), art. 56, II: o dirigente da escola comunica ao
// Conselho Tutelar a reiteração de faltas injustificadas e a evasão,
// "esgotados os recursos escolares".
//
// Esse "esgotados os recursos escolares" é o nó. Sem prova do que a escola
// tentou antes, a comunicação é contestada e o município fica responsável.
// Por isso cada tentativa aqui tem data e autor — e é ela que vira o ofício.
//
// ── DADO DE CRIANÇA ──
// Aqui entra nome e turma, nada além disso: sem CPF, sem NIS, sem endereço.
// O município é o controlador e a base legal é obrigação própria dele
// (LGPD, art. 7º, II e art. 23), mas o que não é necessário não se coleta.

export const FREQUENCIA_MINIMA_LDB = 75;

/**
 * Condicionalidade de educação do Bolsa Família: 60% para crianças de 4 e
 * 5 anos, 75% dos 6 aos 17. Abaixo disso a família entra em
 * descumprimento, e a escola é quem informa a frequência.
 */
export const FREQUENCIA_BOLSA_FAMILIA = { ate5: 60, de6a17: 75 } as const;

export function exigenciaBolsaFamilia(idade: number | null): number {
  if (idade === null) return FREQUENCIA_BOLSA_FAMILIA.de6a17;
  return idade <= 5 ? FREQUENCIA_BOLSA_FAMILIA.ate5 : FREQUENCIA_BOLSA_FAMILIA.de6a17;
}

export const SITUACOES_BUSCA = [
  { chave: "aberta", rotulo: "Em busca ativa" },
  { chave: "retornou", rotulo: "Voltou para a sala" },
  { chave: "transferido", rotulo: "Transferido com documento" },
  { chave: "conselho_tutelar", rotulo: "No Conselho Tutelar" },
  { chave: "encerrada", rotulo: "Encerrada" },
] as const;

export type SituacaoBusca = (typeof SITUACOES_BUSCA)[number]["chave"];

export function rotuloSituacaoBusca(chave: string): string {
  return SITUACOES_BUSCA.find((s) => s.chave === chave)?.rotulo ?? chave;
}

/** Caso ainda correndo: alguém precisa fazer alguma coisa hoje. */
export function emAndamento(situacao: string): boolean {
  return situacao === "aberta" || situacao === "conselho_tutelar";
}

export type CasoBuscaAtiva = {
  alunoNome: string;
  alunoTurma: string | null;
  idade: number | null;
  faltas: number;
  aulasPeriodo: number;
  periodo: string;
  ultimaPresenca: string | null;
  bolsaFamilia: boolean;
  situacao: string;
  contatoFamiliaEm: string | null;
  visitaEm: string | null;
  conselhoTutelarEm: string | null;
  ministerioPublicoEm: string | null;
  createdAt: string;
};

/** Frequência do período, em percentual. null quando não há aulas informadas. */
export function frequencia(faltas: number, aulasPeriodo: number): number | null {
  if (aulasPeriodo <= 0) return null;
  const presentes = Math.max(0, aulasPeriodo - faltas);
  return (presentes / aulasPeriodo) * 100;
}

export type SituacaoFrequencia = "ok" | "atencao" | "reprovacao" | "sem_dado";

/**
 * A leitura da frequência contra o mínimo legal. "Atenção" começa antes
 * dos 75%: quem já está em 80% com o bimestre correndo chega lá.
 */
export function situacaoDaFrequencia(faltas: number, aulasPeriodo: number): SituacaoFrequencia {
  const f = frequencia(faltas, aulasPeriodo);
  if (f === null) return "sem_dado";
  if (f < FREQUENCIA_MINIMA_LDB) return "reprovacao";
  if (f < FREQUENCIA_MINIMA_LDB + 10) return "atencao";
  return "ok";
}

/** Quantas faltas ainda cabem antes de o aluno cair abaixo dos 75%. */
export function faltasQueAindaCabem(faltas: number, aulasPeriodo: number): number | null {
  if (aulasPeriodo <= 0) return null;
  const limite = Math.floor(aulasPeriodo * (1 - FREQUENCIA_MINIMA_LDB / 100));
  return Math.max(0, limite - faltas);
}

export function diasSemAparecer(ultimaPresenca: string | null, hoje: Date = new Date()): number | null {
  if (!ultimaPresenca) return null;
  const d = new Date(ultimaPresenca);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((hoje.getTime() - d.getTime()) / 86_400_000));
}

// ── AS ETAPAS QUE A LEI CHAMA DE "RECURSOS ESCOLARES" ──

export type Etapa = {
  chave: "contato_familia" | "visita" | "conselho_tutelar" | "ministerio_publico";
  rotulo: string;
  explicacao: string;
  feitaEm: string | null;
};

export function etapas(caso: CasoBuscaAtiva): Etapa[] {
  return [
    {
      chave: "contato_familia",
      rotulo: "Contato com a família",
      explicacao: "Telefonema ou recado registrado. É o primeiro dos recursos escolares que o ECA exige esgotar.",
      feitaEm: caso.contatoFamiliaEm,
    },
    {
      chave: "visita",
      rotulo: "Visita ou convocação",
      explicacao: "Visita domiciliar ou convocação formal dos responsáveis à escola.",
      feitaEm: caso.visitaEm,
    },
    {
      chave: "conselho_tutelar",
      rotulo: "Comunicação ao Conselho Tutelar",
      explicacao: "ECA, art. 56, II e LDB, art. 12, VIII. Obrigatória, e só depois dos recursos escolares.",
      feitaEm: caso.conselhoTutelarEm,
    },
    {
      chave: "ministerio_publico",
      rotulo: "Ciência ao Ministério Público",
      explicacao: "Quando o Conselho Tutelar não resolve e o aluno segue fora da escola.",
      feitaEm: caso.ministerioPublicoEm,
    },
  ];
}

export type LeituraCaso = {
  frequencia: number | null;
  situacaoFrequencia: SituacaoFrequencia;
  diasFora: number | null;
  /** O que fazer agora, em uma frase. */
  proximaAcao: string;
  /** Etapa que falta e já podia ter sido feita. */
  etapaPendente: Etapa["chave"] | null;
  /** Peso para ordenar casos — quem precisa de você primeiro. Fica interno. */
  peso: number;
  riscoBolsaFamilia: string | null;
};

/** Depois de tantos dias sem contato, a comunicação ao Conselho Tutelar já está atrasada. */
export const DIAS_PARA_CONSELHO = 15;

export function lerCaso(caso: CasoBuscaAtiva, hoje: Date = new Date()): LeituraCaso {
  const f = frequencia(caso.faltas, caso.aulasPeriodo);
  const situacaoFrequencia = situacaoDaFrequencia(caso.faltas, caso.aulasPeriodo);
  const diasFora = diasSemAparecer(caso.ultimaPresenca, hoje);
  const lista = etapas(caso);
  const feitas = lista.filter((e) => e.feitaEm !== null).length;

  let peso = 0;
  if (situacaoFrequencia === "reprovacao") peso += 30;
  else if (situacaoFrequencia === "atencao") peso += 12;
  if (diasFora !== null) peso += Math.min(30, diasFora);
  if (caso.bolsaFamilia) peso += 8;
  if (!emAndamento(caso.situacao)) peso = 0;

  let etapaPendente: Etapa["chave"] | null = null;
  let proximaAcao: string;

  if (!emAndamento(caso.situacao)) {
    proximaAcao =
      caso.situacao === "retornou"
        ? "Voltou para a sala. Vale conferir a frequência no próximo período: quem sai uma vez costuma sair de novo."
        : caso.situacao === "transferido"
          ? "Transferido com documento — o aluno está em outra escola, não fora dela."
          : "Caso encerrado.";
  } else if (caso.contatoFamiliaEm === null) {
    etapaPendente = "contato_familia";
    proximaAcao = "Ligar para a família hoje e registrar aqui. Sem esse primeiro contato registrado, a comunicação ao Conselho Tutelar fica frágil.";
  } else if (caso.visitaEm === null) {
    etapaPendente = "visita";
    proximaAcao = "Convocar os responsáveis ou fazer a visita domiciliar. É o segundo recurso escolar — e o que costuma trazer o aluno de volta.";
  } else if (caso.conselhoTutelarEm === null) {
    etapaPendente = "conselho_tutelar";
    peso += 25;
    proximaAcao =
      "Recursos escolares esgotados: comunicar o Conselho Tutelar agora (ECA, art. 56, II). O ofício sai pronto desta ficha, com o que já foi tentado.";
  } else if (caso.ministerioPublicoEm === null && diasFora !== null && diasFora >= 45) {
    etapaPendente = "ministerio_publico";
    peso += 15;
    proximaAcao = `O Conselho Tutelar foi comunicado e o aluno está há ${diasFora} dias fora. Dar ciência ao Ministério Público.`;
  } else {
    proximaAcao = `Aguardando retorno do Conselho Tutelar. ${feitas} de 4 etapas registradas — a escola já fez a parte dela, e isso está documentado.`;
  }

  // A comunicação atrasada é um achado por si só.
  if (etapaPendente !== "conselho_tutelar" && caso.conselhoTutelarEm === null && diasFora !== null && diasFora >= DIAS_PARA_CONSELHO) {
    peso += 20;
  }

  const riscoBolsaFamilia =
    caso.bolsaFamilia && f !== null
      ? f < exigenciaBolsaFamilia(caso.idade)
        ? `Beneficiário do Bolsa Família com ${arredondar(f)}% de frequência, abaixo dos ${exigenciaBolsaFamilia(caso.idade)}% exigidos para a idade. A família entra em descumprimento de condicionalidade — e quem informa a frequência é a escola.`
        : `Beneficiário do Bolsa Família, hoje dentro dos ${exigenciaBolsaFamilia(caso.idade)}% exigidos para a idade.`
      : null;

  return { frequencia: f, situacaoFrequencia, diasFora, proximaAcao, etapaPendente, peso, riscoBolsaFamilia };
}

function arredondar(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

// ── O OFÍCIO AO CONSELHO TUTELAR ──
//
// O documento que a escola quase nunca faz, e que é exatamente o que o
// Ministério Público cobra. Sai do que já está registrado: quem é o aluno,
// quanto faltou, e o que a escola tentou antes — com data.

export type DadosOficio = {
  caso: CasoBuscaAtiva;
  escola: string;
  municipio: string;
  estado: string;
  numero: string;
};

export function textoOficioConselhoTutelar(d: DadosOficio, hoje: Date = new Date()): string {
  const { caso } = d;
  const f = frequencia(caso.faltas, caso.aulasPeriodo);
  const data = hoje.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const feitas = etapas(caso).filter((e) => e.feitaEm !== null);

  const tentativas = feitas
    .map((e) => `— ${e.rotulo}, em ${formatarData(e.feitaEm!)}.`)
    .join("\n");

  return [
    `OFÍCIO Nº ${d.numero}`,
    "",
    `${d.municipio} (${d.estado}), ${data}.`,
    "",
    "Ao Conselho Tutelar",
    `${d.municipio} — ${d.estado}`,
    "",
    `Assunto: comunicação de infrequência escolar — ${caso.alunoNome}`,
    "",
    "Senhores Conselheiros,",
    "",
    `Comunicamos, na forma do art. 56, inciso II, da Lei nº 8.069/1990 (Estatuto da Criança e do Adolescente), e do art. 12, inciso VIII, da Lei nº 9.394/1996 (LDB), a situação de infrequência escolar do(a) aluno(a) ${caso.alunoNome}${caso.alunoTurma ? `, matriculado(a) na turma ${caso.alunoTurma}` : ""}, da ${d.escola}.`,
    "",
    `No período de referência (${caso.periodo}), o(a) aluno(a) registra ${caso.faltas} falta(s) em ${caso.aulasPeriodo} aula(s) previstas${f !== null ? `, o que corresponde a ${arredondar(f)}% de frequência — abaixo do mínimo de ${FREQUENCIA_MINIMA_LDB}% exigido pelo art. 24, inciso VI, da LDB` : ""}.${caso.ultimaPresenca ? ` A última presença registrada foi em ${formatarData(caso.ultimaPresenca)}.` : ""}`,
    "",
    "Informamos que foram esgotados os recursos escolares disponíveis, conforme registro:",
    tentativas || "— (nenhuma tentativa registrada)",
    "",
    "Diante do exposto, encaminhamos o caso a este Conselho Tutelar para as providências cabíveis, permanecendo a escola à disposição para prestar as informações complementares necessárias e para receber o(a) aluno(a) tão logo seja possível seu retorno.",
    "",
    "Atenciosamente,",
    "",
    "",
    "_______________________________________",
    `Direção — ${d.escola}`,
  ].join("\n");
}

function formatarData(iso: string): string {
  const so = iso.slice(0, 10);
  const [a, m, d] = so.split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

/** Número do ofício a partir do id e do ano — previsível e sem colidir. */
export function numeroDoOficio(id: string, hoje: Date = new Date()): string {
  const sufixo = id.replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `${sufixo}/${hoje.getUTCFullYear()}`;
}
