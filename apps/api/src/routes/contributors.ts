import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { count, desc, eq, gt } from "drizzle-orm";

import { getDb } from "../db/client";
import { submissions, users } from "../db/schema";
import { withCache } from "../lib/cache";
import { buildMeta } from "../shared/utils/pagination";
import { buildQuestionTitle } from "../shared/utils/question-title";
import { fileUrlFor, toContributor } from "../lib/user-shape";
import { validate } from "../lib/validator";
import {
  contributorSubmissionsQuery,
  contributorsListQuery,
} from "../shared/schemas/contributors";
import type { AppEnv } from "../types";

const contributors = new Hono<AppEnv>();

// Eager-load shape for a contributor's submissions: the parent question (id +
// its lookup entities, which both build the title and are returned in full). No
// contributor — the list is already scoped to one.
const submissionWith = {
  question: {
    columns: { id: true },
    with: {
      department: { columns: { id: true, name: true, shortName: true } },
      course: { columns: { id: true, departmentId: true, name: true } },
      semester: { columns: { id: true, name: true } },
      examType: { columns: { id: true, name: true } },
    },
  },
} as const;

// Contributors = users with at least one submission, most prolific first.
contributors.get("/", validate("query", contributorsListQuery), (c) => {
  const { page, perPage } = c.req.valid("query");

  return withCache(
    c,
    { versions: ["c:list"], key: `contributors:list:${page}:${perPage}` },
    async () => {
      const db = getDb(c.env.DB);

      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          imageKey: users.imageKey,
          createdAt: users.createdAt,
          submissionCount: users.submissionCount,
        })
        .from(users)
        .where(gt(users.submissionCount, 0))
        .orderBy(desc(users.submissionCount), desc(users.id))
        .limit(perPage)
        .offset((page - 1) * perPage);

      const [{ value: total }] = await db
        .select({ value: count() })
        .from(users)
        .where(gt(users.submissionCount, 0));

      return {
        data: rows.map((row) => toContributor(row)),
        meta: buildMeta(page, perPage, total),
      };
    },
  );
});

contributors.get("/:username", (c) => {
  const username = c.req.param("username");

  return withCache(
    c,
    { versions: [`c:${username}`], key: `contributors:${username}` },
    async () => {
      const db = getDb(c.env.DB);

      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          imageKey: users.imageKey,
          createdAt: users.createdAt,
          submissionCount: users.submissionCount,
        })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        throw new HTTPException(404, { message: "Contributor not found" });
      }

      return toContributor(user);
    },
  );
});

// A contributor's own submissions, newest first. Unlike the question-scoped
// public submissions, each row carries its parent question (id + title) instead
// of the contributor.
contributors.get(
  "/:username/submissions",
  validate("query", contributorSubmissionsQuery),
  (c) => {
    const username = c.req.param("username");
    const { page, perPage } = c.req.valid("query");

    // Depends on this contributor's submissions (`c:<username>`) and the
    // taxonomy names in each parent question's title (`tax`). Question retitles
    // are bounded by the cache TTL.
    return withCache(
      c,
      {
        versions: [`c:${username}`, "tax"],
        key: `contributors:${username}:submissions:${page}:${perPage}`,
      },
      async () => {
        const db = getDb(c.env.DB);

        // Confirm the contributor exists so a bad username is a clear 404, not an
        // empty list.
        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
        if (!user) {
          throw new HTTPException(404, { message: "Contributor not found" });
        }

        const [rows, [{ value: total }]] = await Promise.all([
          db.query.submissions.findMany({
            where: eq(submissions.userId, user.id),
            columns: {
              id: true,
              section: true,
              batch: true,
              fileSize: true,
              viewCount: true,
              createdAt: true,
              pdfKey: true,
              watermarkedPdfKey: true,
            },
            with: submissionWith,
            orderBy: desc(submissions.createdAt),
            limit: perPage,
            offset: (page - 1) * perPage,
          }),
          db
            .select({ value: count() })
            .from(submissions)
            .where(eq(submissions.userId, user.id)),
        ]);

        return {
          data: rows.map((s) => ({
            id: s.id,
            question: {
              id: s.question.id,
              title: buildQuestionTitle(s.question),
              department: s.question.department,
              course: s.question.course,
              semester: s.question.semester,
              examType: s.question.examType,
            },
            section: s.section,
            batch: s.batch,
            fileSize: s.fileSize,
            viewCount: s.viewCount,
            createdAt: s.createdAt,
            // Prefer the watermarked file once it exists; fall back to the original.
            pdfUrl: fileUrlFor(s.watermarkedPdfKey ?? s.pdfKey),
          })),
          meta: buildMeta(page, perPage, total),
        };
      },
    );
  },
);

export default contributors;
