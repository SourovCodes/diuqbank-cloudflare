PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`section` text,
	`batch` text,
	`pdf_key` text NOT NULL,
	`file_size` integer NOT NULL,
	`watermarked_pdf_key` text,
	`watermark_status` text DEFAULT 'awaiting' NOT NULL,
	`watermark_error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_submissions`("id", "question_id", "user_id", "section", "batch", "pdf_key", "file_size", "watermarked_pdf_key", "watermark_status", "watermark_error", "created_at") SELECT "id", "question_id", "user_id", "section", "batch", "pdf_key", "file_size", "watermarked_pdf_key", "watermark_status", "watermark_error", "created_at" FROM `submissions`;--> statement-breakpoint
DROP TABLE `submissions`;--> statement-breakpoint
ALTER TABLE `__new_submissions` RENAME TO `submissions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `submissions_question_id_idx` ON `submissions` (`question_id`);--> statement-breakpoint
CREATE INDEX `submissions_user_id_idx` ON `submissions` (`user_id`);