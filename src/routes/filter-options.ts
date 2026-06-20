import { Hono } from "hono";
import { asc } from "drizzle-orm";

import { getDb } from "../db/client";
import { courses, departments, examTypes, semesters } from "../db/schema";
import type { AppEnv } from "../types";

const filterOptions = new Hono<AppEnv>();

// All the lookup entities a client needs to build the questions filter UI.
filterOptions.get("/", async (c) => {
  const db = getDb(c.env.DB);

  const [departmentRows, courseRows, semesterRows, examTypeRows] =
    await Promise.all([
      db
        .select({
          id: departments.id,
          name: departments.name,
          shortName: departments.shortName,
        })
        .from(departments)
        .orderBy(asc(departments.name)),
      db
        .select({
          id: courses.id,
          departmentId: courses.departmentId,
          name: courses.name,
        })
        .from(courses)
        .orderBy(asc(courses.name)),
      db
        .select({ id: semesters.id, name: semesters.name })
        .from(semesters)
        .orderBy(asc(semesters.id)),
      db
        .select({ id: examTypes.id, name: examTypes.name })
        .from(examTypes)
        .orderBy(asc(examTypes.name)),
    ]);

  return c.json({
    departments: departmentRows,
    courses: courseRows,
    semesters: semesterRows,
    examTypes: examTypeRows,
  });
});

export default filterOptions;
