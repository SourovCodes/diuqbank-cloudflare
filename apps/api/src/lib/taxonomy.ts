import { and, eq, like } from "drizzle-orm";

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
 * admin/auto-submission flows, which may introduce new taxonomy values.
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

// Filler words skipped when deriving a short name from a department name.
const SHORT_NAME_STOP_WORDS = new Set(["and", "of", "the", "in", "for"]);

/**
 * Derive a unique short name from a department name: initials of the
 * significant words ("Computer Science and Engineering" -> "CSE"), or the
 * whole word uppercased for single-word names ("Pharmacy" -> "PHARMACY").
 * When the abbreviation is already taken, append the next free numeric
 * suffix ("CSE" -> "CSE2", "CSE3", ...). `short_name` compares
 * case-insensitively here because SQLite LIKE is case-insensitive for ASCII.
 */
const generateShortName = async (db: Db, name: string): Promise<string> => {
  const words = name
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w && !SHORT_NAME_STOP_WORDS.has(w.toLowerCase()));
  const base =
    (words.length > 1 ? words.map((w) => w[0]).join("") : words[0] ?? "DEPT")
      .toUpperCase()
      .slice(0, 20);

  const taken = new Set(
    (
      await db
        .select({ shortName: departments.shortName })
        .from(departments)
        .where(like(departments.shortName, `${base}%`))
    ).map((row) => row.shortName.toUpperCase()),
  );
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix++) {
    const candidate = `${base}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
};

/**
 * The short name is always generated from the name — callers (the AI
 * auto-submission publish path) no longer supply one. Retries cover both
 * races: losing on `name` re-finds the winner, losing on `short_name`
 * regenerates with the next suffix.
 */
export const findOrCreateDepartment = async (
  db: Db,
  rawName: string,
): Promise<number> => {
  const name = normalizeTaxonomyName(rawName);
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; ; attempt++) {
    const [byName] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.name, name))
      .limit(1);
    if (byName) return byName.id;

    const shortName = await generateShortName(db, name);
    try {
      const [row] = await db
        .insert(departments)
        .values({ name, shortName })
        .returning({ id: departments.id });
      return row.id;
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS) throw err;
    }
  }
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
