ALTER TABLE `questions` ADD `view_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `view_count` integer DEFAULT 0 NOT NULL;