import { count, eq } from "drizzle-orm";

import type { Db } from "../db/client";
import { autoSubmissions, manualSubmissions, users } from "../db/schema";
import type { AdminContributorStats } from "../shared/types";

// Review-history overview of the contributor (shown next to the PDF so the
// reviewer can judge the uploader's track record). Covers both upload
// pipelines; counts include the row currently under review.
export const loadContributorStats = async (
  db: Db,
  userId: number,
): Promise<AdminContributorStats> => {
  const [autoRows, manualRows, [contributor]] = await Promise.all([
    db
      .select({ status: autoSubmissions.status, value: count() })
      .from(autoSubmissions)
      .where(eq(autoSubmissions.userId, userId))
      .groupBy(autoSubmissions.status),
    db
      .select({ status: manualSubmissions.status, value: count() })
      .from(manualSubmissions)
      .where(eq(manualSubmissions.userId, userId))
      .groupBy(manualSubmissions.status),
    db
      .select({ submissionCount: users.submissionCount })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ]);

  const countOf = (rows: { status: string; value: number }[], status: string) =>
    rows.find((r) => r.status === status)?.value ?? 0;

  return {
    liveSubmissionCount: contributor?.submissionCount ?? 0,
    autoPublished: countOf(autoRows, "published"),
    autoRejected: countOf(autoRows, "rejected"),
    autoPendingReview: countOf(autoRows, "needs_review"),
    manualPublished: countOf(manualRows, "published"),
    manualRejected: countOf(manualRows, "rejected"),
    manualPending: countOf(manualRows, "pending"),
  };
};
