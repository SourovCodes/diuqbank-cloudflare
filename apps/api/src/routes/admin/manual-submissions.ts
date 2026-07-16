import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq, type SQL } from "drizzle-orm";

import { getDb, type Db } from "../../db/client";
import {
  manualSubmissions,
  type ManualSubmission,
  type User,
} from "../../db/schema";
import { buildMeta } from "../../shared/utils/pagination";
import type {
  AdminManualSubmission,
  AdminManualSubmissionDetail,
} from "../../shared/types";
import {
  publishManualSubmission,
  resolveTaxonomyMatches,
} from "../../lib/manual-submission";
import { loadContributorStats } from "../../lib/contributor-stats";
import { parseId } from "../../lib/parse-id";
import { fileUrlFor, toAuthUser } from "../../lib/user-shape";
import { validate } from "../../lib/validator";
import {
  adminManualSubmissionRejectSchema,
  adminManualSubmissionsListQuery,
  adminManualSubmissionUpdateSchema,
} from "../../shared/schemas/admin/manual-submissions";
import type { AppEnv } from "../../types";

const route = new Hono<AppEnv>();

const lookupWith = {
  user: {
    columns: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      imageKey: true,
      createdAt: true,
    },
  },
  reviewer: {
    columns: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      imageKey: true,
      createdAt: true,
    },
  },
} as const;

type EmbeddedUser = Pick<
  User,
  "id" | "name" | "email" | "username" | "role" | "imageKey" | "createdAt"
>;

type AdminManualSubmissionRow = ManualSubmission & {
  user: EmbeddedUser;
  reviewer: EmbeddedUser | null;
};

const toAdminManualSubmission = (
  row: AdminManualSubmissionRow,
): AdminManualSubmission => ({
  id: row.id,
  userId: row.userId,
  legacyId: row.legacyId,
  legacyViews: row.legacyViews,
  contributor: toAuthUser(row.user),
  status: row.status,
  departmentName: row.departmentName,
  courseName: row.courseName,
  semesterName: row.semesterName,
  examTypeName: row.examTypeName,
  section: row.section,
  batch: row.batch,
  fileSize: row.fileSize,
  rejectedReason: row.rejectedReason,
  reviewedBy: row.reviewedBy,
  reviewer: row.reviewer ? toAuthUser(row.reviewer) : null,
  questionId: row.questionId,
  submissionId: row.submissionId,
  pdfUrl: fileUrlFor(row.pdfKey),
  createdAt: row.createdAt,
});

const loadManualSubmission = async (db: Db, id: number) => {
  const row = await db.query.manualSubmissions.findFirst({
    where: eq(manualSubmissions.id, id),
    with: lookupWith,
  });
  return row ? toAdminManualSubmission(row) : null;
};

/** Detail shape: the row plus contributor stats and taxonomy resolution. */
const loadManualSubmissionDetail = async (
  db: Db,
  id: number,
): Promise<AdminManualSubmissionDetail | null> => {
  const detail = await loadManualSubmission(db, id);
  if (!detail) return null;
  const [contributorStats, taxonomyMatches] = await Promise.all([
    loadContributorStats(db, detail.userId),
    resolveTaxonomyMatches(db, detail),
  ]);
  return { ...detail, contributorStats, taxonomyMatches };
};

route.get("/", validate("query", adminManualSubmissionsListQuery), async (c) => {
  const { page, perPage, status, userId } = c.req.valid("query");
  const db = getDb(c.env.DB);

  const filters: SQL[] = [];
  if (status) filters.push(eq(manualSubmissions.status, status));
  if (userId) filters.push(eq(manualSubmissions.userId, userId));
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.query.manualSubmissions.findMany({
      where,
      with: lookupWith,
      // Arrival order, not created_at: legacy imports carry their historical
      // upload date, which would otherwise sink fresh rows to the bottom of
      // the review queue.
      orderBy: desc(manualSubmissions.id),
      limit: perPage,
      offset: (page - 1) * perPage,
    }),
    db.select({ value: count() }).from(manualSubmissions).where(where),
  ]);

  return c.json({
    data: items.map((item) => toAdminManualSubmission(item)),
    meta: buildMeta(page, perPage, total),
  });
});

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }

  const db = getDb(c.env.DB);
  const detail = await loadManualSubmissionDetail(db, id);
  if (!detail) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }
  return c.json(detail);
});

route.patch(
  "/:id",
  validate("json", adminManualSubmissionUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (id === null) {
      throw new HTTPException(404, { message: "Manual submission not found" });
    }

    const input = c.req.valid("json");
    if (Object.keys(input).length === 0) {
      throw new HTTPException(400, { message: "No fields to update" });
    }

    const db = getDb(c.env.DB);
    const [existing] = await db
      .select({ status: manualSubmissions.status })
      .from(manualSubmissions)
      .where(eq(manualSubmissions.id, id))
      .limit(1);
    if (!existing) {
      throw new HTTPException(404, { message: "Manual submission not found" });
    }
    if (existing.status === "published") {
      throw new HTTPException(409, {
        message: "Published manual submissions cannot be edited",
      });
    }

    // section/batch may be cleared by sending an empty string; the taxonomy
    // names are non-empty whenever present (enforced by the schema).
    const update: Partial<typeof manualSubmissions.$inferInsert> = {};
    if (input.departmentName !== undefined)
      update.departmentName = input.departmentName;
    if (input.courseName !== undefined) update.courseName = input.courseName;
    if (input.semesterName !== undefined)
      update.semesterName = input.semesterName;
    if (input.examTypeName !== undefined)
      update.examTypeName = input.examTypeName;
    if (input.section !== undefined) update.section = input.section || null;
    if (input.batch !== undefined) update.batch = input.batch || null;

    await db
      .update(manualSubmissions)
      .set(update)
      .where(eq(manualSubmissions.id, id));

    const detail = await loadManualSubmissionDetail(db, id);
    if (!detail) {
      throw new HTTPException(404, { message: "Manual submission not found" });
    }
    return c.json(detail);
  },
);

route.post("/:id/approve", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }

  const db = getDb(c.env.DB);
  const [existing] = await db
    .select({ status: manualSubmissions.status })
    .from(manualSubmissions)
    .where(eq(manualSubmissions.id, id))
    .limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }
  if (existing.status === "published") {
    throw new HTTPException(409, {
      message: "Manual submission is already published",
    });
  }

  // Throws 409 (with the list of missing entities) unless every taxonomy value
  // resolves to an existing entity; never creates taxonomy itself.
  const submissionId = await publishManualSubmission(
    c.env,
    db,
    id,
    c.get("user").sub,
  );
  if (submissionId === null) {
    throw new HTTPException(409, {
      message: "Manual submission could not be approved",
    });
  }

  const detail = await loadManualSubmissionDetail(db, id);
  if (!detail) {
    throw new HTTPException(500, {
      message: "Failed to load approved manual submission",
    });
  }
  return c.json(detail);
});

route.post(
  "/:id/reject",
  validate("json", adminManualSubmissionRejectSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (id === null) {
      throw new HTTPException(404, { message: "Manual submission not found" });
    }

    const { reason } = c.req.valid("json");
    const db = getDb(c.env.DB);
    const [existing] = await db
      .select({ status: manualSubmissions.status })
      .from(manualSubmissions)
      .where(eq(manualSubmissions.id, id))
      .limit(1);
    if (!existing) {
      throw new HTTPException(404, { message: "Manual submission not found" });
    }
    if (existing.status === "published") {
      throw new HTTPException(409, {
        message: "Published manual submissions cannot be rejected",
      });
    }

    await db
      .update(manualSubmissions)
      .set({
        status: "rejected",
        rejectedReason: reason,
        reviewedBy: c.get("user").sub,
        questionId: null,
        submissionId: null,
      })
      .where(eq(manualSubmissions.id, id));

    const detail = await loadManualSubmissionDetail(db, id);
    if (!detail) {
      throw new HTTPException(500, {
        message: "Failed to load rejected manual submission",
      });
    }
    return c.json(detail);
  },
);

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }

  const db = getDb(c.env.DB);
  const [row] = await db
    .select({ pdfKey: manualSubmissions.pdfKey })
    .from(manualSubmissions)
    .where(eq(manualSubmissions.id, id))
    .limit(1);
  if (!row) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }

  await db.delete(manualSubmissions).where(eq(manualSubmissions.id, id));
  // The published live submission has its own copied PDF, so removing the
  // original upload here is safe even for published rows.
  try {
    await c.env.BUCKET.delete(row.pdfKey);
  } catch (err) {
    console.error("R2 delete failed for manual submission PDF", row.pdfKey, err);
  }
  return c.body(null, 204);
});

export default route;
