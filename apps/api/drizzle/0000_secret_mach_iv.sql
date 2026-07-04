CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`department_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_department_name_unique` ON `courses` (`department_id`,`name`);--> statement-breakpoint
CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_name_unique` ON `departments` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `departments_short_name_unique` ON `departments` (`short_name`);--> statement-breakpoint
CREATE TABLE `exam_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_types_name_unique` ON `exam_types` (`name`);--> statement-breakpoint
CREATE TABLE `manual_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`department_name` text NOT NULL,
	`department_short_name` text NOT NULL,
	`course_name` text NOT NULL,
	`semester_name` text NOT NULL,
	`exam_type_name` text NOT NULL,
	`department_id` integer,
	`course_id` integer,
	`semester_id` integer,
	`exam_type_id` integer,
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
	CONSTRAINT "manual_submissions_approval_links_check" CHECK(("manual_submissions"."status" = 'approved' AND "manual_submissions"."department_id" IS NOT NULL AND "manual_submissions"."course_id" IS NOT NULL AND "manual_submissions"."semester_id" IS NOT NULL AND "manual_submissions"."exam_type_id" IS NOT NULL AND "manual_submissions"."question_id" IS NOT NULL AND "manual_submissions"."submission_id" IS NOT NULL) OR ("manual_submissions"."status" <> 'approved' AND "manual_submissions"."department_id" IS NULL AND "manual_submissions"."course_id" IS NULL AND "manual_submissions"."semester_id" IS NULL AND "manual_submissions"."exam_type_id" IS NULL AND "manual_submissions"."question_id" IS NULL AND "manual_submissions"."submission_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `manual_submissions_user_id_idx` ON `manual_submissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `manual_submissions_status_idx` ON `manual_submissions` (`status`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`department_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`semester_id` integer NOT NULL,
	`exam_type_id` integer NOT NULL,
	`submission_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`exam_type_id`) REFERENCES `exam_types`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `questions_combo_unique` ON `questions` (`department_id`,`course_id`,`semester_id`,`exam_type_id`);--> statement-breakpoint
CREATE INDEX `questions_course_id_idx` ON `questions` (`course_id`);--> statement-breakpoint
CREATE INDEX `questions_semester_id_idx` ON `questions` (`semester_id`);--> statement-breakpoint
CREATE INDEX `questions_exam_type_id_idx` ON `questions` (`exam_type_id`);--> statement-breakpoint
CREATE TABLE `semesters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `semesters_name_unique` ON `semesters` (`name`);--> statement-breakpoint
CREATE TABLE `submissions` (
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
CREATE INDEX `submissions_question_id_idx` ON `submissions` (`question_id`);--> statement-breakpoint
CREATE INDEX `submissions_user_id_idx` ON `submissions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`image_key` text,
	`submission_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
