CREATE TABLE `alertas` (
	`id` text PRIMARY KEY NOT NULL,
	`prefeitura_id` text NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`prioridade` text DEFAULT 'info' NOT NULL,
	`secretaria` text,
	`resolvido` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`prefeitura_id`) REFERENCES `prefeituras`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dashboard_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`prefeitura_id` text NOT NULL,
	`receita` real,
	`despesas` real,
	`saldo` real,
	`indice_transparencia` real,
	`origem` text DEFAULT 'manual' NOT NULL,
	`atualizado_em` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`prefeitura_id`) REFERENCES `prefeituras`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prefeituras` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`estado` text NOT NULL,
	`municipio` text NOT NULL,
	`cnpj` text NOT NULL,
	`populacao` integer,
	`prefeito` text,
	`mandato_inicio` text,
	`mandato_fim` text,
	`qtd_secretarias` integer,
	`plano` text DEFAULT 'essencial' NOT NULL,
	`maior_problema` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prefeituras_cnpj_unique` ON `prefeituras` (`cnpj`);--> statement-breakpoint
CREATE TABLE `sistemas_conectados` (
	`id` text PRIMARY KEY NOT NULL,
	`prefeitura_id` text NOT NULL,
	`sistema` text NOT NULL,
	`conectado` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	FOREIGN KEY (`prefeitura_id`) REFERENCES `prefeituras`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` text PRIMARY KEY NOT NULL,
	`prefeitura_id` text NOT NULL,
	`cpf_cnpj` text NOT NULL,
	`senha_hash` text NOT NULL,
	`nome` text NOT NULL,
	`cargo` text DEFAULT 'admin' NOT NULL,
	`secretaria` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`prefeitura_id`) REFERENCES `prefeituras`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_cpf_cnpj_unique` ON `usuarios` (`cpf_cnpj`);