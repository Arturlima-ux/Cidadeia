import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  buscarPrefeitura,
  buscarUltimoSnapshot,
  buscarHistoricoSnapshots,
  buscarAlertas,
  buscarSistemasConectados,
} from "@/lib/dados-prefeitura";
import { buscarUnidadesSaude, buscarUltimoIndicadorSaude } from "@/app/dashboard/secretarias/saude/actions";
import { buscarEscolas, buscarUltimoIndicadorEducacao } from "@/app/dashboard/secretarias/educacao/actions";
import { buscarObras } from "@/app/dashboard/secretarias/obras/actions";
import { buscarLicitacoes } from "@/app/dashboard/secretarias/licitacoes/actions";
import { planosContratadosDe, type PlanoAddon } from "@/lib/planos";
import { projetarProximoPeriodo } from "@/lib/projecao";
import { montarEficacia } from "@/lib/montar-eficacia";
import {
  detectarLicitacoesVencendo,
  detectarObrasParadas,
  detectarIndicadorDesatualizado,
  detectarSaldoNegativo,
  detectarMinimoConstitucional,
  detectarPrazoAtendimento,
  type DeteccaoAutomatica,
} from "@/lib/deteccao-automatica";
import { provedorIA, ESFORCO_PADRAO, MODELO_ANTHROPIC_PADRAO } from "@/lib/provedor-ia";
import { analisarModulo, textoAnalise, type DadosAnalise } from "@/lib/analise-local";
import { MINIMOS, avaliarMinimo } from "@/lib/minimos-constitucionais";
import { montarPainelPrazos } from "@/lib/prazo-atendimento";
import { db } from "@/db";
import { basesMinimos, atendimentos } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type MensagemChat = { papel: "user" | "assistant"; texto: string };

export type RespostaIA =
  | { ok: true; texto: string }
  | { ok: false; erro: string };

function formatarMoeda(v: number | null | undefined) {
  if (v === null || v === undefined) return "não informado";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Monta o contexto real da prefeitura (nada inventado) para a IA usar como
 * base. Se um dado não existir no banco, isso é dito explicitamente à IA
 * como "não informado" — a instrução no system prompt proíbe a IA de
 * preencher lacunas com números plausíveis.
 */
export async function montarContexto(
  prefeituraId: string,
  restricaoCargo?: { cargo: string; secretaria?: string | null }
): Promise<string> {
  const [
    prefeitura,
    snapshot,
    historicoSnapshots,
    listaAlertas,
    sistemas,
    unidadesSaude,
    indicadorSaude,
    escolas,
    indicadorEducacao,
    listaObras,
    listaLicitacoes,
  ] = await Promise.all([
    buscarPrefeitura(prefeituraId),
    buscarUltimoSnapshot(prefeituraId),
    buscarHistoricoSnapshots(prefeituraId),
    buscarAlertas(prefeituraId),
    buscarSistemasConectados(prefeituraId),
    buscarUnidadesSaude(prefeituraId),
    buscarUltimoIndicadorSaude(prefeituraId),
    buscarEscolas(prefeituraId),
    buscarUltimoIndicadorEducacao(prefeituraId),
    buscarObras(prefeituraId),
    buscarLicitacoes(prefeituraId),
  ]);

  const abertos = listaAlertas.filter((a) => !a.resolvido);
  const resolvidos = listaAlertas.filter((a) => a.resolvido);

  const sistemasConectadosDeFato = sistemas.filter((s) => s.status === "conectado");

  const obrasAtrasadas = listaObras.filter(
    (o) => o.status !== "concluida" && o.progressoAtual < o.progressoEsperado - 10
  );
  const licitacoesComRisco = listaLicitacoes.filter((l) => l.observacaoRisco);

  // Um usuário com cargo "secretario" só pode ver os dados da própria
  // secretaria — nunca o financeiro geral nem as outras secretarias. Isso
  // é reforçado aqui no contexto, não só na navegação, porque a IA não deve
  // ter acesso a mais dados do que a pessoa que está perguntando.
  const ehSecretario = restricaoCargo?.cargo === "secretario";
  const minhaSecretaria = restricaoCargo?.secretaria;
  const planosAtivos = planosContratadosDe(prefeitura?.planosContratados);
  const temGestao = planosAtivos.includes("gestao");

  const secaoFinanceira = ehSecretario
    ? "Indicadores financeiros: acesso restrito — este usuário é secretário(a) e só vê dados da própria secretaria, não o financeiro geral da prefeitura."
    : !temGestao
    ? "Indicadores financeiros: indisponíveis — a prefeitura não contratou o plano Gestão, que é quem libera a visão financeira geral."
    : `Indicadores financeiros (${snapshot ? "última atualização: " + snapshot.atualizadoEm : "NENHUM indicador registrado ainda"}):
${
  snapshot
    ? `- Receita: ${formatarMoeda(snapshot.receita)}
- Despesas: ${formatarMoeda(snapshot.despesas)}
- Saldo: ${formatarMoeda(snapshot.saldo)}
- Índice de Transparência: ${snapshot.indiceTransparencia ?? "não informado"}%
- Origem dos dados: ${snapshot.origem === "manual" ? "inserido manualmente pelo usuário (ainda sem integração automática)" : "integração automática"}`
    : "Nenhum indicador financeiro foi registrado ainda pela prefeitura."
}
${(() => {
  const proj = projetarProximoPeriodo(
    historicoSnapshots.map((s) => ({ data: s.atualizadoEm, valor: s.saldo }))
  );
  if (!proj) return "Projeção de saldo: indisponível (precisa de pelo menos 3 registros históricos reais para calcular).";
  return `Projeção de saldo (~30 dias à frente, ${proj.confianca === "baixa" ? "confiança BAIXA" : "confiança " + proj.confianca}): ${formatarMoeda(proj.valorProjetado)}. IMPORTANTE: isto é uma regressão linear simples sobre o histórico real (${proj.baseadoEmRegistros} registros) — não é um modelo de IA nem um "gêmeo digital", não considera sazonalidade nem eventos externos. Sempre que mencionar isso ao usuário, deixe claro que é uma estimativa estatística simples, não uma previsão validada.`;
})()}`;

  const secaoAlertas = ehSecretario
    ? "Alertas: acesso restrito — este usuário só vê alertas da própria secretaria (funcionalidade de filtro por secretaria ainda não implementada nos alertas gerais)."
    : !temGestao
    ? "Alertas: indisponíveis — a prefeitura não contratou o plano Gestão."
    : `Alertas em aberto (${abertos.length}):
${
  abertos.length > 0
    ? abertos
        .map(
          (a) =>
            `- [${a.prioridade}] ${a.titulo}${a.secretaria ? " (Secretaria: " + a.secretaria + ")" : ""}${a.descricao ? " — " + a.descricao : ""}`
        )
        .join("\n")
    : "Nenhum alerta em aberto."
}
Alertas já resolvidos: ${resolvidos.length}`;

  const mostrarSaude = planosAtivos.includes("saude") && (!ehSecretario || minhaSecretaria === "saude");
  const mostrarEducacao = planosAtivos.includes("educacao") && (!ehSecretario || minhaSecretaria === "educacao");
  const mostrarObras = planosAtivos.includes("obras") && (!ehSecretario || minhaSecretaria === "obras");
  const mostrarLicitacoes = planosAtivos.includes("licitacoes") && (!ehSecretario || minhaSecretaria === "licitacoes");

  const secaoSaude = mostrarSaude
    ? `
SAÚDE:
${
  indicadorSaude
    ? `- Tempo médio de atendimento: ${indicadorSaude.tempoMedioAtendimentoMin ?? "não informado"} min
- Médicos ativos: ${indicadorSaude.medicosAtivos ?? "não informado"}
- Faltas: ${indicadorSaude.faltasPercentual ?? "não informado"}%
- Estoque de medicamentos: ${indicadorSaude.estoqueMedicamentosPercentual ?? "não informado"}%`
    : "Nenhum indicador de saúde registrado ainda."
}
Unidades de saúde cadastradas (${unidadesSaude.length}): ${
        unidadesSaude.length > 0
          ? unidadesSaude.map((u) => `${u.nome} (${u.tipo}${u.bairro ? ", " + u.bairro : ""})`).join("; ")
          : "nenhuma"
      }`
    : !ehSecretario && !planosAtivos.includes("saude")
    ? "\nSAÚDE: plano não contratado por esta prefeitura."
    : "";

  const secaoEducacao = mostrarEducacao
    ? `
EDUCAÇÃO:
${
  indicadorEducacao
    ? `- Frequência: ${indicadorEducacao.frequenciaPercentual ?? "não informado"}%
- Nota média: ${indicadorEducacao.notaMedia ?? "não informado"}
- Alunos no transporte escolar: ${indicadorEducacao.alunosTransporte ?? "não informado"}
- Professores ativos: ${indicadorEducacao.professoresAtivos ?? "não informado"}`
    : "Nenhum indicador de educação registrado ainda."
}
Escolas cadastradas (${escolas.length}): ${
        escolas.length > 0
          ? escolas
              .map((e) => `${e.nome}${e.evasaoPercentual !== null ? ` (evasão ${e.evasaoPercentual}%)` : ""}`)
              .join("; ")
          : "nenhuma"
      }`
    : !ehSecretario && !planosAtivos.includes("educacao")
    ? "\nEDUCAÇÃO: plano não contratado por esta prefeitura."
    : "";

  const secaoObras = mostrarObras
    ? `
OBRAS (${listaObras.length} cadastradas):
${
  listaObras.length > 0
    ? listaObras
        .map((o) => `- ${o.nome}: ${o.progressoAtual}% concluído (esperado ${o.progressoEsperado}%), status: ${o.status}`)
        .join("\n")
    : "Nenhuma obra cadastrada ainda."
}
Obras com progresso abaixo do esperado: ${obrasAtrasadas.length > 0 ? obrasAtrasadas.map((o) => o.nome).join(", ") : "nenhuma"}`
    : !ehSecretario && !planosAtivos.includes("obras")
    ? "\nOBRAS: plano não contratado por esta prefeitura."
    : "";

  const secaoLicitacoes = mostrarLicitacoes
    ? `
LICITAÇÕES (${listaLicitacoes.length} cadastradas):
${
  listaLicitacoes.length > 0
    ? listaLicitacoes
        .map((l) => `- ${l.numero} (${l.objeto}): status ${l.status}${l.observacaoRisco ? ", risco: " + l.observacaoRisco : ""}`)
        .join("\n")
    : "Nenhuma licitação cadastrada ainda."
}
Processos com observação de risco: ${licitacoesComRisco.length > 0 ? licitacoesComRisco.map((l) => l.numero).join(", ") : "nenhum"}`
    : !ehSecretario && !planosAtivos.includes("licitacoes")
    ? "\nLICITAÇÕES: plano não contratado por esta prefeitura."
    : "";

  const avisoEscopo = ehSecretario
    ? `\nATENÇÃO: quem está perguntando é secretário(a) de ${minhaSecretaria ?? "uma secretaria"}. Responda apenas sobre a área dele(a). Se perguntarem sobre outra secretaria, financeiro geral ou dados de outra área, diga que isso não está disponível para o perfil dele(a).`
    : "";

  // Investimento × resultado por secretaria — só pra quem tem visão geral
  // (prefeito/admin com plano Gestão). Já vem calculado e ordenado do pior
  // pro melhor, então a IA não precisa refazer a conta (e não pode errar).
  let secaoEficacia = "";
  if (!ehSecretario && temGestao) {
    try {
      const analise = await montarEficacia(prefeituraId, prefeitura?.planosContratados);
      if (analise.length > 0) {
        const LABEL: Record<string, string> = {
          critico: "RESULTADO ABAIXO DO ESPERADO",
          atencao: "requer atenção",
          ok: "dentro do esperado",
          sem_dados: "sem dados suficientes para julgar",
        };
        secaoEficacia = `
INVESTIMENTO × RESULTADO POR SECRETARIA (ordenado do pior para o melhor):
${analise
  .map((s) => {
    const risco = s.sinais.reduce((a, x) => a + (x.valorEmRisco ?? 0), 0);
    return `- ${s.nome}: investido ${formatarMoeda(s.investimento)}${
      s.origemInvestimento.length > 0 ? ` (fonte: ${s.origemInvestimento.join(" + ")})` : ""
    } — situação: ${LABEL[s.situacao]}. ${s.resultado}${
      risco > 0 ? ` Valor em risco: ${formatarMoeda(risco)}.` : ""
    }${s.sinais.length > 0 ? `\n  Sinais: ${s.sinais.map((x) => x.texto).join(" | ")}` : ""}`;
  })
  .join("\n")}
IMPORTANTE sobre esta seção: o julgamento de resultado compara o registro mais
recente com o ANTERIOR do próprio município — não existe comparação com média
nacional ou meta oficial, porque esses dados não estão conectados. Nunca
apresente isso como "abaixo da média do país".
IMPORTANTE 2: "investimento" aqui é SEMPRE o orçamento público que a prefeitura
aplicou na cidade (contratos de obra, compras públicas, custeio, folha,
programas). NUNCA é o valor que a prefeitura paga pela assinatura da CidadeIA —
esse dado nem existe no sistema. Se perguntarem sobre custo da plataforma, diga
que isso não está cadastrado aqui.`;
      }
    } catch (e) {
      console.error("[IA] falha ao montar análise de eficácia:", e);
    }
  }

  return `
DADOS REAIS DA PREFEITURA (fonte: banco de dados da CidadeIA — não fabrique
nenhum número que não esteja aqui):

Prefeitura: ${prefeitura?.nome ?? "não informado"}
Município/UF: ${prefeitura?.municipio ?? "?"} / ${prefeitura?.estado ?? "?"}
${!ehSecretario ? `Prefeito(a): ${prefeitura?.prefeito ?? "não informado"}\nPopulação: ${prefeitura?.populacao ?? "não informado"}\nPlanos contratados: ${planosAtivos.length > 0 ? planosAtivos.join(", ") : "NENHUM módulo contratado ainda"}\nMaior problema declarado no cadastro: ${prefeitura?.maiorProblema ?? "não informado"}` : ""}

${secaoFinanceira}

${secaoAlertas}
${secaoSaude}
${secaoEducacao}
${secaoObras}
${secaoLicitacoes}
${secaoEficacia}

Sistemas com integração real ativa: ${
    sistemasConectadosDeFato.length > 0
      ? sistemasConectadosDeFato.map((s) => s.sistema).join(", ")
      : "NENHUM — todas as integrações (E-SUS, SIAFI, Receita, TCE etc.) ainda estão pendentes de configuração. Você não tem acesso a dados desses sistemas além do que a prefeitura cadastrou manualmente aqui."
  }
${avisoEscopo}
`.trim();
}

const SYSTEM_PROMPT_BASE = `Você é a IA Central da CidadeIA, uma assistente analítica para gestores
públicos municipais brasileiros (prefeito, secretários).

REGRAS OBRIGATÓRIAS:
1. Use APENAS os dados fornecidos no contexto abaixo. Nunca invente números,
   estatísticas, nomes de pessoas, contratos ou eventos que não estejam
   explicitamente no contexto.
2. Se a pergunta exigir um dado que não está disponível (ex: dados de saúde,
   educação, licitações específicas, quando a integração correspondente não
   está ativa), diga claramente que esse dado ainda não está conectado ao
   sistema — não tente adivinhar ou estimar.
3. Responda em português do Brasil, de forma direta e objetiva, como um
   analista sênior falando com um gestor ocupado. Evite floreios.
4. Quando fizer sentido, sugira uma ação concreta baseada apenas no que os
   dados reais mostram.
5. Nunca se refira a si mesma na terceira pessoa nem descreva o que "a IA
   faria" — responda diretamente à pergunta.
6. Se o contexto trouxer uma "Projeção de saldo", trate-a estritamente como
   o que ela é: uma regressão linear simples sobre o histórico real, não uma
   previsão de IA nem um "gêmeo digital". Nunca a apresente com mais
   confiança do que o rótulo indicado (baixa/média/alta), e sempre deixe
   claro que é uma estimativa estatística de curtíssimo prazo, não um
   modelo validado.`;

export async function perguntarIA(
  prefeituraId: string,
  historico: MensagemChat[],
  novaPergunta: string,
  restricaoCargo?: { cargo: string; secretaria?: string | null }
): Promise<RespostaIA> {
  // O chat é a única das três chamadas que NÃO tem substituto determinístico:
  // pergunta aberta sobre os próprios dados é exatamente o que regra não faz.
  // Aqui a mensagem de erro precisa ser útil, e não um traceback disfarçado.
  const provedor = provedorIA();
  if (provedor.nome === "nenhum") {
    return {
      ok: false,
      erro:
        "A Central de IA ainda não está configurada neste ambiente. Enquanto isso, os painéis de cada secretaria continuam trazendo a análise automática, que não depende de IA.",
    };
  }

  let contexto: string;
  try {
    contexto = await montarContexto(prefeituraId, restricaoCargo);
  } catch (e) {
    console.error("[IA Central] falha ao montar contexto:", e);
    return {
      ok: false,
      erro: "Não foi possível carregar os dados da prefeitura para responder agora.",
    };
  }

  return provedor.conversar({
    sistema: `${SYSTEM_PROMPT_BASE}\n\n${contexto}`,
    maxTokens: 800,
    esforco: ESFORCO_PADRAO.chat,
    mensagens: [...historico, { papel: "user", texto: novaPergunta }],
  });
}

/**
 * Carrega, no escopo que o usuário pode ver, os dados brutos que a análise
 * determinística de lib/analise-local.ts consome.
 *
 * Repare que isto NÃO é o `montarContexto`: aquele produz texto para um
 * modelo ler; este produz objetos para regras calcularem. São propósitos
 * diferentes e formatos diferentes, e tentar servir aos dois com uma
 * estrutura só acabaria com regra fazendo parse de string.
 *
 * A ausência da chave importa: quando a prefeitura não contratou o módulo (ou
 * o secretário não tem acesso a ele), o campo fica indefinido em vez de vir
 * vazio — a análise distingue "não faz parte do seu contrato" de "está
 * contratado e sem nada cadastrado".
 */
async function carregarDadosAnalise(
  prefeituraId: string,
  restricaoCargo?: { cargo: string; secretaria?: string | null }
): Promise<DadosAnalise> {
  const escopo = await escopoVisivel(prefeituraId, restricaoCargo);

  const [indicadorSaude, unidades, indicadorEducacao, escolas, listaObras, listaLicitacoes, snapshot] =
    await Promise.all([
      escopo.saude ? buscarUltimoIndicadorSaude(prefeituraId) : Promise.resolve(null),
      escopo.saude ? buscarUnidadesSaude(prefeituraId) : Promise.resolve([]),
      escopo.educacao ? buscarUltimoIndicadorEducacao(prefeituraId) : Promise.resolve(null),
      escopo.educacao ? buscarEscolas(prefeituraId) : Promise.resolve([]),
      escopo.obras ? buscarObras(prefeituraId) : Promise.resolve([]),
      escopo.licitacoes ? buscarLicitacoes(prefeituraId) : Promise.resolve([]),
      escopo.financeiro ? buscarUltimoSnapshot(prefeituraId) : Promise.resolve(null),
    ]);

  const dados: DadosAnalise = {};
  if (escopo.saude) dados.saude = { indicador: indicadorSaude, unidades };
  if (escopo.educacao) dados.educacao = { indicador: indicadorEducacao, escolas };
  if (escopo.obras) dados.obras = listaObras;
  if (escopo.licitacoes) dados.licitacoes = listaLicitacoes;
  if (escopo.financeiro) dados.financeiro = { snapshot };
  return dados;
}

export type ModuloInsight = "geral" | "saude" | "educacao" | "obras" | "licitacoes";

const LABEL_MODULO_INSIGHT: Record<ModuloInsight, string> = {
  geral: "a visão geral da prefeitura (financeiro e alertas)",
  saude: "a Secretaria de Saúde",
  educacao: "a Secretaria de Educação",
  obras: "a Secretaria de Obras",
  licitacoes: "a área de Licitações",
};

/**
 * Insight curto e automático por módulo — a mesma disciplina de "só dados
 * reais" do chat, só que resumida em 1-2 frases + uma ação sugerida, pra
 * cada secretaria (e a visão geral) ter a IA aplicada, não só o chat central.
 */
export async function gerarInsightModulo(
  prefeituraId: string,
  modulo: ModuloInsight,
  restricaoCargo?: { cargo: string; secretaria?: string | null }
): Promise<RespostaIA> {
  // ── Sem provedor de modelo, o insight NÃO some ──
  //
  // Antes esta função devolvia um erro sobre variável de ambiente faltando, e
  // o painel de cada secretaria ficava com um aviso de configuração no lugar
  // da análise. Do lado do prefeito isso é indistinguível de produto quebrado.
  //
  // A análise determinística de lib/analise-local.ts responde à mesma
  // pergunta — o que mais importa agora, e o que fazer — a partir das mesmas
  // regras que já sustentam os alertas automáticos. Custa zero, não depende de
  // rede e, num órgão público, tem uma vantagem que o modelo não tem: dá para
  // explicar ao Tribunal de Contas de onde saiu cada frase.
  //
  // Com provedor configurado, o modelo assume; a análise local vira a rede de
  // proteção para quando ele falhar.
  const provedor = provedorIA();

  if (provedor.nome === "nenhum") {
    return insightLocal(prefeituraId, modulo, restricaoCargo);
  }

  let contexto: string;
  try {
    contexto = await montarContexto(prefeituraId, restricaoCargo);
  } catch (e) {
    console.error("[Insight IA] falha ao montar contexto:", e);
    return { ok: false, erro: "Não foi possível carregar os dados para gerar o insight agora." };
  }

  const resposta = await provedor.conversar({
    sistema: `${SYSTEM_PROMPT_BASE}\n\n${contexto}`,
    maxTokens: 300,
    esforco: ESFORCO_PADRAO.insight,
    mensagens: [
      {
        papel: "user",
        texto:
          `Com base só nos dados reais de ${LABEL_MODULO_INSIGHT[modulo]} mostrados acima, ` +
          "dê um insight curto (no máximo 2 frases) sobre o ponto mais importante agora, " +
          "e uma ação concreta sugerida em uma frase. Se não houver dados suficientes pra " +
          "dizer algo útil, diga isso claramente em vez de forçar um insight genérico. " +
          "Não enumere tudo — só o que mais importa.",
      },
    ],
  });

  // Modelo indisponível não pode virar tela vazia: a análise por regra
  // responde a mesma pergunta e o painel continua útil.
  if (!resposta.ok) {
    console.error("[Insight IA] provedor falhou, caindo para a análise local:", resposta.erro);
    return insightLocal(prefeituraId, modulo, restricaoCargo);
  }
  return resposta;
}

/**
 * Insight calculado por regra, sem chamar modelo nenhum.
 *
 * Devolve `ok: true` inclusive quando não há dado — porque "os indicadores de
 * Saúde nunca foram preenchidos" É a informação mais útil que existe naquele
 * momento, e mostrá-la como erro de sistema esconde do gestor exatamente o
 * que ele precisa resolver.
 */
async function insightLocal(
  prefeituraId: string,
  modulo: ModuloInsight,
  restricaoCargo?: { cargo: string; secretaria?: string | null }
): Promise<RespostaIA> {
  try {
    const dados = await carregarDadosAnalise(prefeituraId, restricaoCargo);
    return { ok: true, texto: textoAnalise(analisarModulo(modulo, dados)) };
  } catch (e) {
    console.error("[Insight local] falha ao carregar dados:", e);
    return { ok: false, erro: "Não foi possível carregar os dados para gerar o insight agora." };
  }
}

export type SugestaoAlertaIA = {
  titulo: string;
  descricao: string;
  prioridade: "urgente" | "medio" | "info";
  secretaria: string | null;
  justificativa: string;
};

export type RespostaSugestoesIA =
  | { ok: true; sugestoes: SugestaoAlertaIA[] }
  | { ok: false; erro: string };

const schemaSugestoes = z.object({
  sugestoes: z.array(
    z.object({
      titulo: z.string(),
      descricao: z.string(),
      prioridade: z.enum(["urgente", "medio", "info"]),
      secretaria: z.string().nullable().optional(),
      justificativa: z.string(),
    })
  ),
});

function paraSugestao(d: DeteccaoAutomatica): SugestaoAlertaIA {
  return {
    titulo: d.titulo,
    descricao: d.descricao,
    prioridade: d.prioridade,
    secretaria: d.secretaria,
    justificativa: "Detectado automaticamente por regra do sistema — não depende da IA.",
  };
}

/**
 * Regras determinísticas (prazo vencendo, obra parada, dado desatualizado,
 * saldo negativo) — mesmo escopo de secretaria/plano que o resto do
 * contexto, mas sem custo de IA e sem risco de a IA "esquecer" de checar.
 */
/**
 * O que este usuário pode ver: cruzamento de plano contratado com cargo.
 *
 * Ficou numa função só porque é uma regra de ISOLAMENTO, não de apresentação:
 * secretário de Saúde não pode ver dado de Educação, e nenhum deles vê o
 * financeiro consolidado. Duplicar isso em cada lugar que carrega dados é
 * como as duas cópias divergem — e a que ficar para trás vira vazamento
 * silencioso entre secretarias.
 */
async function escopoVisivel(
  prefeituraId: string,
  restricaoCargo?: { cargo: string; secretaria?: string | null }
) {
  const ehSecretario = restricaoCargo?.cargo === "secretario";
  const minha = restricaoCargo?.secretaria;

  const prefeitura = await buscarPrefeitura(prefeituraId);
  const planos = planosContratadosDe(prefeitura?.planosContratados);

  // Tipado de propósito: `as never` compilaria, mas apagaria justamente a
  // checagem que garante que o nome da área existe entre os módulos reais.
  // Um erro de digitação aqui abriria ou fecharia acesso em silêncio.
  const daSecretaria = (area: PlanoAddon) =>
    planos.includes(area) && (!ehSecretario || minha === area);

  return {
    saude: daSecretaria("saude"),
    educacao: daSecretaria("educacao"),
    obras: daSecretaria("obras"),
    licitacoes: daSecretaria("licitacoes"),
    // O consolidado é do gabinete: nenhum secretário o enxerga, tenha ele o
    // módulo de Gestão ou não.
    financeiro: !ehSecretario && planos.includes("gestao"),
    // Atendimento ao cidadão vem do Essencial. Também é visão de gabinete: um
    // secretário de Obras não precisa saber quantos protocolos da prefeitura
    // inteira estão vencendo.
    essencial: !ehSecretario && planos.includes("essencial"),
  };
}

export async function gerarDeteccoesAutomaticas(
  prefeituraId: string,
  restricaoCargo?: { cargo: string; secretaria?: string | null }
): Promise<DeteccaoAutomatica[]> {
  const escopo = await escopoVisivel(prefeituraId, restricaoCargo);
  const {
    saude: mostrarSaude,
    educacao: mostrarEducacao,
    obras: mostrarObras,
    licitacoes: mostrarLicitacoes,
    financeiro: mostrarFinanceiro,
  } = escopo;

  const [indicadorSaude, indicadorEducacao, listaObras, listaLicitacoes, snapshot] = await Promise.all([
    mostrarSaude ? buscarUltimoIndicadorSaude(prefeituraId) : Promise.resolve(null),
    mostrarEducacao ? buscarUltimoIndicadorEducacao(prefeituraId) : Promise.resolve(null),
    mostrarObras ? buscarObras(prefeituraId) : Promise.resolve([]),
    mostrarLicitacoes ? buscarLicitacoes(prefeituraId) : Promise.resolve([]),
    mostrarFinanceiro ? buscarUltimoSnapshot(prefeituraId) : Promise.resolve(null),
  ]);

  // ── Os dois que faltavam ──
  //
  // O mínimo constitucional e o prazo de resposta ao cidadão viviam só nas
  // telas próprias, o que obrigava o prefeito a visitar três lugares para
  // conhecer os três riscos — e o risco que ninguém visita é o que estoura.
  //
  // A conferência no PNCP continua de fora, e de propósito: depende de rede
  // contra um serviço que limita requisição com facilidade, e esta função roda
  // a cada abertura da Central. Fica sob demanda, na tela de Licitações.
  const [minimos, prazos] = await Promise.all([
    mostrarFinanceiro ? detectarMinimosDoExercicio(prefeituraId) : Promise.resolve([]),
    escopo.essencial ? detectarPrazosDoAtendimento(prefeituraId) : Promise.resolve([]),
  ]);

  return [
    ...(mostrarObras ? detectarObrasParadas(listaObras) : []),
    ...(mostrarLicitacoes ? detectarLicitacoesVencendo(listaLicitacoes) : []),
    ...(mostrarSaude ? detectarIndicadorDesatualizado("saude", indicadorSaude) : []),
    ...(mostrarEducacao ? detectarIndicadorDesatualizado("educacao", indicadorEducacao) : []),
    ...(mostrarFinanceiro ? detectarSaldoNegativo(snapshot) : []),
    ...minimos,
    ...prazos,
  ];
}

/** Carrega as bases informadas e avalia os dois mínimos do exercício corrente. */
async function detectarMinimosDoExercicio(prefeituraId: string): Promise<DeteccaoAutomatica[]> {
  const exercicio = new Date().getFullYear();

  const bases = await db
    .select()
    .from(basesMinimos)
    .where(
      and(eq(basesMinimos.prefeituraId, prefeituraId), eq(basesMinimos.exercicio, exercicio))
    );

  const entradas = bases
    .filter((b) => b.baseCalculo > 0)
    .map((b) => {
      const a = avaliarMinimo({
        area: b.area,
        base: b.baseCalculo,
        aplicado: b.aplicado,
        mesesDecorridos: b.mesReferencia,
      });
      return {
        area: b.area,
        nomeArea: MINIMOS[b.area].area,
        percentualAtual: a.percentualAtual,
        exigido: a.exigido,
        faltamReais: a.faltaProjetadaNoAno ?? a.faltaSobreBaseAtual,
        situacao: a.situacao,
      };
    });

  return detectarMinimoConstitucional(entradas);
}

/** Conta as manifestações vencidas e a vencer, sem listar uma a uma. */
async function detectarPrazosDoAtendimento(prefeituraId: string): Promise<DeteccaoAutomatica[]> {
  const linhas = await db
    .select({
      tipo: atendimentos.tipo,
      status: atendimentos.status,
      abertoEm: atendimentos.createdAt,
      respondidoEm: atendimentos.respondidoEm,
      prorrogado: atendimentos.prazoProrrogado,
    })
    .from(atendimentos)
    .where(eq(atendimentos.prefeituraId, prefeituraId));

  const painel = montarPainelPrazos(linhas);
  return detectarPrazoAtendimento({
    vencidos: painel.vencidos.length,
    vencendo: painel.vencendo.length,
  });
}

/**
 * A IA analisa os dados reais já cadastrados e sugere alertas — nunca cria
 * um alerta oficial sozinha. Cada sugestão fica pendente em
 * `alertas_sugeridos` até um humano aprovar ou descartar (ver
 * src/app/dashboard/alertas/actions.ts). Regras automáticas (sem IA) rodam
 * sempre, mesmo sem ANTHROPIC_API_KEY configurada.
 */
export async function gerarSugestoesAlertas(
  prefeituraId: string,
  restricaoCargo?: { cargo: string; secretaria?: string | null }
): Promise<RespostaSugestoesIA> {
  let deteccoes: DeteccaoAutomatica[] = [];
  try {
    deteccoes = await gerarDeteccoesAutomaticas(prefeituraId, restricaoCargo);
  } catch (e) {
    console.error("[Detecção automática] falha ao rodar regras:", e);
  }
  const sugestoesAutomaticas = deteccoes.map(paraSugestao);

  // Esta é a única das três chamadas que usa TOOL USE, para receber a lista
  // de sugestões já estruturada em vez de fazer parse de texto. Tool use não
  // é portável entre provedores — o formato é da Anthropic —, então esta
  // função não passa pela abstração de lib/provedor-ia.ts e só roda quando o
  // provedor configurado é o da Anthropic.
  //
  // Não perder nada nos outros casos é o ponto: `sugestoesAutomaticas` já
  // trouxe tudo que as regras determinísticas encontraram. Sem modelo, a
  // funcionalidade continua entregando — com menos alcance, não quebrada.
  const provedor = provedorIA();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (provedor.nome !== "anthropic" || !apiKey) {
    return { ok: true, sugestoes: sugestoesAutomaticas };
  }

  let contexto: string;
  try {
    contexto = await montarContexto(prefeituraId, restricaoCargo);
  } catch (e) {
    console.error("[Sugestões IA] falha ao montar contexto:", e);
    return sugestoesAutomaticas.length > 0
      ? { ok: true, sugestoes: sugestoesAutomaticas }
      : { ok: false, erro: "Não foi possível carregar os dados da prefeitura para gerar sugestões agora." };
  }

  const client = new Anthropic({ apiKey });

  try {
    const resposta = await client.messages.create({
      model: provedor.modelo ?? MODELO_ANTHROPIC_PADRAO,
      max_tokens: 1500,
      output_config: { effort: ESFORCO_PADRAO.sugestaoAlertas },
      // O prompt de sistema tem ~3.500 tokens e vai inteiro em toda chamada.
      // Marcado para cache, a releitura custa ~10% do preço normal.
      system: [
        {
          type: "text" as const,
          text: `${SYSTEM_PROMPT_BASE}\n\n${contexto}`,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: [
        {
          role: "user",
          content:
            "Analise os dados reais acima e aponte só os sinais que já estão " +
            "nos dados (obra atrasada, faltas altas, estoque baixo, saldo " +
            "negativo, licitação com risco marcado, etc.). Para cada um, chame " +
            "a ferramenta com um alerta sugerido citando o número real que " +
            "motivou. Se não houver nenhum sinal preocupante nos dados " +
            "disponíveis, chame a ferramenta com uma lista vazia — não invente " +
            "um alerta só para preencher." +
            (sugestoesAutomaticas.length > 0
              ? `\n\nOs seguintes pontos JÁ foram detectados automaticamente por regra do ` +
                `sistema — não repita-os, foque em outros padrões: ` +
                sugestoesAutomaticas.map((s) => s.titulo).join("; ") + "."
              : ""),
        },
      ],
      tools: [
        {
          name: "sugerir_alertas",
          description:
            "Registra uma lista de alertas sugeridos com base apenas nos dados reais fornecidos no contexto.",
          input_schema: {
            type: "object",
            properties: {
              sugestoes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    titulo: { type: "string" },
                    descricao: { type: "string" },
                    prioridade: {
                      type: "string",
                      enum: ["urgente", "medio", "info"],
                    },
                    secretaria: { type: ["string", "null"] },
                    justificativa: {
                      type: "string",
                      description:
                        "Por que a IA sugeriu isso, citando o dado real específico.",
                    },
                  },
                  required: ["titulo", "descricao", "prioridade", "justificativa"],
                },
              },
            },
            required: ["sugestoes"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "sugerir_alertas" },
    });

    const bloco = resposta.content.find((b) => b.type === "tool_use");
    if (!bloco || bloco.type !== "tool_use") {
      return sugestoesAutomaticas.length > 0
        ? { ok: true, sugestoes: sugestoesAutomaticas }
        : { ok: false, erro: "A IA não retornou sugestões estruturadas." };
    }

    const parsed = schemaSugestoes.safeParse(bloco.input);
    if (!parsed.success) {
      console.error("[Sugestões IA] resposta fora do formato esperado:", parsed.error);
      return sugestoesAutomaticas.length > 0
        ? { ok: true, sugestoes: sugestoesAutomaticas }
        : { ok: false, erro: "A IA retornou um formato inesperado." };
    }

    return {
      ok: true,
      sugestoes: [
        ...sugestoesAutomaticas,
        ...parsed.data.sugestoes.map((s) => ({ ...s, secretaria: s.secretaria ?? null })),
      ],
    };
  } catch (e) {
    console.error("[Sugestões IA] falha na chamada à API:", e);
    return sugestoesAutomaticas.length > 0
      ? { ok: true, sugestoes: sugestoesAutomaticas }
      : { ok: false, erro: "Não foi possível falar com a IA agora. Tente novamente em instantes." };
  }
}
