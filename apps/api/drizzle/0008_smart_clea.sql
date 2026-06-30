CREATE TABLE `auto_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`pdf_key` text NOT NULL,
	`file_size` integer NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`is_acceptable` integer,
	`ai_reasoning` text,
	`extracted_department_name` text,
	`extracted_department_short_name` text,
	`extracted_course_name` text,
	`extracted_semester_name` text,
	`extracted_exam_type_name` text,
	`section` text,
	`batch` text,
	`extra_context` text,
	`rejected_reason` text,
	`reviewed_by` integer,
	`question_id` integer,
	`submission_id` integer,
	`processing_error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `auto_submissions_user_id_idx` ON `auto_submissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auto_submissions_status_idx` ON `auto_submissions` (`status`);