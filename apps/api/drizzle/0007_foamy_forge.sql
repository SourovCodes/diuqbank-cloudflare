DROP INDEX `manual_submissions_legacy_id_unique`;--> statement-breakpoint
ALTER TABLE `manual_submissions` DROP COLUMN `legacy_id`;--> statement-breakpoint
DROP INDEX `submissions_legacy_id_unique`;--> statement-breakpoint
ALTER TABLE `submissions` DROP COLUMN `legacy_id`;