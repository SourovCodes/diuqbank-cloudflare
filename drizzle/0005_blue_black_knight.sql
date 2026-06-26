PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_manual_submissions` (
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
	CONSTRAINT "manual_submissions_status_check" CHECK("__new_manual_submissions"."status" IN ('pending_review', 'approved', 'rejected')),
	CONSTRAINT "manual_submissions_approval_links_check" CHECK(("__new_manual_submissions"."status" = 'approved' AND "__new_manual_submissions"."department_id" IS NOT NULL AND "__new_manual_submissions"."course_id" IS NOT NULL AND "__new_manual_submissions"."semester_id" IS NOT NULL AND "__new_manual_submissions"."exam_type_id" IS NOT NULL AND "__new_manual_submissions"."question_id" IS NOT NULL AND "__new_manual_submissions"."submission_id" IS NOT NULL) OR ("__new_manual_submissions"."status" <> 'approved' AND "__new_manual_submissions"."department_id" IS NULL AND "__new_manual_submissions"."course_id" IS NULL AND "__new_manual_submissions"."semester_id" IS NULL AND "__new_manual_submissions"."exam_type_id" IS NULL AND "__new_manual_submissions"."question_id" IS NULL AND "__new_manual_submissions"."submission_id" IS NULL))
);
--> statement-breakpoint
INSERT INTO `__new_manual_submissions`(
	"id", "user_id", "department_name", "department_short_name", "course_name",
	"semester_name", "exam_type_name", "department_id", "course_id", "semester_id",
	"exam_type_id", "pdf_key", "status", "rejected_reason", "reviewed_by",
	"question_id", "submission_id", "created_at"
)
SELECT
	m."id",
	m."user_id",
	d."name",
	d."short_name",
	c."name",
	s."name",
	e."name",
	CASE WHEN m."status" = 'approved' THEN m."department_id" ELSE NULL END,
	CASE WHEN m."status" = 'approved' THEN m."course_id" ELSE NULL END,
	CASE WHEN m."status" = 'approved' THEN m."semester_id" ELSE NULL END,
	CASE WHEN m."status" = 'approved' THEN m."exam_type_id" ELSE NULL END,
	m."pdf_key",
	m."status",
	m."rejected_reason",
	m."reviewed_by",
	m."question_id",
	m."submission_id",
	m."created_at"
FROM `manual_submissions` AS m
INNER JOIN `departments` AS d ON d."id" = m."department_id"
INNER JOIN `courses` AS c ON c."id" = m."course_id"
INNER JOIN `semesters` AS s ON s."id" = m."semester_id"
INNER JOIN `exam_types` AS e ON e."id" = m."exam_type_id";--> statement-breakpoint
DROP TABLE `manual_submissions`;--> statement-breakpoint
ALTER TABLE `__new_manual_submissions` RENAME TO `manual_submissions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `manual_submissions_user_id_idx` ON `manual_submissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `manual_submissions_status_idx` ON `manual_submissions` (`status`);
