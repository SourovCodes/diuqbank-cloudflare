PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_manual_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`department_name` text NOT NULL,
	`department_short_name` text NOT NULL,
	`course_name` text NOT NULL,
	`semester_name` text NOT NULL,
	`exam_type_name` text NOT NULL,
	`note` text,
	`pdf_key` text NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`rejected_reason` text,
	`reviewed_by` integer,
	`question_id` integer,
	`submission_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "manual_submissions_status_check" CHECK("status" IN ('pending_review', 'approved', 'rejected')),
	CONSTRAINT "manual_submissions_approval_links_check" CHECK(("status" = 'approved' AND "question_id" IS NOT NULL AND "submission_id" IS NOT NULL) OR ("status" <> 'approved' AND "question_id" IS NULL AND "submission_id" IS NULL))
);
--> statement-breakpoint
INSERT INTO `__new_manual_submissions`("id", "user_id", "department_name", "department_short_name", "course_name", "semester_name", "exam_type_name", "note", "pdf_key", "status", "rejected_reason", "reviewed_by", "question_id", "submission_id", "created_at") SELECT "id", "user_id", "department_name", "department_short_name", "course_name", "semester_name", "exam_type_name", "note", "pdf_key", "status", "rejected_reason", "reviewed_by", "question_id", "submission_id", "created_at" FROM `manual_submissions`;--> statement-breakpoint
DROP TABLE `manual_submissions`;--> statement-breakpoint
ALTER TABLE `__new_manual_submissions` RENAME TO `manual_submissions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `manual_submissions_user_id_idx` ON `manual_submissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `manual_submissions_status_idx` ON `manual_submissions` (`status`);
