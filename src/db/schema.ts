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
  // "unidade": a gerência de um hospital ou UBS. Só enxerga a ficha da
  // própria unidade e registra o que acontece lá — o dado nasce onde
  // acontece, não na mesa do secretário.
  cargo: text("cargo", {
    enum: ["prefeito", "secretario", "admin", "unidade", "escola"],
  })
    .notNull()
    .default("admin"),
  secretaria: text("secretaria"), // preenchido quando cargo = secretario
  unidadeId: text("unidade_id"), // preenchido quando cargo = unidade
  escolaId: text("escola_id"), // preenchido quando cargo = escola
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

// ── UNIDADES DE SAÚDE ──
// A rede nasce do CNES (lib/cnes.ts): código, tipo, endereço, turno, se
// atende SUS, se é hospitalar, e a data em que a prefeitura atualizou o
// registro lá. Unidade que some do CNES fica `ativo = false` — não é
// apagada, porque tem ocorrências e histórico pendurados nela.
export const unidadesSaude = pgTable("unidades_saude", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  tipo: text("tipo", {
    enum: ["ubs", "posto", "hospital", "samu", "upa", "caps", "clinica", "laboratorio", "farmacia", "vigilancia", "outro"],
  }).notNull(),
  bairro: text("bairro"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  // ── do CNES ──
  codigoCnes: text("codigo_cnes"),
  origem: text("origem", { enum: ["manual", "cnes"] }).notNull().default("manual"),
  codigoTipoUnidade: integer("codigo_tipo_unidade"),
  esfera: text("esfera"),
  endereco: text("endereco"),
  telefone: text("telefone"),
  turno: text("turno"),
  atendeSus: boolean("atende_sus"),
  hospitalar: boolean("hospitalar"),
  centroCirurgico: boolean("centro_cirurgico"),
  centroObstetrico: boolean("centro_obstetrico"),
  cnesAtualizadoEm: text("cnes_atualizado_em"),
  sincronizadoEm: text("sincronizado_em"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── OCORRÊNCIAS POR UNIDADE ──
// O que está acontecendo dentro da UBS ou do hospital, registrado pela
// própria equipe em segundos, pelo celular: sem médico, faltou insulina,
// geladeira de vacina quebrou, fila. É a linha do tempo da unidade — o que
// "indicador do mês" nunca conta.
export const ocorrenciasSaude = pgTable("ocorrencias_saude", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  unidadeId: text("unidade_id")
    .notNull()
    .references(() => unidadesSaude.id, { onDelete: "cascade" }),
  tipo: text("tipo", {
    enum: ["sem_medico", "sem_profissional", "falta_medicamento", "falta_insumo", "equipamento_quebrado", "fila", "estrutura", "outro"],
  }).notNull(),
  gravidade: text("gravidade", { enum: ["atencao", "urgente"] }).notNull().default("atencao"),
  descricao: text("descricao").notNull(),
  registradoPor: text("registrado_por").notNull(),
  status: text("status", { enum: ["aberta", "resolvida"] }).notNull().default("aberta"),
  resolvidaEm: text("resolvida_em"),
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
  // ── do Censo Escolar / Catálogo de Escolas do INEP ──
  // Não há API pública de educação como o CNES tem na saúde: a rede entra
  // pelo arquivo oficial do INEP. Ver src/lib/censo-escolar.ts.
  codigoInep: text("codigo_inep"),
  origem: text("origem", { enum: ["manual", "censo"] }).notNull().default("manual"),
  dependencia: text("dependencia", { enum: ["municipal", "estadual", "federal", "privada"] }),
  localizacao: text("localizacao", { enum: ["urbana", "rural"] }),
  situacao: text("situacao", { enum: ["ativa", "paralisada", "extinta"] }),
  endereco: text("endereco"),
  telefone: text("telefone"),
  etapas: text("etapas"),
  porte: text("porte"),
  /** Matrícula declarada ao Censo — é por ela que o FUNDEB paga. */
  matriculasCenso: integer("matriculas_censo"),
  /** Alunos que a escola diz ter hoje; a diferença para a declarada é dinheiro. */
  matriculasAtuais: integer("matriculas_atuais"),
  censoAno: integer("censo_ano"),
  /** Dias letivos do calendário aprovado; o mínimo legal é 200 (LDB art. 24). */
  diasPrevistos: integer("dias_previstos"),
  sincronizadoEm: text("sincronizado_em"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// O que acontece na escola no dia a dia, registrado por quem está lá.
// Igual à saúde, com uma diferença que muda tudo: aqui a ocorrência pode
// custar AULA, e dia de aula perdido é obrigação legal de repor.
export const ocorrenciasEscola = pgTable("ocorrencias_escola", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  escolaId: text("escola_id")
    .notNull()
    .references(() => escolas.id, { onDelete: "cascade" }),
  tipo: text("tipo", {
    enum: ["sem_professor", "turma_dispensada", "falta_merenda", "transporte", "estrutura", "seguranca", "material", "infrequencia", "profissional", "outro"],
  }).notNull(),
  gravidade: text("gravidade", { enum: ["atencao", "urgente"] }).notNull().default("atencao"),
  descricao: text("descricao").notNull(),
  /** Dias de aula que a turma perdeu por causa disso. */
  aulasPerdidas: integer("aulas_perdidas"),
  alunosAfetados: integer("alunos_afetados"),
  registradoPor: text("registrado_por").notNull(),
  status: text("status", { enum: ["aberta", "resolvida"] }).notNull().default("aberta"),
  resolvidaEm: text("resolvida_em"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── MERENDA ──
// O estoque da cozinha, contado pela própria escola. Diferente da farmácia,
// o consumo aqui é por DIA DE AULA: escola não serve almoço no sábado.
// Ver src/lib/merenda.ts.
export const estoqueMerenda = pgTable("estoque_merenda", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  escolaId: text("escola_id")
    .notNull()
    .references(() => escolas.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  categoria: text("categoria", {
    enum: ["hortifruti", "proteina", "graos", "laticinio", "panificacao", "mercearia", "outro"],
  })
    .notNull()
    .default("outro"),
  unidadeMedida: text("unidade_medida").notNull().default("kg"),
  saldo: doublePrecision("saldo").notNull().default(0),
  /** Quanto sai por dia de aula. */
  consumoDiario: doublePrecision("consumo_diario").notNull().default(0),
  atualizadoPor: text("atualizado_por").notNull(),
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── BUSCA ATIVA ESCOLAR ──
// Um caso por aluno que sumiu, com as tentativas datadas. É esse registro
// que a lei chama de "esgotados os recursos escolares" (ECA, art. 56, II)
// e que vira o ofício ao Conselho Tutelar. Ver src/lib/busca-ativa.ts.
//
// Dado de criança: nome e turma, nada além. Sem CPF, sem NIS, sem endereço.
export const buscaAtiva = pgTable("busca_ativa", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  escolaId: text("escola_id")
    .notNull()
    .references(() => escolas.id, { onDelete: "cascade" }),
  alunoNome: text("aluno_nome").notNull(),
  alunoTurma: text("aluno_turma"),
  /** Só a idade, para saber a exigência de frequência do Bolsa Família. */
  idade: integer("idade"),
  faltas: integer("faltas").notNull().default(0),
  aulasPeriodo: integer("aulas_periodo").notNull().default(0),
  periodo: text("periodo").notNull(),
  ultimaPresenca: text("ultima_presenca"),
  bolsaFamilia: boolean("bolsa_familia").notNull().default(false),
  situacao: text("situacao", { enum: ["aberta", "retornou", "transferido", "conselho_tutelar", "encerrada"] })
    .notNull()
    .default("aberta"),
  // As etapas, com data: é a prova de que a escola tentou antes.
  contatoFamiliaEm: text("contato_familia_em"),
  visitaEm: text("visita_em"),
  conselhoTutelarEm: text("conselho_tutelar_em"),
  ministerioPublicoEm: text("ministerio_publico_em"),
  observacao: text("observacao"),
  registradoPor: text("registrado_por").notNull(),
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── PNAE: AS COMPRAS E O REPASSE ──
// A Lei 11.947/2009, art. 14, manda aplicar no mínimo 30% do repasse do
// PNAE em compra direta da agricultura familiar. O percentual é sobre o
// REPASSE, por isso ele é guardado. Ver src/lib/pnae.ts.
export const pnaeCompras = pgTable("pnae_compras", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  ano: integer("ano").notNull(),
  descricao: text("descricao").notNull(),
  fornecedor: text("fornecedor"),
  valor: doublePrecision("valor").notNull(),
  agriculturaFamiliar: boolean("agricultura_familiar").notNull().default(false),
  modalidade: text("modalidade", { enum: ["chamada_publica", "pregao", "dispensa", "outra"] })
    .notNull()
    .default("outra"),
  documento: text("documento"),
  dataCompra: text("data_compra").notNull(),
  registradoPor: text("registrado_por").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

export const pnaeRepasses = pgTable("pnae_repasses", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  ano: integer("ano").notNull(),
  valor: doublePrecision("valor").notNull(),
  /** Motivo do art. 14, §2º, quando o município não alcança os 30%. */
  motivoDispensa: text("motivo_dispensa", { enum: ["sem_nota", "sem_regularidade", "sanitario"] }),
  observacao: text("observacao"),
  registradoPor: text("registrado_por").notNull(),
  atualizadoEm: text("atualizado_em")
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

// ── PEDIDOS DE PROPOSTA ──
// Vem do site, sem login: o visitante monta a proposta no simulador e pede.
// Antes o pedido era um "mailto:" — dependia do programa de e-mail do
// visitante, e numa máquina de prefeitura isso muitas vezes é nada. Agora o
// sistema grava e envia. Fica gravado mesmo se o e-mail falhar: é o registro
// do primeiro contato, e é dele que a proposta sai.
export const pedidosProposta = pgTable("pedidos_proposta", {
  id: text("id").primaryKey(),
  codigoIbge: text("codigo_ibge").notNull(),
  municipio: text("municipio").notNull(),
  uf: text("uf").notNull(),
  populacao: integer("populacao").notNull(),
  porte: text("porte").notNull(),
  modulos: text("modulos").notNull(), // JSON: array de chaves de módulo
  mensal: doublePrecision("mensal"), // null quando alguma faixa está sob consulta
  nome: text("nome").notNull(),
  cargo: text("cargo"),
  email: text("email").notNull(),
  telefone: text("telefone"),
  observacao: text("observacao"),
  emailEnviado: boolean("email_enviado").notNull().default(false),
  // ── O PEDIDO VIRA CONTA, A CONTA VIRA ACESSO ──
  // prefeitura_id liga o pedido à conta da prefeitura (criada a partir dele,
  // ou já existente quando quem pediu estava logado). status é o caminho:
  // recebido → proposta_enviada (a equipe mandou o PDF) → contratado (contrato
  // assinado, módulos ativados na conta). Quem avança o status é a equipe,
  // em /admin/pedidos — nunca o cliente, nunca um pagamento online.
  prefeituraId: text("prefeitura_id"),
  status: text("status", { enum: ["recebido", "proposta_enviada", "contratado"] })
    .notNull()
    .default("recebido"),
  contratadoEm: text("contratado_em"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── LEADS ──
// Quem deixou e-mail no site. Hoje, o Raio-X de um município ("receba este
// Raio-X por e-mail, com a leitura de cada número"); amanhã, outras portas.
// A origem diz de onde veio, e o código IBGE diz de que município a pessoa
// estava falando — que é o dado que vale para a proposta.
export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  origem: text("origem").notNull(), // "raio-x"
  codigoIbge: text("codigo_ibge"),
  municipio: text("municipio"),
  uf: text("uf"),
  nome: text("nome").notNull(),
  cargo: text("cargo"),
  email: text("email").notNull(),
  emailEnviado: boolean("email_enviado").notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── TRILHA DE AUDITORIA ──
// Quem mudou o quê, quando. Uma linha por alteração que importa. Ver
// lib/auditoria.ts para o que entra e o que fica de fora.
export const auditoria = pgTable("auditoria", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  usuarioId: text("usuario_id").notNull(),
  // Nome e cargo copiados na hora: o usuário pode ser removido depois, e a
  // trilha precisa continuar dizendo quem foi.
  usuarioNome: text("usuario_nome").notNull(),
  usuarioCargo: text("usuario_cargo").notNull(),
  acao: text("acao").notNull(),
  entidade: text("entidade").notNull(),
  entidadeId: text("entidade_id"),
  resumo: text("resumo").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── ESTOQUE POR UNIDADE DE SAÚDE ──
// Uma linha por item por unidade: a última contagem. Ver lib/estoque-saude.ts.
export const estoqueSaude = pgTable("estoque_saude", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  unidadeId: text("unidade_id")
    .notNull()
    .references(() => unidadesSaude.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  categoria: text("categoria", { enum: ["medicamento", "insumo", "vacina"] }).notNull().default("medicamento"),
  unidadeMedida: text("unidade_medida").notNull().default("unidade"),
  saldo: doublePrecision("saldo").notNull().default(0),
  consumoMensal: doublePrecision("consumo_mensal").notNull().default(0),
  atualizadoPor: text("atualizado_por").notNull(),
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();

// ── COMPONENTE DE QUALIDADE DA APS ──
// Resultado de cada indicador por quadrimestre (e por equipe, quando o
// município acompanha por equipe). Ver lib/aps.ts: não há API pública
// desses números; o gestor informa o que o SIAPS mostra.
export const apsResultados = pgTable("aps_resultados", {
  id: text("id").primaryKey(),
  prefeituraId: text("prefeitura_id")
    .notNull()
    .references(() => prefeituras.id, { onDelete: "cascade" }),
  indicador: text("indicador").notNull(),
  /** INE ou nome da equipe; null = resultado do município. */
  equipe: text("equipe"),
  ano: integer("ano").notNull(),
  quadrimestre: integer("quadrimestre").notNull(),
  resultado: doublePrecision("resultado").notNull(),
  meta: doublePrecision("meta"),
  observacao: text("observacao"),
  registradoPor: text("registrado_por").notNull(),
  atualizadoEm: text("atualizado_em")
    .notNull()
    .default(sql`now()::text`),
}).enableRLS();
