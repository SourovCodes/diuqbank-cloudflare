import { eq, inArray, sql } from "drizzle-orm";

import { getDb } from "./db/client";
import { submissions } from "./db/schema";
import { bumpCache } from "./lib/cache";
import type { Bindings } from "./types";

// Bucket width in seconds — must match the cron cadence in wrangler.jsonc
// (`*/15 * * * *`). Views are flushed one complete bucket at a time.
const BUCKET_SECONDS = 15 * 60;

// Sum views per submission over the *previous complete* 15-minute bucket, so
// consecutive runs read disjoint windows and never double-count. Epoch math
// (`intDiv(now, 900) * 900`) floors `now` to a bucket boundary using WAE SQL
// functions that are known-supported (avoids relying on `toStartOfInterval`).
// `_sample_interval` compensates for Analytics Engine sampling.
//
// Tradeoff: the just-closed bucket is queried moments after it closes, so the
// last few seconds of writes could occasionally miss the query if WAE ingestion
// lags. If undercounting is ever observed, subtract one more `BUCKET_SECONDS`
// from both bounds to process the bucket-before-last instead.
const buildFlushQuery = (dataset: string): string =>
  `SELECT blob1 AS submission_id, sum(_sample_interval * double1) AS views
   FROM ${dataset}
   WHERE timestamp >= toDateTime(intDiv(toUInt32(now()), ${BUCKET_SECONDS}) * ${BUCKET_SECONDS} - ${BUCKET_SECONDS})
     AND timestamp <  toDateTime(intDiv(toUInt32(now()), ${BUCKET_SECONDS}) * ${BUCKET_SECONDS})
   GROUP BY blob1`;

type SqlApiResponse = {
  data?: { submission_id?: string | number; views?: string | number }[];
};

/**
 * Scheduled consumer: flush buffered submission views from Analytics Engine into
 * D1. Runs every 15 minutes (wrangler.jsonc `triggers.crons`). Reads the last
 * complete bucket via the Analytics Engine SQL API, applies summed counts to
 * `submissions.view_count` in one batch (the AFTER-UPDATE trigger keeps each
 * question's summed `view_count` in sync), then bumps the affected caches once.
 */
export const handleScheduled = async (
  _controller: ScheduledController,
  env: Bindings,
): Promise<void> => {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CF_ANALYTICS_API_TOKEN}` },
      body: buildFlushQuery("diuqbank_views"),
    },
  );

  if (!res.ok) {
    console.error(
      "View-count flush: Analytics Engine query failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return;
  }

  const payload = (await res.json()) as SqlApiResponse;
  const rows = (payload.data ?? [])
    .map((r) => ({ id: Number(r.submission_id), views: Math.round(Number(r.views)) }))
    .filter((r) => Number.isSafeInteger(r.id) && r.id > 0 && r.views > 0);
  if (rows.length === 0) return;

  const db = getDb(env.DB);

  // One batch of atomic bumps. Rows for submissions that no longer exist simply
  // match nothing and no-op.
  const updates = rows.map(({ id, views }) =>
    db
      .update(submissions)
      .set({ viewCount: sql`${submissions.viewCount} + ${views}` })
      .where(eq(submissions.id, id)),
  );
  await db.batch(updates as [(typeof updates)[number], ...(typeof updates)[number][]]);

  // Invalidate caches for the submissions that actually exist: their question
  // (detail + list, whose summed viewCount changed) and the contributor's page.
  // Mirrors invalidateSubmissionView, but deduped into a single bump.
  const affected = await db.query.submissions.findMany({
    where: inArray(
      submissions.id,
      rows.map((r) => r.id),
    ),
    columns: { questionId: true },
    with: { user: { columns: { username: true } } },
  });

  const tokens = new Set<string>();
  for (const row of affected) {
    tokens.add(`q:${row.questionId}`);
    if (row.user) tokens.add(`c:${row.user.username}`);
  }
  if (tokens.size > 0) {
    tokens.add("q:list");
    await bumpCache(env, ...tokens);
  }
};
