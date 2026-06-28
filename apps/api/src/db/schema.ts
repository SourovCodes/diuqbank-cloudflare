import { sql, relations } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  imageKey: text("image_key"),
  // Maintained by SQLite triggers on submissions insert/delete — never write
  // this directly from application code.
  submissionCount: integer("submission_count").notNull().default(0),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export const departments = sqliteTable("departments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  shortName: text("short_name").notNull().unique(),
});

export const courses = sqliteTable(
  "courses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
  },
  (table) => [
    uniqueIndex("courses_department_name_unique").on(
      table.departmentId,
      table.name,
    ),
  ],
);

export const semesters = sqliteTable("semesters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const examTypes = sqliteTable("exam_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const questions = sqliteTable(
  "questions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    semesterId: integer("semester_id")
      .notNull()
      .references(() => semesters.id, { onDelete: "restrict" }),
    examTypeId: integer("exam_type_id")
      .notNull()
      .references(() => examTypes.id, { onDelete: "restrict" }),
    // Maintained by SQLite triggers on submissions insert/delete — never write
    // this directly from application code.
    submissionCount: integer("submission_count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("questions_combo_unique").on(
      table.departmentId,
      table.courseId,
      table.semesterId,
      table.examTypeId,
    ),
    // The composite unique covers `WHERE department_id = ?` and
    // `WHERE department_id = ? AND course_id = ?` via leftmost-prefix. The
    // remaining single-column filters on the list endpoint need their own
    // indexes to avoid full table scans.
    index("questions_course_id_idx").on(table.courseId),
    index("questions_semester_id_idx").on(table.semesterId),
    index("questions_exam_type_id_idx").on(table.examTypeId),
  ],
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    section: text("section"),
    batch: text("batch"),
    pdfKey: text("pdf_key").notNull(),
    fileSize: integer("file_size").notNull(),
    watermarkedPdfKey: text("watermarked_pdf_key"),
    watermarkStatus: text("watermark_status", {
      enum: ["awaiting", "completed", "failed"],
    })
      .notNull()
      .default("awaiting"),
    watermarkError: text("watermark_error"),
    transcription: text("transcription"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    // SQLite doesn't auto-index FK columns. Both are common filters:
    // `submissions.question_id` on /questions/:id/submissions and ?questionId=,
    // `submissions.user_id` on ?userId= (contributor profile pages).
    index("submissions_question_id_idx").on(table.questionId),
    index("submissions_user_id_idx").on(table.userId),
  ],
);

export const manualSubmissions = sqliteTable(
  "manual_submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    departmentName: text("department_name").notNull(),
    departmentShortName: text("department_short_name").notNull(),
    courseName: text("course_name").notNull(),
    semesterName: text("semester_name").notNull(),
    examTypeName: text("exam_type_name").notNull(),
    departmentId: integer("department_id").references(() => departments.id, {
      onDelete: "restrict",
    }),
    courseId: integer("course_id").references(() => courses.id, {
      onDelete: "restrict",
    }),
    semesterId: integer("semester_id").references(() => semesters.id, {
      onDelete: "restrict",
    }),
    examTypeId: integer("exam_type_id").references(() => examTypes.id, {
      onDelete: "restrict",
    }),
    pdfKey: text("pdf_key").notNull(),
    status: text("status", {
      enum: ["pending_review", "approved", "rejected"],
    })
      .notNull()
      .default("pending_review"),
    rejectedReason: text("rejected_reason"),
    reviewedBy: integer("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    questionId: integer("question_id").references(() => questions.id, {
      onDelete: "restrict",
    }),
    submissionId: integer("submission_id").references(() => submissions.id, {
      onDelete: "restrict",
    }),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("manual_submissions_user_id_idx").on(table.userId),
    index("manual_submissions_status_idx").on(table.status),
    check(
      "manual_submissions_status_check",
      sql`${table.status} IN ('pending_review', 'approved', 'rejected')`,
    ),
    check(
      "manual_submissions_approval_links_check",
      sql`(${table.status} = 'approved' AND ${table.departmentId} IS NOT NULL AND ${table.courseId} IS NOT NULL AND ${table.semesterId} IS NOT NULL AND ${table.examTypeId} IS NOT NULL AND ${table.questionId} IS NOT NULL AND ${table.submissionId} IS NOT NULL) OR (${table.status} <> 'approved' AND ${table.departmentId} IS NULL AND ${table.courseId} IS NULL AND ${table.semesterId} IS NULL AND ${table.examTypeId} IS NULL AND ${table.questionId} IS NULL AND ${table.submissionId} IS NULL)`,
    ),
  ],
);

export const coursesRelations = relations(courses, ({ one, many }) => ({
  department: one(departments, {
    fields: [courses.departmentId],
    references: [departments.id],
  }),
  questions: many(questions),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  courses: many(courses),
  questions: many(questions),
}));

export const semestersRelations = relations(semesters, ({ many }) => ({
  questions: many(questions),
}));

export const examTypesRelations = relations(examTypes, ({ many }) => ({
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  department: one(departments, {
    fields: [questions.departmentId],
    references: [departments.id],
  }),
  course: one(courses, {
    fields: [questions.courseId],
    references: [courses.id],
  }),
  semester: one(semesters, {
    fields: [questions.semesterId],
    references: [semesters.id],
  }),
  examType: one(examTypes, {
    fields: [questions.examTypeId],
    references: [examTypes.id],
  }),
  submissions: many(submissions),
  manualSubmissions: many(manualSubmissions),
}));

export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(submissions),
  manualSubmissions: many(manualSubmissions, {
    relationName: "manualSubmissionOwner",
  }),
  reviewedManualSubmissions: many(manualSubmissions, {
    relationName: "manualSubmissionReviewer",
  }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  question: one(questions, {
    fields: [submissions.questionId],
    references: [questions.id],
  }),
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
}));

export const manualSubmissionsRelations = relations(
  manualSubmissions,
  ({ one }) => ({
    user: one(users, {
      fields: [manualSubmissions.userId],
      references: [users.id],
      relationName: "manualSubmissionOwner",
    }),
    reviewer: one(users, {
      fields: [manualSubmissions.reviewedBy],
      references: [users.id],
      relationName: "manualSubmissionReviewer",
    }),
    department: one(departments, {
      fields: [manualSubmissions.departmentId],
      references: [departments.id],
    }),
    course: one(courses, {
      fields: [manualSubmissions.courseId],
      references: [courses.id],
    }),
    semester: one(semesters, {
      fields: [manualSubmissions.semesterId],
      references: [semesters.id],
    }),
    examType: one(examTypes, {
      fields: [manualSubmissions.examTypeId],
      references: [examTypes.id],
    }),
    question: one(questions, {
      fields: [manualSubmissions.questionId],
      references: [questions.id],
    }),
    submission: one(submissions, {
      fields: [manualSubmissions.submissionId],
      references: [submissions.id],
    }),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Semester = typeof semesters.$inferSelect;
export type ExamType = typeof examTypes.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type ManualSubmission = typeof manualSubmissions.$inferSelect;
