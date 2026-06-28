ALTER TABLE `manual_submissions` ADD `legacy_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `manual_submissions_legacy_id_unique` ON `manual_submissions` (`legacy_id`);