CREATE TABLE `alertas_sugeridos` (
	`id` text PRIMARY KEY NOT NULL,
	`prefeitura_id` text NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`prioridade` text DEFAULT 'info' NOT NULL,
	`secretaria` text,
	`justificativa` text NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`prefeitura_id`) REFERENCES `prefeituras`(`id`) ON UPDATE no action ON DELETE cascade
);
