CREATE TABLE `manual_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`legacy_id` integer,
	`legacy_views` integer,
	`pdf_key` text NOT NULL,
	`file_size` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`department_name` text,
	`course_name` text,
	`semester_name` text,
	`exam_type_name` text,
	`section` text,
	`batch` text,
	`rejected_reason` text,
	`reviewed_by` integer,
	`question_id` integer,
	`submission_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "manual_submissions_status_check" CHECK("manual_submissions"."status" IN ('pending', 'published', 'rejected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `manual_submissions_legacy_id_unique` ON `manual_submissions` (`legacy_id`);--> statement-breakpoint
CREATE INDEX `manual_submissions_user_id_idx` ON `manual_submissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `manual_submissions_status_idx` ON `manual_submissions` (`status`);