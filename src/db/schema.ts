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
