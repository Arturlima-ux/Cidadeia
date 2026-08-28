CREATE TABLE `educacao_indicadores` (
	`id` text PRIMARY KEY NOT NULL,
	`prefeitura_id` text NOT NULL,
	`frequencia_percentual` real,
	`nota_media` real,
	`alunos_transporte` integer,
	`professores_ativos` integer,
	`origem` text DEFAULT 'manual' NOT NULL,
	`atualizado_em` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`prefeitura_id`) REFERENCES `prefeituras`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `escolas` (
	`id` text PRIMARY KEY NOT NULL,
	`prefeitura_id` text NOT NULL,
	`nome` text NOT NULL,
	`bairro` text,
	`evasao_percentual` real,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`prefeitura_id`) REFERENCES `prefeituras`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `licitacoes` (
	`id` text PRIMARY KEY NOT NULL,
	`prefeitura_id` text NOT NULL,
	`numero` text NOT NULL,
	`objeto` text NOT NULL,
	`modalidade` text,
	`valor_estimado` real,
	`fornecedor` text,
	`status` text DEFAULT 'planejamento' NOT NULL,
	`observacao_risco` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`prefeitura_id`) REFERENCES `prefeituras`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `obras` (
	`id` text PRIMARY KEY NOT NULL,
	`prefeitura_id` text NOT NULL,
	`nome` text NOT NULL,
	`bairro` text,
	`progresso_atual` real DEFAULT 0 NOT NULL,
	`progresso_esperado` real DEFAULT 0 NOT NULL,
	`valor_contrato` real,
	`status` text DEFAULT 'planejada' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`prefeitura_id`) REFERENCES `prefeituras`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `saude_indicadores` (
	`id` text PRIMARY KEY NOT NULL,
	`prefeitura_id` text NOT NULL,
	`tempo_medio_atendimento_min` real,
	`medicos_ativos` integer,
	`faltas_percentual` real,
	`estoque_medicamentos_percentual` real,
	`origem` text DEFAULT 'manual' NOT NULL,
	`atualizado_em` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`prefeitura_id`) REFERENCES `prefeituras`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `unidades_saude` (
	`id` text PRIMARY KEY NOT NULL,
	`prefeitura_id` text NOT NULL,
	`nome` text NOT NULL,
	`tipo` text NOT NULL,
	`bairro` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`prefeitura_id`) REFERENCES `prefeituras`(`id`) ON UPDATE no action ON DELETE cascade
);
