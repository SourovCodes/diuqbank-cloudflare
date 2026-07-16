import { and, eq } from "drizzle-orm";

import type { Db } from "../db/client";
import { questions } from "../db/schema";

/**
 * Race-safe find-or-create. Try `find`; if absent, `create`; if the create
 * loses a uniqueness race, re-`find` and adopt the winner.
 *
 * Only the QUESTION row (the unique combination of the four taxonomy ids) is
 * ever find-or-created — taxonomy entities themselves (departments, courses,
 * semesters, exam types) are created exclusively through the admin CRUD
 * routes. The manual-submission approve path resolves free-text values to
 * existing entities and refuses to publish when one is missing.
 */
const findOrCreate = async (
  find: () => Promise<{ id: number } | undefined>,
  create: () => Promise<{ id: number }>,
): Promise<number> => {
  const existing = await find();
  if (existing) return existing.id;
  try {
    return (await create()).id;
  } catch (err) {
    const reFound = await find();
    if (reFound) return reFound.id;
    throw err;
  }
};

export const findOrCreateQuestion = async (
  db: Db,
  ids: {
    departmentId: number;
    courseId: number;
    semesterId: number;
    examTypeId: number;
  },
): Promise<number> =>
  findOrCreate(
    async () => {
      const [row] = await db
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(
            eq(questions.departmentId, ids.departmentId),
            eq(questions.courseId, ids.courseId),
            eq(questions.semesterId, ids.semesterId),
            eq(questions.examTypeId, ids.examTypeId),
          ),
        )
        .limit(1);
      return row;
    },
    async () => {
      const [row] = await db
        .insert(questions)
        .values(ids)
        .returning({ id: questions.id });
      return row;
    },
  );
