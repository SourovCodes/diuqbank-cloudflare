-- The system never stores "&" in taxonomy names — always the word "and"
-- (mirrors normalizeTaxonomyName in src/shared/utils/normalize-name.ts).
-- Replace "&" with " and ", then collapse runs of spaces and trim, so both
-- "A & B" and "A&B" become "A and B". Verified against production before
-- writing: no "and"-twin exists for any "&" row, so plain UPDATEs cannot
-- violate the unique indexes.
UPDATE `departments` SET `name` = trim(replace(replace(replace(`name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `name` LIKE '%&%';--> statement-breakpoint
UPDATE `departments` SET `short_name` = trim(replace(replace(replace(`short_name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `short_name` LIKE '%&%';--> statement-breakpoint
UPDATE `courses` SET `name` = trim(replace(replace(replace(`name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `name` LIKE '%&%';--> statement-breakpoint
UPDATE `semesters` SET `name` = trim(replace(replace(replace(`name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `name` LIKE '%&%';--> statement-breakpoint
UPDATE `exam_types` SET `name` = trim(replace(replace(replace(`name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `name` LIKE '%&%';--> statement-breakpoint
UPDATE `manual_submissions` SET `department_name` = trim(replace(replace(replace(`department_name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `department_name` LIKE '%&%';--> statement-breakpoint
UPDATE `manual_submissions` SET `department_short_name` = trim(replace(replace(replace(`department_short_name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `department_short_name` LIKE '%&%';--> statement-breakpoint
UPDATE `manual_submissions` SET `course_name` = trim(replace(replace(replace(`course_name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `course_name` LIKE '%&%';--> statement-breakpoint
UPDATE `manual_submissions` SET `semester_name` = trim(replace(replace(replace(`semester_name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `semester_name` LIKE '%&%';--> statement-breakpoint
UPDATE `manual_submissions` SET `exam_type_name` = trim(replace(replace(replace(`exam_type_name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `exam_type_name` LIKE '%&%';--> statement-breakpoint
UPDATE `auto_submissions` SET `extracted_department_name` = trim(replace(replace(replace(`extracted_department_name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `extracted_department_name` LIKE '%&%';--> statement-breakpoint
UPDATE `auto_submissions` SET `extracted_department_short_name` = trim(replace(replace(replace(`extracted_department_short_name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `extracted_department_short_name` LIKE '%&%';--> statement-breakpoint
UPDATE `auto_submissions` SET `extracted_course_name` = trim(replace(replace(replace(`extracted_course_name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `extracted_course_name` LIKE '%&%';--> statement-breakpoint
UPDATE `auto_submissions` SET `extracted_semester_name` = trim(replace(replace(replace(`extracted_semester_name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `extracted_semester_name` LIKE '%&%';--> statement-breakpoint
UPDATE `auto_submissions` SET `extracted_exam_type_name` = trim(replace(replace(replace(`extracted_exam_type_name`, '&', ' and '), '  ', ' '), '  ', ' ')) WHERE `extracted_exam_type_name` LIKE '%&%';
