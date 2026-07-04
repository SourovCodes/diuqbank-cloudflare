ALTER TABLE `submissions` ADD `legacy_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_legacy_id_unique` ON `submissions` (`legacy_id`);