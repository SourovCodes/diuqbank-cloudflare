import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { parseId } from "../lib/parse-id";
import { verifyTurnstile } from "../lib/turnstile";
import { validate } from "../lib/validator";
import { submissionViewSchema } from "../shared/schemas/submissions";
import type { AppEnv } from "../types";

const route = new Hono<AppEnv>();

// Public, Turnstile-protected view counter. The hot path deliberately touches
// neither D1 nor the KV cache: a verified view is written as a single Analytics
// Engine data point and the 15-minute cron (src/cron.ts) flushes the buffered
// counts into `submissions.view_count`. There is intentionally no existence
// check on `:id` — that would cost a D1 read per view; a data point for a
// non-existent submission is simply ignored at flush time.
route.post("/:id/views", validate("json", submissionViewSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Submission not found" });

  const { token } = c.req.valid("json");
  const ok = await verifyTurnstile(c.env.TURNSTILE_SECRET_KEY, token);
  if (!ok) throw new HTTPException(403, { message: "Turnstile verification failed" });

  // indexes: sampling is keyed per submission so a hot submission's views are
  // sampled independently. blob1 is the GROUP BY column at flush time; double1
  // is the per-event count.
  c.env.VIEWS.writeDataPoint({
    indexes: [String(id)],
    blobs: [String(id)],
    doubles: [1],
  });

  return c.json({ ok: true }, 202);
});

export default route;
