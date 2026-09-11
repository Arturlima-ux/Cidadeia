import { pgTable, text, integer, doublePrecision, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// RLS habilitado em toda tabela: a app conecta como dono (bypassa RLS,
// nenhuma mudança de comportamento), mas isso fecha a API REST automática
// que a Supabase expõe por padrão (PostgREST via chave anon) — sem RLS,
// vazar a chave anon do projeto Supabase daria leitura/escrita total nas
// tabelas por fora da app. Com RLS ligado e nenhuma policy definida, esse
// caminho fica bloqueado por padrão (acesso negado) pros roles anon/authenticated.

// ── PREFEITURA (tenant / cliente) ──
export const prefeituras = pgTable("prefeituras", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  estado: text("estado").notNull(),
  municipio: text("municipio").notNull(),
  cnpj: text("cnpj").notNull().unique(),
  populacao: integer("populacao"),
  prefeito: text("prefeito"),
  mandatoInicio: text("mandato_inicio"),
  mandatoFim: text("mandato_fim"),
  qtdSecretarias: integer("qtd_secretarias"),
  plano: text("plano", { enum: ["essencial", "profissional", "enterprise"] })
    .notNull()
    .default("essencial"), // legado — mantido só para não perder dado histórico, não controla mais acesso
  planosContratados: text("planos_contratados").notNull().default("[]"), // JSON: array de "saude" | "educacao" | "obras" | "licitacoes" | "gestao"
  maiorProblema: text("maior_problema"),
  // Código IBGE do município (7 dígitos) — chave para consultar o SICONFI do
  // Tesouro Nacional. Preenchido automaticamente na primeira importação,
  // a partir do nome do município + UF.
  codigoIbge: text("codigo_ibge"),
  // Quando o prefeito decidiu encerrar a lista de implantação. É a ÚNICA coisa
  // da implantação que fica gravada: os passos em si são derivados dos dados
  // (src/lib/implantacao.ts), para nunca dizer "feito" sem estar feito.
  implantacaoConcluidaEm: text("implantacao_concluida_em"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── USUÁRIOS (login por CPF/CNPJ) ──
export const usuarios = pgTable("usuarios", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  cpfCnpj: text("cpf_cnpj").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  email: text("email"), // usado para recuperação de senha; opcional para contas antigas
  celular: text("celular"),
  fotoUrl: text("foto_url"),
  nome: text("nome").notNull(),
  cargo: text("cargo", {
    enum: ["prefeito", "secretario", "admin"],
  })
    .notNull()
    .default("admin"),
  secretaria: text("secretaria"), // preenchido quando cargo = secretario
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── SISTEMAS CONECTADOS (etapa 2 do cadastro) ──
export const sistemasConectados = pgTable("sistemas_conectados", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  sistema: text("sistema").notNull(), // ex: 'portal_transparencia', 'esus', 'receita'...
  conectado: boolean("conectado").notNull().default(false),
  // Integração real ainda não existe nesta fase — este campo apenas registra a
  // intenção declarada no cadastro. Quando a integração de fato for construída,
  // este registro passa a refletir o status real da sincronização.
  status: text("status", { enum: ["pendente", "conectado", "erro"] })
    .notNull()
    .default("pendente"),
}).enableRLS();

// ── SNAPSHOT DO DASHBOARD ──
// Fase 1: sem integrações reais ainda, então estes números são inseridos
// manualmente pela prefeitura (ou ficam vazios/"pendente de sincronização").
// Quando as integrações (Fase 2) existirem, um job passa a preencher isto
// automaticamente a partir dos sistemas conectados.
export const dashboardSnapshots = pgTable("dashboard_snapshots", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  receita: doublePrecision("receita"),
  despesas: doublePrecision("despesas"),
  saldo: doublePrecision("saldo"),
  indiceTransparencia: doublePrecision("indice_transparencia"),
  origem: text("origem", { enum: ["manual", "integracao"] })
    .notNull()
    .default("manual"),
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── SAÚDE ──
export const saudeIndicadores = pgTable("saude_indicadores", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  tempoMedioAtendimentoMin: doublePrecision("tempo_medio_atendimento_min"),
  medicosAtivos: integer("medicos_ativos"),
  faltasPercentual: doublePrecision("faltas_percentual"),
  estoqueMedicamentosPercentual: doublePrecision("estoque_medicamentos_percentual"),
  origem: text("origem", { enum: ["manual", "integracao"] })
    .notNull()
    .default("manual"),
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

export const unidadesSaude = pgTable("unidades_saude", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  tipo: text("tipo", { enum: ["ubs", "posto", "hospital", "samu"] }).notNull(),
  bairro: text("bairro"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── EDUCAÇÃO ──
export const educacaoIndicadores = pgTable("educacao_indicadores", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  frequenciaPercentual: doublePrecision("frequencia_percentual"),
  notaMedia: doublePrecision("nota_media"),
  alunosTransporte: integer("alunos_transporte"),
  professoresAtivos: integer("professores_ativos"),
  origem: text("origem", { enum: ["manual", "integracao"] })
    .notNull()
    .default("manual"),
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

export const escolas = pgTable("escolas", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  bairro: text("bairro"),
  evasaoPercentual: doublePrecision("evasao_percentual"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── OBRAS ──
export const obras = pgTable("obras", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  bairro: text("bairro"),
  progressoAtual: doublePrecision("progresso_atual").notNull().default(0),
  progressoEsperado: doublePrecision("progresso_esperado").notNull().default(0),
  valorContrato: doublePrecision("valor_contrato"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  status: text("status", {
    enum: ["planejada", "em_andamento", "atrasada", "concluida", "paralisada"],
  })
    .notNull()
    .default("planejada"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
  // Toda atualização de progresso/status renova isto — detecta obra parada
  // (progresso sem mexer há muito tempo), não só "cadastrada há muito tempo".
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── LICITAÇÕES ──
export const licitacoes = pgTable("licitacoes", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  numero: text("numero").notNull(),
  objeto: text("objeto").notNull(),
  modalidade: text("modalidade"),
  valorEstimado: doublePrecision("valor_estimado"),
  fornecedor: text("fornecedor"),
  status: text("status", {
    enum: ["planejamento", "publicada", "em_disputa", "homologada", "cancelada"],
  })
    .notNull()
    .default("planejamento"),
  observacaoRisco: text("observacao_risco"),
  // Data-limite (ex: prazo de entrega de proposta, fim da vigência do
  // contrato) — opcional, usado pra detectar prazo vencendo automaticamente.
  prazoFinal: text("prazo_final"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();
// Também inserido manualmente por enquanto (Fase 1). Cada alerta pertence
// a uma prefeitura e tem uma prioridade visual (urgente/médio/informativo).
export const alertas = pgTable("alertas", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  prioridade: text("prioridade", { enum: ["urgente", "medio", "info"] })
    .notNull()
    .default("info"),
  secretaria: text("secretaria"),
  resolvido: boolean("resolvido").notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── TENTATIVAS DE LOGIN (rate limiting) ──
// Uma linha por documento. Zera em login bem-sucedido. Ao atingir o limite,
// bloqueia por um tempo em vez de deixar tentar senha infinitamente.
export const tentativasLogin = pgTable("tentativas_login", {
  documento: text("documento").primaryKey(),
  tentativas: integer("tentativas").notNull().default(0),
  bloqueadoAte: text("bloqueado_ate"),
  ultimaTentativa: text("ultima_tentativa")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── INVESTIMENTOS POR SECRETARIA ──
// Obras e Licitações já carregam dinheiro nos próprios registros
// (valor_contrato / valor_estimado), mas Saúde e Educação não tinham
// NENHUM campo financeiro — sem isso é impossível cruzar "quanto foi
// investido" com "que resultado deu". Esta tabela cobre essa lacuna e
// serve para as quatro áreas (aportes que não viram contrato de obra:
// custeio, folha, material, programas).
export const investimentos = pgTable("investimentos", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  secretaria: text("secretaria", {
    enum: ["saude", "educacao", "obras", "licitacoes"],
  }).notNull(),
  valor: doublePrecision("valor").notNull(),
  descricao: text("descricao"),
  // Competência no formato AAAA-MM — permite somar por período depois.
  competencia: text("competencia").notNull(),
  // "manual" = digitado pelo gestor. "siconfi" = importado do Tesouro
  // Nacional. Separar as duas origens permite reimportar o SICONFI (apagando
  // e recriando só o que veio de lá) sem destruir lançamento feito à mão.
  origem: text("origem", { enum: ["manual", "siconfi"] })
    .notNull()
    .default("manual"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── ATENDIMENTO AO CIDADÃO (plano Essencial) ──
// Uma única tabela cobre Protocolo e Ouvidoria: os dois são "o cidadão manda
// algo, a prefeitura responde e acompanha o status". O que muda é o `tipo`,
// que define o vocabulário na tela e o tratamento (ouvidoria admite anônimo,
// protocolo exige identificação para poder responder).
export const atendimentos = pgTable("atendimentos", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  // Número curto que o cidadão anota para acompanhar depois.
  protocolo: text("protocolo").notNull().unique(),
  tipo: text("tipo", {
    enum: ["protocolo", "denuncia", "reclamacao", "sugestao", "elogio", "informacao"],
  }).notNull(),
  // Dados do cidadão — opcionais porque a Lei 13.460/2017 garante o direito
  // de manifestação anônima na ouvidoria.
  nome: text("nome"),
  email: text("email"),
  telefone: text("telefone"),
  anonimo: boolean("anonimo").notNull().default(false),
  secretaria: text("secretaria"),
  assunto: text("assunto").notNull(),
  mensagem: text("mensagem").notNull(),
  status: text("status", {
    enum: ["aberto", "em_analise", "respondido", "encerrado"],
  })
    .notNull()
    .default("aberto"),
  resposta: text("resposta"),
  respondidoEm: text("respondido_em"),
  // A LAI (art. 11, § 2º) e a Lei 13.460 (art. 16) permitem prorrogar o prazo
  // de resposta, mas exigem justificativa expressa comunicada ao cidadão. Por
  // isso é um campo MARCADO pelo servidor, e não uma dedução nossa: o painel
  // não pode conceder sozinho um prazo extra que depende de um ato formal.
  prazoProrrogado: boolean("prazo_prorrogado").notNull().default(false),
  // Chave que o cidadão usa junto com o protocolo para consultar — evita que
  // alguém liste manifestações alheias só chutando números sequenciais.
  chaveConsulta: text("chave_consulta").notNull(),
  origem: text("origem", { enum: ["site", "whatsapp", "presencial"] })
    .notNull()
    .default("site"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── CONFIGURAÇÃO PÚBLICA DA PREFEITURA (Portal da Transparência) ──
// Controla o que a prefeitura expõe no portal público e como o cidadão a
// encontra (slug na URL) e fala com ela (WhatsApp).
export const configPublica = pgTable("config_publica", {
  prefeituraId: text("prefeitura_id")
    .primaryKey()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  // Endereço público: /transparencia/<slug>
  slug: text("slug").notNull().unique(),
  portalAtivo: boolean("portal_ativo").notNull().default(false),
  // Só dígitos, com DDI+DDD (ex: 5585999998888). Usado no link wa.me.
  whatsappNumero: text("whatsapp_numero"),
  mostrarFinanceiro: boolean("mostrar_financeiro").notNull().default(true),
  mostrarObras: boolean("mostrar_obras").notNull().default(true),
  mostrarLicitacoes: boolean("mostrar_licitacoes").notNull().default(true),
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── CACHE DOS INSIGHTS DE IA POR MÓDULO ──
// Sem isto, cada abertura de página de secretaria dispara uma chamada paga
// à API da Anthropic — abrir a mesma tela 10 vezes custava 10 chamadas,
// mesmo sem nenhum dado ter mudado. A chave é prefeitura+módulo.
export const insightsCache = pgTable("insights_cache", {
  chave: text("chave").primaryKey(), // `${prefeituraId}:${modulo}`
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  modulo: text("modulo").notNull(),
  texto: text("texto").notNull(),
  geradoEm: text("gerado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── CENTRAL INTELIGENTE (briefing automático cruzando todos os módulos) ──
// Uma linha por prefeitura — recalculada automaticamente quando fica velha
// (ver lib/central-inteligente.ts), não a cada carregamento de página.
export const centralInteligente = pgTable("central_inteligente", {
  prefeituraId: text("prefeitura_id")
    .primaryKey()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  conteudo: text("conteudo").notNull(), // JSON: { resumo, itens: [{ categoria, prioridade, titulo, texto, modulos[] }] }
  geradoEm: text("gerado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── LIMITE DE USO (rate limit por usuário, ex: chamadas de IA) ──
export const limitesUso = pgTable("limites_uso", {
  chave: text("chave").primaryKey(), // ex: `ia:${usuarioId}`
  contagem: integer("contagem").notNull().default(0),
  janelaInicio: text("janela_inicio")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── TOKENS DE RECUPERAÇÃO DE SENHA ──
export const tokensRecuperacaoSenha = pgTable("tokens_recuperacao_senha", {
  id: text("id").primaryKey(),
  usuarioId: text("usuario_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiraEm: text("expira_em").notNull(),
  usadoEm: text("usado_em"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── SUGESTÕES DE ALERTA GERADAS PELA IA ──
// Rascunhos, não alertas oficiais. A IA analisa os dados reais já cadastrados
// e sugere aqui; um humano precisa aprovar (vira um registro em `alertas`) ou
// descartar. Fica numa tabela separada de propósito, pra não contaminar o
// contexto que a IA Central já lê de `alertas` como "alertas confirmados".
export const alertasSugeridos = pgTable("alertas_sugeridos", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  prioridade: text("prioridade", { enum: ["urgente", "medio", "info"] })
    .notNull()
    .default("info"),
  secretaria: text("secretaria"),
  justificativa: text("justificativa").notNull(),
  status: text("status", { enum: ["pendente", "descartado"] })
    .notNull()
    .default("pendente"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── BASE DE CÁLCULO DOS MÍNIMOS CONSTITUCIONAIS ──
//
// A despesa aplicada nós conseguimos sozinhos: vem do SICONFI, por função
// orçamentária. A BASE — receita resultante de impostos e transferências — não
// sai limpa de nenhuma API pública: o Anexo 01 do RREO mistura transferência
// de imposto com repasse do SUS e convênio, e os anexos oficiais que trariam o
// número pronto (RREO 08 e 12) voltam vazios na API do Tesouro para todos os
// municípios testados.
//
// Então a base é informada pelo contador da prefeitura, que é quem de fato a
// fecha, e guardada por exercício e área. Guardamos junto o mês de referência
// porque é ele que separa "aplicou pouco" de "ainda é março".
export const basesMinimos = pgTable("bases_minimos", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  exercicio: integer("exercicio").notNull(),
  area: text("area", { enum: ["educacao", "saude", "fundeb"] }).notNull(),
  /** Receita que serve de base ao percentual, acumulada no exercício. */
  baseCalculo: doublePrecision("base_calculo").notNull(),
  /**
   * Despesa aplicada acumulada. Pode vir do SICONFI ou ser corrigida à mão —
   * o contador às vezes tem número mais atual que o último RREO publicado.
   */
  aplicado: doublePrecision("aplicado").notNull(),
  /** 1 a 12. Até que mês do exercício os dois valores acima acumulam. */
  mesReferencia: integer("mes_referencia").notNull(),
  origemAplicado: text("origem_aplicado", { enum: ["manual", "siconfi"] })
    .notNull()
    .default("manual"),
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── DESPESA COM PESSOAL (TETO DA LRF) ──
//
// Mesma decisão da tabela acima, pelo mesmo motivo: nenhuma API pública
// entrega o número pronto. Testamos o endpoint de RGF do SICONFI contra
// municípios reais em vários exercícios e ele voltou zerado para todos — usar
// aquilo faria o sistema acusar TODA prefeitura de gastar 0% com pessoal.
// Então RCL e despesa vêm do contador, que é quem fecha o Relatório de Gestão
// Fiscal.
//
// A diferença é que aqui guardamos VÁRIOS períodos por exercício, e não um
// registro único. O art. 23 da LRF dá dois períodos de apuração para eliminar
// o excedente, sendo pelo menos um terço no primeiro — sem o histórico não há
// como dizer se a prefeitura está cumprindo esse cronograma ou só repetindo o
// mesmo estouro.
export const despesaPessoal = pgTable("despesa_pessoal", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  exercicio: integer("exercicio").notNull(),
  /**
   * Mês em que se encerra a janela de doze meses (art. 18, § 2º).
   *
   * Não é o mês da despesa: é o fim do período apurado. Guardar o mês em vez
   * do número do quadrimestre acomoda também o município que publica RGF
   * semestral por ter menos de 50 mil habitantes.
   */
  mesReferencia: integer("mes_referencia").notNull(),
  /** Receita Corrente Líquida dos doze meses. */
  rcl: doublePrecision("rcl").notNull(),
  /** Despesa total com pessoal dos doze meses, na forma do art. 18. */
  despesa: doublePrecision("despesa").notNull(),
  /**
   * De onde veio o período.
   *
   * O RGF publicado no Tesouro é o número oficial que o Tribunal de Contas
   * vai olhar; o digitado é a estimativa do contador, normalmente mais atual
   * e menos definitiva. Sem a marca, um sobrescreve o outro sem que ninguém
   * saiba qual está na tela.
   */
  origem: text("origem", { enum: ["manual", "siconfi"] })
    .notNull()
    .default("manual"),
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── PUBLICAÇÕES DO PORTAL DA TRANSPARÊNCIA ──
//
// A metade do portal que faltava: onde o prefeito e o secretário publicam, e o
// cidadão apenas lê. É o mesmo dado dos dois lados, com permissões opostas.
//
// Os tipos são fechados e cada um corresponde a um inciso do art. 8º da LAI ou
// a um artigo da Lei 13.460 (ver lib/publicacoes.ts) — é o que permite ao
// painel dizer qual obrigação está descoberta, em vez de virar um blog.
export const publicacoes = pgTable("publicacoes", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  tipo: text("tipo", {
    enum: ["comunicado", "servico", "estrutura", "faq", "repasse", "documento"],
  }).notNull(),
  titulo: text("titulo").notNull(),
  conteudo: text("conteudo").notNull(),
  secretaria: text("secretaria"),
  // Campos dos tipos estruturados. A Carta de Serviços exige, por lei, dizer o
  // que o cidadão precisa levar e em quanto tempo será atendido; guardar isso
  // solto dentro do texto impediria de checar se a exigência foi cumprida.
  requisitos: text("requisitos"),
  prazo: text("prazo"),
  contato: text("contato"),
  linkExterno: text("link_externo"),
  // Rascunho por padrão: publicar é ato deliberado. O contrário faria texto
  // pela metade aparecer no endereço público no instante em que fosse salvo.
  publicado: boolean("publicado").notNull().default(false),
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();
