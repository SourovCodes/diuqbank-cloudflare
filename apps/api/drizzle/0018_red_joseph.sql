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
CREATE INDEX `manual_submissions_status_idx` ON `manual_submissions` (`status`);--> statement-breakpoint
-- Preserve every auto_submissions row (data must never be wiped in prod):
-- the AI-extracted names become the free-text taxonomy values, published and
-- rejected rows keep their status/linkage, and everything else (processing /
-- needs_review / failed) lands in the manual review queue as 'pending'.
-- Ids are carried over; SQLite bumps the AUTOINCREMENT sequence automatically
-- when explicit ids exceed it.
INSERT INTO `manual_submissions` (
	`id`, `user_id`, `legacy_id`, `legacy_views`, `pdf_key`, `file_size`,
	`status`, `department_name`, `course_name`, `semester_name`,
	`exam_type_name`, `section`, `batch`, `rejected_reason`, `reviewed_by`,
	`question_id`, `submission_id`, `created_at`
)
SELECT
	`id`, `user_id`, `legacy_id`, `legacy_views`, `pdf_key`, `file_size`,
	CASE `status` WHEN 'published' THEN 'published' WHEN 'rejected' THEN 'rejected' ELSE 'pending' END,
	`extracted_department_name`, `extracted_course_name`, `extracted_semester_name`,
	`extracted_exam_type_name`, `section`, `batch`, `rejected_reason`, `reviewed_by`,
	`question_id`, `submission_id`, `created_at`
FROM `auto_submissions`;--> statement-breakpoint
DROP TABLE `auto_submissions`;