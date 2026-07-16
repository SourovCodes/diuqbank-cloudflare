import { Hono } from "hono";
import { asc } from "drizzle-orm";

import { getDb } from "../db/client";
import { courses, departments, examTypes, semesters } from "../db/schema";
import { withCache } from "../lib/cache";
import { sortSemesters } from "../lib/semester-sort";
import type { AppEnv } from "../types";

const filterOptions = new Hono<AppEnv>();

// All the lookup entities a client needs to build the questions filter UI.
// Cached on the `tax` token (1 day backstop); bumped by any taxonomy write.
filterOptions.get("/", (c) =>
  withCache(c, { versions: ["tax"], key: "filter-options:v2", ttl: 86400 }, async () => {
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
        db.select({ id: semesters.id, name: semesters.name }).from(semesters),
        db
          .select({ id: examTypes.id, name: examTypes.name })
          .from(examTypes)
          .orderBy(asc(examTypes.name)),
      ]);

    return {
      departments: departmentRows,
      courses: courseRows,
      // Latest year first, then Fall > Summer > Spring > Short within a year.
      semesters: sortSemesters(semesterRows),
      examTypes: examTypeRows,
    };
  }),
);

export default filterOptions;
