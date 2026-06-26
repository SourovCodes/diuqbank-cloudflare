-- Custom SQL migration file, put your code below! --

-- `submission_count` on `users` and `questions` was previously never maintained
-- (read endpoints recomputed it), so the stored values are all 0. Backfill them
-- from the real submission rows, then keep them in sync with triggers.
--
-- NOTE: each CREATE TRIGGER is on a single line on purpose. Some SQLite runners
-- split a SQL blob on ";\n", which would chop a multi-line BEGIN…END body apart.
-- Keeping the body on one line leaves every inner ";" mid-line (followed by a
-- space), so only the trailing "END;" terminates the statement.
UPDATE `users` SET `submission_count` = (SELECT count(*) FROM `submissions` WHERE `submissions`.`user_id` = `users`.`id`);
--> statement-breakpoint
UPDATE `questions` SET `submission_count` = (SELECT count(*) FROM `submissions` WHERE `submissions`.`question_id` = `questions`.`id`);
--> statement-breakpoint
CREATE TRIGGER `submissions_after_insert` AFTER INSERT ON `submissions` BEGIN UPDATE `users` SET `submission_count` = `submission_count` + 1 WHERE `id` = NEW.`user_id`; UPDATE `questions` SET `submission_count` = `submission_count` + 1 WHERE `id` = NEW.`question_id`; END;
--> statement-breakpoint
CREATE TRIGGER `submissions_after_delete` AFTER DELETE ON `submissions` BEGIN UPDATE `users` SET `submission_count` = `submission_count` - 1 WHERE `id` = OLD.`user_id`; UPDATE `questions` SET `submission_count` = `submission_count` - 1 WHERE `id` = OLD.`question_id`; END;
--> statement-breakpoint
CREATE TRIGGER `submissions_after_update` AFTER UPDATE OF `user_id`, `question_id` ON `submissions` BEGIN UPDATE `users` SET `submission_count` = `submission_count` - 1 WHERE `id` = OLD.`user_id`; UPDATE `users` SET `submission_count` = `submission_count` + 1 WHERE `id` = NEW.`user_id`; UPDATE `questions` SET `submission_count` = `submission_count` - 1 WHERE `id` = OLD.`question_id`; UPDATE `questions` SET `submission_count` = `submission_count` + 1 WHERE `id` = NEW.`question_id`; END;
