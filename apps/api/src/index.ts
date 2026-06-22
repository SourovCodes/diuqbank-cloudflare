import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import { openApiDoc } from "./openapi";
import admin from "./routes/admin";
import auth from "./routes/auth";
import contributors from "./routes/contributors";
import files from "./routes/files";
import filterOptions from "./routes/filter-options";
import manualSubmissions from "./routes/manual-submissions";
import questions from "./routes/questions";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use("*", cors());

app.get("/", (c) =>
  c.json({ ok: true, service: "diuqbank", docs: "/docs", openapi: "/openapi.json" }),
);

app.get("/health", (c) => c.json({ ok: true }));

app.get("/openapi.json", (c) => c.json(openApiDoc));

app.get("/docs", (c) =>
  c.html(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>DIU QuestionBank API — Reference</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`),
);

app.route("/auth", auth);
app.route("/files", files);
app.route("/contributors", contributors);
app.route("/questions", questions);
app.route("/filter-options", filterOptions);
app.route("/manual-submissions", manualSubmissions);
app.route("/admin", admin);

// ---------------------------------------------------------------------------
// Error handling: HTTPException passthrough, then map common D1 constraint
// failures to clean client errors.
// ---------------------------------------------------------------------------

const walkErrorMessages = (err: unknown): string[] => {
  const out: string[] = [];
  let current: unknown = err;
  const seen = new Set<unknown>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const msg = (current as { message?: unknown }).message;
    if (typeof msg === "string") out.push(msg);
    current = (current as { cause?: unknown }).cause;
  }
  return out;
};

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  const joined = walkErrorMessages(err).join(" | ");

  const unique = joined.match(/UNIQUE constraint failed: ([\w., ]+)/);
  if (unique) {
    const cols = unique[1]
      .split(",")
      .map((s) => s.trim().split(".").pop() ?? "")
      .filter(Boolean);
    const message =
      cols.length === 1
        ? `${cols[0]} already exists`
        : `combination of ${cols.join(", ")} already exists`;
    return c.json({ error: message }, 409);
  }

  if (/FOREIGN KEY constraint failed/i.test(joined)) {
    return c.json({ error: "Referenced record does not exist" }, 400);
  }

  const notNull = joined.match(/NOT NULL constraint failed: \w+\.(\w+)/);
  if (notNull) {
    return c.json({ error: `${notNull[1]} is required` }, 400);
  }

  console.error("Unhandled error", err);
  return c.json({ error: "Internal server error" }, 500);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
