CREATE TABLE `auto_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`pdf_key` text NOT NULL,
	`compressed_pdf_key` text,
	`file_size` integer NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`ai_result` text,
	`extra_context` text,
	`error_message` text,
	`submission_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `auto_submissions_user_id_idx` ON `auto_submissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auto_submissions_status_idx` ON `auto_submissions` (`status`);