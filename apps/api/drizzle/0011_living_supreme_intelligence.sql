ALTER TABLE `auto_submissions` ADD `legacy_id` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `auto_submissions_legacy_id_unique` ON `auto_submissions` (`legacy_id`);