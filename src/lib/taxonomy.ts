import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Db } from "../db/client";
import {
  courses,
  departments,
  examTypes,
  questions,
  semesters,
} from "../db/schema";
import { normalizeTaxonomyName } from "../shared/utils/normalize-name";

/**
 * Race-safe find-or-create. Try `find`; if absent, `create`; if the create
 * loses a uniqueness race, re-`find` and adopt the winner. Used by the
 * admin/manual-submission flows, which may introduce new taxonomy values.
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

export const findOrCreateDepartment = async (
  db: Db,
  rawName: string,
  rawShortName: string,
): Promise<number> => {
  const name = normalizeTaxonomyName(rawName);
  const shortName = normalizeTaxonomyName(rawShortName);
  const [byName] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.name, name))
    .limit(1);
  if (byName) return byName.id;

  // `short_name` is globally unique. If it already belongs to a different
  // department, the model likely mis-abbreviated — surface an actionable error
  // rather than a raw UNIQUE-constraint 409.
  const [byShortName] = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(eq(departments.shortName, shortName))
    .limit(1);
  if (byShortName) {
    throw new HTTPException(400, {
      message: `Department short name "${shortName}" already belongs to "${byShortName.name}". Reprocess with extra context to correct it.`,
    });
  }

  return findOrCreate(
    async () => {
      const [row] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.name, name))
        .limit(1);
      return row;
    },
    async () => {
      const [row] = await db
        .insert(departments)
        .values({ name, shortName })
        .returning({ id: departments.id });
      return row;
    },
  );
};

export const findOrCreateCourse = async (
  db: Db,
  departmentId: number,
  rawName: string,
): Promise<number> => {
  const name = normalizeTaxonomyName(rawName);
  return findOrCreate(
    async () => {
      const [row] = await db
        .select({ id: courses.id })
        .from(courses)
        .where(
          and(eq(courses.departmentId, departmentId), eq(courses.name, name)),
        )
        .limit(1);
      return row;
    },
    async () => {
      const [row] = await db
        .insert(courses)
        .values({ departmentId, name })
        .returning({ id: courses.id });
      return row;
    },
  );
};

export const findOrCreateSemester = async (
  db: Db,
  rawName: string,
): Promise<number> => {
  const name = normalizeTaxonomyName(rawName);
  return findOrCreate(
    async () => {
      const [row] = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(eq(semesters.name, name))
        .limit(1);
      return row;
    },
    async () => {
      const [row] = await db
        .insert(semesters)
        .values({ name })
        .returning({ id: semesters.id });
      return row;
    },
  );
};

export const findOrCreateExamType = async (
  db: Db,
  rawName: string,
): Promise<number> => {
  const name = normalizeTaxonomyName(rawName);
  return findOrCreate(
    async () => {
      const [row] = await db
        .select({ id: examTypes.id })
        .from(examTypes)
        .where(eq(examTypes.name, name))
        .limit(1);
      return row;
    },
    async () => {
      const [row] = await db
        .insert(examTypes)
        .values({ name })
        .returning({ id: examTypes.id });
      return row;
    },
  );
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
