CREATE TABLE `manual_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`department_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`semester_id` integer NOT NULL,
	`exam_type_id` integer NOT NULL,
	`pdf_key` text NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`rejected_reason` text,
	`reviewed_by` integer,
	`question_id` integer,
	`submission_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`exam_type_id`) REFERENCES `exam_types`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "manual_submissions_status_check" CHECK("manual_submissions"."status" IN ('pending_review', 'approved', 'rejected')),
	CONSTRAINT "manual_submissions_approval_links_check" CHECK(("manual_submissions"."status" = 'approved' AND "manual_submissions"."question_id" IS NOT NULL AND "manual_submissions"."submission_id" IS NOT NULL) OR ("manual_submissions"."status" <> 'approved' AND "manual_submissions"."question_id" IS NULL AND "manual_submissions"."submission_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `manual_submissions_user_id_idx` ON `manual_submissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `manual_submissions_status_idx` ON `manual_submissions` (`status`);