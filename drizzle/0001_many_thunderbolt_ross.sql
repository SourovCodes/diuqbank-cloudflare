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
	`user_id` integer,
	`section` text,
	`batch` text,
	`pdf_key` text NOT NULL,
	`file_size` integer NOT NULL,
	`watermarked_pdf_key` text,
	`watermark_status` text DEFAULT 'awaiting' NOT NULL,
	`watermark_error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `submissions_question_id_idx` ON `submissions` (`question_id`);--> statement-breakpoint
CREATE INDEX `submissions_user_id_idx` ON `submissions` (`user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `submission_count` integer DEFAULT 0 NOT NULL;