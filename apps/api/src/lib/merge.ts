import type { BatchItem } from "drizzle-orm/batch";
import { inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { getDb, type Db } from "../db/client";
import {
  manualSubmissions,
  courses,
  departments,
  examTypes,
  questions,
  semesters,
  submissions,
} from "../db/schema";

// A single statement in a D1 batch. The drizzle d1 `db.batch()` runs them
// sequentially inside one transaction, so ordering within the array matters.
type Stmt = BatchItem<"sqlite">;

export type MergeCounts = {
  itemsDeleted: number;
  questionsCombined: number;
  submissionsMoved: number;
  coursesMerged?: number;
};

/** A planned merge: statements to run plus the impact, computed from reads. */
export type MergePlan = { db: Db; statements: Stmt[]; counts: MergeCounts };

/** Execute a plan atomically. A plan always has ≥1 statement (the final delete). */
export const runMerge = (plan: MergePlan) =>
  plan.db.batch(plan.statements as [Stmt, ...Stmt[]]);

// The four columns that together make a question unique
// (`questions_combo_unique`).
const QCOLS = [
  "departmentId",
  "courseId",
  "semesterId",
  "examTypeId",
] as const;
type QCol = (typeof QCOLS)[number];
type Combo = Record<QCol, number>;
type AffectedQuestion = Combo & { id: number; submissionCount: number };

const QSELECT = {
  id: questions.id,
  departmentId: questions.departmentId,
  courseId: questions.courseId,
  semesterId: questions.semesterId,
  examTypeId: questions.examTypeId,
  submissionCount: questions.submissionCount,
};

/**
 * Reconcile a set of questions after a category remap. `finalOf` returns the
 * 4-tuple each question will have once the merge is applied; questions that
 * collapse to the same tuple are auto-merged — the lowest `id` survives, the
 * rest have their submissions repointed to it and are deleted (the
 * `questions` table has no timestamp, so id is the age order).
 *
 * No transient unique-constraint violations are possible: loser questions are
 * deleted before any survivor's combo is updated, and distinct survivors always
 * have distinct final combos, so two survivors can never contend for one slot.
 */
function reconcileQuestions(
  db: Db,
  affected: AffectedQuestion[],
  finalOf: (q: AffectedQuestion) => Combo,
): { statements: Stmt[]; questionsCombined: number; submissionsMoved: number; loserIds: number[] } {
  const groups = new Map<string, { final: Combo; rows: AffectedQuestion[] }>();
  for (const q of affected) {
    const final = finalOf(q);
    const key = `${final.departmentId}|${final.courseId}|${final.semesterId}|${final.examTypeId}`;
    const g = groups.get(key);
    if (g) g.rows.push(q);
    else groups.set(key, { final, rows: [q] });
  }

  const repoints: Stmt[] = [];
  const loserIds: number[] = [];
  let submissionsMoved = 0;
  // Survivor column updates, grouped by `<column> = <value>` so each distinct
  // target value is a single set-based UPDATE.
  const colUpdates = new Map<string, { col: QCol; value: number; ids: number[] }>();

  for (const { final, rows } of groups.values()) {
    rows.sort((a, b) => a.id - b.id);
    const survivor = rows[0];
    const losers = rows.slice(1);
    if (losers.length) {
      const lids = losers.map((l) => l.id);
      loserIds.push(...lids);
      submissionsMoved += losers.reduce((s, l) => s + l.submissionCount, 0);
      repoints.push(
        db
          .update(submissions)
          .set({ questionId: survivor.id })
          .where(inArray(submissions.questionId, lids)),
      );
      // Published manual submissions link to the question they were published
      // to via `manual_submissions.question_id` (onDelete: restrict). Repoint
      // them onto the survivor too, otherwise deleting the loser questions
      // below fails with a FOREIGN KEY constraint error.
      repoints.push(
        db
          .update(manualSubmissions)
          .set({ questionId: survivor.id })
          .where(inArray(manualSubmissions.questionId, lids)),
      );
    }
    for (const col of QCOLS) {
      if (final[col] !== survivor[col]) {
        const key = `${col}=${final[col]}`;
        const acc = colUpdates.get(key);
        if (acc) acc.ids.push(survivor.id);
        else colUpdates.set(key, { col, value: final[col], ids: [survivor.id] });
      }
    }
  }

  // Order: repoint submissions → delete losers → update survivors.
  const statements: Stmt[] = [...repoints];
  if (loserIds.length) {
    statements.push(db.delete(questions).where(inArray(questions.id, loserIds)));
  }
  for (const { col, value, ids } of colUpdates.values()) {
    statements.push(
      db
        .update(questions)
        .set({ [col]: value } as Partial<typeof questions.$inferInsert>)
        .where(inArray(questions.id, ids)),
    );
  }

  return { statements, questionsCombined: loserIds.length, submissionsMoved, loserIds };
}

const combo = (q: AffectedQuestion): Combo => ({
  departmentId: q.departmentId,
  courseId: q.courseId,
  semesterId: q.semesterId,
  examTypeId: q.examTypeId,
});

const dedupe = (ids: number[]) => [...new Set(ids)];

// --- Per-resource planners ---------------------------------------------------

export async function planSemesterMerge(
  d1: D1Database,
  keepId: number,
  rawLoserIds: number[],
): Promise<MergePlan> {
  const db = getDb(d1);
  const loserIds = dedupe(rawLoserIds);
  const ids = [keepId, ...loserIds];
  const rows = await db
    .select({ id: semesters.id })
    .from(semesters)
    .where(inArray(semesters.id, ids));
  if (rows.length !== ids.length) throw new HTTPException(404, { message: "Semester not found" });

  const affected = await db.select(QSELECT).from(questions).where(inArray(questions.semesterId, ids));
  const r = reconcileQuestions(db, affected, (q) => ({ ...combo(q), semesterId: keepId }));

  const statements: Stmt[] = [
    ...r.statements,
    db.delete(semesters).where(inArray(semesters.id, loserIds)),
  ];
  return {
    db,
    statements,
    counts: {
      itemsDeleted: loserIds.length,
      questionsCombined: r.questionsCombined,
      submissionsMoved: r.submissionsMoved,
    },
  };
}

export async function planExamTypeMerge(
  d1: D1Database,
  keepId: number,
  rawLoserIds: number[],
): Promise<MergePlan> {
  const db = getDb(d1);
  const loserIds = dedupe(rawLoserIds);
  const ids = [keepId, ...loserIds];
  const rows = await db
    .select({ id: examTypes.id })
    .from(examTypes)
    .where(inArray(examTypes.id, ids));
  if (rows.length !== ids.length) throw new HTTPException(404, { message: "Exam type not found" });

  const affected = await db.select(QSELECT).from(questions).where(inArray(questions.examTypeId, ids));
  const r = reconcileQuestions(db, affected, (q) => ({ ...combo(q), examTypeId: keepId }));

  const statements: Stmt[] = [
    ...r.statements,
    db.delete(examTypes).where(inArray(examTypes.id, loserIds)),
  ];
  return {
    db,
    statements,
    counts: {
      itemsDeleted: loserIds.length,
      questionsCombined: r.questionsCombined,
      submissionsMoved: r.submissionsMoved,
    },
  };
}

export async function planCourseMerge(
  d1: D1Database,
  keepId: number,
  rawLoserIds: number[],
): Promise<MergePlan> {
  const db = getDb(d1);
  const loserIds = dedupe(rawLoserIds);
  const ids = [keepId, ...loserIds];
  const rows = await db
    .select({ id: courses.id, departmentId: courses.departmentId })
    .from(courses)
    .where(inArray(courses.id, ids));
  if (rows.length !== ids.length) throw new HTTPException(404, { message: "Course not found" });

  // Courses may only be merged within one department.
  const keepDept = rows.find((r) => r.id === keepId)!.departmentId;
  if (rows.some((r) => r.departmentId !== keepDept)) {
    throw new HTTPException(400, {
      message: "Courses must belong to the same department to merge",
    });
  }

  const affected = await db.select(QSELECT).from(questions).where(inArray(questions.courseId, ids));
  const r = reconcileQuestions(db, affected, (q) => ({ ...combo(q), courseId: keepId }));

  const statements: Stmt[] = [
    ...r.statements,
    db.delete(courses).where(inArray(courses.id, loserIds)),
  ];
  return {
    db,
    statements,
    counts: {
      itemsDeleted: loserIds.length,
      questionsCombined: r.questionsCombined,
      submissionsMoved: r.submissionsMoved,
    },
  };
}

export async function planDepartmentMerge(
  d1: D1Database,
  keepId: number,
  rawLoserIds: number[],
): Promise<MergePlan> {
  const db = getDb(d1);
  const loserIds = dedupe(rawLoserIds);
  const ids = [keepId, ...loserIds];
  const rows = await db
    .select({ id: departments.id })
    .from(departments)
    .where(inArray(departments.id, ids));
  if (rows.length !== ids.length) throw new HTTPException(404, { message: "Department not found" });

  // Course cascade: `courses` is UNIQUE(department_id, name), so same-named
  // courses across the merged departments must collapse. Group involved courses
  // by name; in each ≥2 group the lowest-id course survives and the rest are
  // remapped onto it (which auto-merges their questions in the pass below).
  const involved = await db
    .select({ id: courses.id, name: courses.name, departmentId: courses.departmentId })
    .from(courses)
    .where(inArray(courses.departmentId, ids));
  const byName = new Map<string, typeof involved>();
  for (const co of involved) {
    const g = byName.get(co.name);
    if (g) g.push(co);
    else byName.set(co.name, [co]);
  }

  const courseRemap = new Map<number, number>(); // loser course id → survivor course id
  const courseCleanup: Stmt[] = [];
  let coursesMerged = 0;
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.id - b.id);
    const survivor = group[0];
    const losers = group.slice(1);
    coursesMerged += losers.length;
    const loserCourseIds = losers.map((c) => c.id);
    for (const lid of loserCourseIds) courseRemap.set(lid, survivor.id);
    courseCleanup.push(db.delete(courses).where(inArray(courses.id, loserCourseIds)));
  }

  // Reconcile every question in the involved departments in one pass, applying
  // both the department remap (loser depts → keep) and the course remap.
  const loserDepts = new Set(loserIds);
  const affected = await db
    .select(QSELECT)
    .from(questions)
    .where(inArray(questions.departmentId, ids));
  const r = reconcileQuestions(db, affected, (q) => ({
    departmentId: loserDepts.has(q.departmentId) ? keepId : q.departmentId,
    courseId: courseRemap.get(q.courseId) ?? q.courseId,
    semesterId: q.semesterId,
    examTypeId: q.examTypeId,
  }));

  // Order matters: questions are reconciled first (loser questions deleted,
  // survivors repointed off loser courses) before loser courses are deleted;
  // remaining courses are moved to the keep department only once names are
  // unique within it; loser departments are deleted last, now unreferenced.
  const statements: Stmt[] = [
    ...r.statements,
    ...courseCleanup,
    db
      .update(courses)
      .set({ departmentId: keepId })
      .where(inArray(courses.departmentId, loserIds)),
    db.delete(departments).where(inArray(departments.id, loserIds)),
  ];
  return {
    db,
    statements,
    counts: {
      itemsDeleted: loserIds.length,
      coursesMerged,
      questionsCombined: r.questionsCombined,
      submissionsMoved: r.submissionsMoved,
    },
  };
}
