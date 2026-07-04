-- Custom SQL migration file, put your code below! --

-- `view_count` on `questions` is a running sum of the `view_count` of its
-- submissions, maintained by triggers on `submissions` (mirroring the
-- `submission_count` triggers in 0001). The backfill seeds the stored sum from
-- existing rows (a no-op on a freshly migrated DB, where every view_count is 0)
-- before the triggers take over. COALESCE guards the NOT NULL column: SUM over
-- zero submissions is NULL.
--
-- NOTE: each CREATE TRIGGER is on a single line on purpose. Some SQLite runners
-- split a SQL blob on ";\n", which would chop a multi-line BEGIN…END body apart.
-- Keeping the body on one line leaves every inner ";" mid-line (followed by a
-- space), so only the trailing "END;" terminates the statement.
UPDATE `questions` SET `view_count` = (SELECT COALESCE(SUM(`view_count`), 0) FROM `submissions` WHERE `submissions`.`question_id` = `questions`.`id`);
--> statement-breakpoint
CREATE TRIGGER `submissions_view_count_after_insert` AFTER INSERT ON `submissions` BEGIN UPDATE `questions` SET `view_count` = `view_count` + NEW.`view_count` WHERE `id` = NEW.`question_id`; END;
--> statement-breakpoint
CREATE TRIGGER `submissions_view_count_after_delete` AFTER DELETE ON `submissions` BEGIN UPDATE `questions` SET `view_count` = `view_count` - OLD.`view_count` WHERE `id` = OLD.`question_id`; END;
--> statement-breakpoint
CREATE TRIGGER `submissions_view_count_after_update` AFTER UPDATE OF `view_count`, `question_id` ON `submissions` BEGIN UPDATE `questions` SET `view_count` = `view_count` - OLD.`view_count` WHERE `id` = OLD.`question_id`; UPDATE `questions` SET `view_count` = `view_count` + NEW.`view_count` WHERE `id` = NEW.`question_id`; END;
