import { diasAbertaEscola, rotuloOcorrenciaEscola, aulasPerdidas, lerCalendario, DIAS_LETIVOS_LDB } from "@/lib/ocorrencias-escola";
import { censoVelho, censoMaisRecenteDisponivel, ROTULO_DEPENDENCIA } from "@/lib/censo-escolar";
import { diasDeAula, situacaoDoItemMerenda, contagemVelhaMerenda } from "@/lib/merenda";
import { lerCaso, emAndamento, DIAS_PARA_CONSELHO, FREQUENCIA_MINIMA_LDB, type CasoBuscaAtiva } from "@/lib/busca-ativa";

// ── A LEITURA AUTOMÁTICA DE UMA ESCOLA ──
//
// Junta o que o sistema sabe de cada escola — cadastro no Censo Escolar,
// ocorrências abertas, dias de aula perdidos, matrícula declarada contra a
// matrícula de hoje, o que o cidadão disse na ouvidoria — e devolve, por
// regra, o que mais importa agora e o que fazer.
//
// Sem modelo, sem rede: cada frase é explicável ao Tribunal de Contas e ao
// Ministério Público, que é quem cobra educação de prefeito.
//
// A pontuação serve para ORDENAR escolas (qual precisa de você primeiro),
// não para virar nota. Fica interna.

export type AchadoEscola = {
  gravidade: "urgente" | "atencao" | "info";
  titulo: string;
  detalhe: string;
  acao: string;
  peso: number;
  fonte: "censo" | "ocorrencia" | "calendario" | "matricula" | "merenda" | "busca_ativa" | "ouvidoria" | "cadastro";
};

export type LeituraEscola = {
  situacao: "urgente" | "atencao" | "normal";
  achados: AchadoEscola[];
  /** Uma frase pronta para a lista da secretaria. */
  resumo: string;
  peso: number;
};

export type EntradaLeituraEscola = {
  escola: {
    nome: string;
    situacao: "ativa" | "paralisada" | "extinta" | null;
    dependencia: string | null;
    origem: string;
    censoAno: number | null;
    /** Matrícula declarada ao Censo Escolar — é ela que o FUNDEB paga. */
    matriculasCenso: number | null;
    /** Alunos que a escola diz ter hoje. */
    matriculasAtuais: number | null;
    diasPrevistos: number | null;
  };
  ocorrenciasAbertas: { tipo: string; gravidade: string; descricao: string; aulasPerdidas: number | null; createdAt: string }[];
  /** Todas as do ano letivo, abertas ou resolvidas — dia perdido não volta quando a ocorrência fecha. */
  ocorrenciasDoAno: { tipo: string; aulasPerdidas: number | null }[];
  /** O que tem na cozinha: saldo e consumo por dia de aula. */
  merenda?: { item: string; saldo: number; consumoDiario: number; atualizadoEm: string }[];
  /** Casos de busca ativa desta escola. */
  buscaAtiva?: CasoBuscaAtiva[];
  /** Manifestações da ouvidoria dos últimos 30 dias que citam a escola. */
  mencoesOuvidoria: { tipo: string; assunto: string; createdAt: string }[];
};

/** Diferença de matrícula a partir da qual vale avisar — abaixo disso é rotatividade normal. */
export const DIFERENCA_MATRICULA_RELEVANTE = 5;

export function lerEscola(e: EntradaLeituraEscola, hoje: Date = new Date()): LeituraEscola {
  const achados: AchadoEscola[] = [];
  const s = e.escola;

  // ── cadastro no Censo ──
  if (s.situacao === "paralisada") {
    achados.push({
      gravidade: "urgente",
      titulo: "Escola paralisada no Censo Escolar",
      detalhe:
        "Escola paralisada não recebe recurso por matrícula e não conta no FUNDEB. Se o prédio está funcionando, o cadastro está errado; se está fechado, os alunos precisam de destino.",
      acao: "Confirmar com a direção se a escola funciona e acertar a situação no próximo Censo; se está fechada, registrar para onde os alunos foram.",
      peso: 40,
      fonte: "censo",
    });
  }
  if (censoVelho(s.censoAno, hoje)) {
    const disponivel = censoMaisRecenteDisponivel(hoje);
    achados.push({
      gravidade: "atencao",
      titulo: `Cadastro do Censo de ${s.censoAno} — já saiu o de ${disponivel}`,
      detalhe:
        "A rede aqui descreve o retrato de um ano que já passou. Escola que abriu, fechou ou mudou de etapa não aparece.",
      acao: `Exportar de novo o Catálogo de Escolas do INEP com o Censo de ${disponivel} e reimportar a rede.`,
      peso: 12,
      fonte: "censo",
    });
  }

  // ── matrícula declarada x matrícula real ──
  // É aqui que mora dinheiro. O FUNDEB paga por aluno declarado ao Censo
  // Escolar do ano anterior. Aluno que a escola tem e não declarou é
  // repasse que o município perde o ano inteiro; aluno declarado que não
  // existe mais é glosa na auditoria.
  if (s.matriculasCenso !== null && s.matriculasAtuais !== null) {
    const diferenca = s.matriculasAtuais - s.matriculasCenso;
    if (diferenca >= DIFERENCA_MATRICULA_RELEVANTE) {
      achados.push({
        gravidade: "atencao",
        titulo: `${diferenca} aluno(s) a mais do que o Censo declara`,
        detalhe: `A escola tem ${s.matriculasAtuais} alunos hoje e declarou ${s.matriculasCenso} ao Censo de ${s.censoAno ?? "—"}. O FUNDEB paga pelo que está declarado: esses alunos estão sendo atendidos sem entrar na conta do repasse.`,
        acao: "Garantir que esses alunos entrem no próximo Censo Escolar — o prazo de retificação é o único momento de corrigir isso no ano.",
        peso: 22,
        fonte: "matricula",
      });
    } else if (diferenca <= -DIFERENCA_MATRICULA_RELEVANTE) {
      achados.push({
        gravidade: "atencao",
        titulo: `${-diferenca} aluno(s) a menos do que o Censo declara`,
        detalhe: `Declarou ${s.matriculasCenso} ao Censo de ${s.censoAno ?? "—"} e tem ${s.matriculasAtuais} hoje. Ou os alunos saíram (e viraram caso de busca ativa), ou a declaração está acima do real — e declaração acima do real é glosa na auditoria do FNDE.`,
        acao: "Conferir aluno por aluno quem saiu: transferência tem documento, evasão vira busca ativa.",
        peso: 25,
        fonte: "matricula",
      });
    }
  }

  // ── ocorrências abertas ──
  const urgentes = e.ocorrenciasAbertas.filter((o) => o.gravidade === "urgente");
  for (const o of urgentes) {
    const d = diasAbertaEscola(o.createdAt, hoje);
    achados.push({
      gravidade: d >= 2 ? "urgente" : "atencao",
      titulo: `${rotuloOcorrenciaEscola(o.tipo)} — urgente há ${d} dia(s)`,
      detalhe: o.descricao,
      acao: acaoPorTipo(o.tipo),
      peso: d >= 2 ? 35 : 20,
      fonte: "ocorrencia",
    });
  }
  const atencoes = e.ocorrenciasAbertas.filter((o) => o.gravidade !== "urgente");
  if (atencoes.length >= 3) {
    achados.push({
      gravidade: "atencao",
      titulo: `${atencoes.length} ocorrências de atenção abertas`,
      detalhe: atencoes.slice(0, 3).map((o) => rotuloOcorrenciaEscola(o.tipo)).join(", ") + (atencoes.length > 3 ? "…" : ""),
      acao: "Acumular pendência é sinal de que ninguém está fechando o ciclo: revisar com a direção o que já foi resolvido.",
      peso: 10,
      fonte: "ocorrencia",
    });
  }

  // ── calendário letivo ──
  const perdidos = aulasPerdidas(e.ocorrenciasDoAno);
  const calendario = lerCalendario(perdidos, s.diasPrevistos ?? DIAS_LETIVOS_LDB);
  if (calendario.situacao === "estourado") {
    achados.push({
      gravidade: "urgente",
      titulo: `Abaixo dos ${DIAS_LETIVOS_LDB} dias letivos`,
      detalhe: calendario.frase + " A LDB (art. 24) não abre exceção por ônibus quebrado nem por falta de professor.",
      acao: "Montar agora o calendário de reposição: sábado letivo ou ampliação de jornada, aprovado em ata, antes de dezembro.",
      peso: 32,
      fonte: "calendario",
    });
  } else if (calendario.situacao === "atencao") {
    achados.push({
      gravidade: "atencao",
      titulo: `Calendário sem folga: ${perdidos} dia(s) perdidos`,
      detalhe: calendario.frase,
      acao: "Qualquer dia parado a partir daqui já obriga reposição. Vale antecipar o plano.",
      peso: 14,
      fonte: "calendario",
    });
  }

  // ── merenda ──
  // Refeição na escola é direito do aluno (Lei 11.947/2009): item zerado
  // com consumo registrado não é aviso de almoxarifado, é criança sem comer.
  const merenda = e.merenda ?? [];
  const acabou = merenda.filter((l) => situacaoDoItemMerenda(l.saldo, l.consumoDiario) === "falta");
  const acabando = merenda.filter((l) => situacaoDoItemMerenda(l.saldo, l.consumoDiario) === "critico");
  if (acabou.length > 0) {
    achados.push({
      gravidade: "urgente",
      titulo: `Acabou na cozinha: ${acabou.map((l) => l.item).join(", ")}`,
      detalhe: "Saldo zero em item com consumo registrado. A refeição do aluno é obrigação do município, não cortesia.",
      acao: "Remanejar de outra escola hoje e incluir no pedido da merenda.",
      peso: 30,
      fonte: "merenda",
    });
  }
  if (acabando.length > 0) {
    achados.push({
      gravidade: "atencao",
      titulo: `Acaba esta semana: ${acabando.map((l) => `${l.item} (${diasDeAula(l.saldo, l.consumoDiario)} dia(s) de aula)`).join(", ")}`,
      detalhe: "Menos de uma semana letiva de cobertura pelo consumo informado.",
      acao: "Gerar o pedido da merenda agora; a entrega leva mais que isso.",
      peso: 15,
      fonte: "merenda",
    });
  }
  const contagensVelhas = merenda.filter((l) => contagemVelhaMerenda(l.atualizadoEm, hoje));
  if (merenda.length > 0 && contagensVelhas.length === merenda.length) {
    achados.push({
      gravidade: "info",
      titulo: "Cozinha sem contagem há mais de duas semanas",
      detalhe: "Os dias de cobertura acima partem de uma contagem velha, e alimento gira rápido.",
      acao: "Pedir à escola uma contagem nova — leva dez minutos e evita criança sem almoço.",
      peso: 5,
      fonte: "merenda",
    });
  }

  // ── busca ativa ──
  // Criança fora da escola é o problema mais caro da educação municipal, e
  // o único em que a omissão do município tem nome no ECA.
  const casos = (e.buscaAtiva ?? []).filter((c) => emAndamento(c.situacao));
  const semConselho = casos.filter((c) => {
    const l = lerCaso(c, hoje);
    return c.conselhoTutelarEm === null && l.diasFora !== null && l.diasFora >= DIAS_PARA_CONSELHO;
  });
  const reprovando = casos.filter((c) => lerCaso(c, hoje).situacaoFrequencia === "reprovacao");
  if (semConselho.length > 0) {
    achados.push({
      gravidade: "urgente",
      titulo: `${semConselho.length} aluno(s) fora há mais de ${DIAS_PARA_CONSELHO} dias sem comunicação ao Conselho Tutelar`,
      detalhe:
        "O ECA (art. 56, II) obriga a escola a comunicar a reiteração de faltas e a evasão, esgotados os recursos escolares. A omissão é do município, não da família.",
      acao: "Abrir a ficha, registrar o que já foi tentado e gerar o ofício ao Conselho Tutelar — ele sai pronto do que está lançado.",
      peso: 34,
      fonte: "busca_ativa",
    });
  }
  if (reprovando.length > 0) {
    achados.push({
      gravidade: "atencao",
      titulo: `${reprovando.length} aluno(s) já abaixo dos ${FREQUENCIA_MINIMA_LDB}% de frequência`,
      detalhe: "Abaixo do mínimo da LDB (art. 24, VI) o aluno reprova por falta, mesmo aprendendo.",
      acao: "Priorizar esses casos na busca ativa: quanto mais tempo fora, menor a chance de voltar.",
      peso: 18,
      fonte: "busca_ativa",
    });
  } else if (casos.length > 0) {
    achados.push({
      gravidade: "info",
      titulo: `${casos.length} caso(s) de busca ativa em andamento`,
      detalhe: "Alunos faltando, ainda dentro do mínimo de frequência.",
      acao: "Seguir as etapas da ficha enquanto dá para trazer de volta sem perder o ano.",
      peso: 6,
      fonte: "busca_ativa",
    });
  }

  // ── ouvidoria ──
  if (e.mencoesOuvidoria.length >= 3) {
    achados.push({
      gravidade: "atencao",
      titulo: `${e.mencoesOuvidoria.length} manifestações do cidadão citam esta escola em 30 dias`,
      detalhe: e.mencoesOuvidoria.slice(0, 3).map((m) => `"${m.assunto}"`).join(", "),
      acao: "Ler as manifestações na Ouvidoria e comparar com as ocorrências registradas: se o pai reclama do que a direção não registrou, a ficha está incompleta.",
      peso: 12,
      fonte: "ouvidoria",
    });
  } else if (e.mencoesOuvidoria.length > 0) {
    achados.push({
      gravidade: "info",
      titulo: `${e.mencoesOuvidoria.length} manifestação(ões) do cidadão citam esta escola em 30 dias`,
      detalhe: e.mencoesOuvidoria.map((m) => `"${m.assunto}"`).join(", "),
      acao: "Conferir na Ouvidoria se já foi respondida.",
      peso: 3,
      fonte: "ouvidoria",
    });
  }

  // ── cadastro incompleto (só informativo) ──
  if (s.origem === "manual") {
    achados.push({
      gravidade: "info",
      titulo: "Cadastrada à mão, sem código INEP",
      detalhe: "Sem código INEP a escola não cruza com Censo Escolar, FUNDEB, PNAE nem IDEB.",
      acao: "Se a escola existe no Censo, importe o arquivo do INEP para ela ganhar código e matrícula declarada.",
      peso: 2,
      fonte: "cadastro",
    });
  }
  if (s.matriculasAtuais === null) {
    achados.push({
      gravidade: "info",
      titulo: "Sem matrícula atual informada",
      detalhe: "Sem o número de hoje não dá para comparar com o que foi declarado ao Censo — e é essa diferença que vira dinheiro no FUNDEB.",
      acao: "Pedir à direção o número de alunos matriculados hoje.",
      peso: 4,
      fonte: "matricula",
    });
  }

  const ordem = { urgente: 0, atencao: 1, info: 2 } as const;
  achados.sort((a, b) => ordem[a.gravidade] - ordem[b.gravidade] || b.peso - a.peso);
  const peso = achados.reduce((s_, a) => s_ + a.peso, 0);
  const situacao = achados.some((a) => a.gravidade === "urgente")
    ? "urgente"
    : achados.some((a) => a.gravidade === "atencao")
      ? "atencao"
      : "normal";
  const principal = achados[0];
  const resumo = principal
    ? `${principal.titulo}. ${principal.acao}`
    : "Sem pendência registrada. Cadastro em dia, nenhuma ocorrência aberta, calendário letivo com folga.";
  return { situacao, achados, resumo, peso };
}

function acaoPorTipo(tipo: string): string {
  switch (tipo) {
    case "sem_professor":
      return "Acionar o substituto hoje; se não houver quadro de reserva, remanejar de outra escola e avisar as famílias antes do horário.";
    case "turma_dispensada":
      return "Registrar quantos dias a turma perdeu e marcar a reposição agora, enquanto ainda cabe no calendário.";
    case "falta_merenda":
      return "Remanejar item de outra escola hoje — refeição é direito do aluno (Lei 11.947/2009) — e incluir no próximo pedido.";
    case "transporte":
      return "Cobrir a rota com outro veículo no mesmo dia; aluno que não chega falta, e falta demais vira evasão.";
    case "estrutura":
      return "Abrir chamado de manutenção com prazo. Sem água ou sem banheiro a escola não pode funcionar.";
    case "seguranca":
      return "Registrar o boletim de ocorrência, acionar a guarda municipal e comunicar o Conselho Tutelar quando envolver aluno.";
    case "infrequencia":
      return "Abrir a busca ativa: contato com a família e, persistindo, comunicação ao Conselho Tutelar (ECA, art. 56).";
    default:
      return "Resolver na origem e registrar como resolvida na ficha.";
  }
}

/** Manifestações que citam a escola pelo nome (ou pelo apelido: "Escola Municipal João Alves" ↔ "escola do João Alves"). */
export function mencionaEscola(texto: string, nomeEscola: string): boolean {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  const t = norm(texto);
  const n = norm(nomeEscola);
  if (t.includes(n)) return true;
  const semPrefixo = n
    .replace(/^(emeif|emef|emei|eeief|escola municipal de ensino fundamental|escola municipal|escola estadual|escola|creche municipal|creche|centro de educacao infantil|cei|cmei)\s+/i, "")
    .trim();
  return semPrefixo.length >= 5 && t.includes(semPrefixo);
}

export { ROTULO_DEPENDENCIA };
