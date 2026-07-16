import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

import { handleScheduled } from "./cron";
import { openApiDoc } from "./openapi";
import { handleQueue } from "./queue";
import { MAX_PDF_BYTES } from "@diuqbank/shared";
import admin from "./routes/admin";
import auth from "./routes/auth";
import contributors from "./routes/contributors";
import filterOptions from "./routes/filter-options";
import manualSubmissions from "./routes/manual-submissions";
import questions from "./routes/questions";
import submissions from "./routes/submissions";
import type { AppEnv, Bindings } from "./types";

const app = new Hono<AppEnv>();

const allowedWebOrigins = (env: Bindings) =>
  env.WEB_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const frameAncestorPolicy = (env: Bindings) => {
  const ancestors = new Set<string>(["'self'"]);

  for (const origin of allowedWebOrigins(env)) {
    try {
      const url = new URL(origin);
      if (url.protocol === "http:" || url.protocol === "https:") {
        ancestors.add(url.origin);
      }
    } catch {
      // Invalid CORS entries are ignored for CSP rather than emitting a bad header.
    }
  }

  return `frame-ancestors ${Array.from(ancestors).join(" ")};`;
};

// Tag every request with an id (echoed as X-Request-Id) for log correlation.
app.use("*", requestId());
app.use("*", logger());

// Allow only this API and the configured web frontends to iframe API pages/files.
// This must wrap secureHeaders so it can replace X-Frame-Options (which cannot
// express an allowlist) with the modern CSP frame-ancestors directive.
app.use("*", async (c, next) => {
  await next();
  c.res.headers.delete("X-Frame-Options");
  c.res.headers.set("Content-Security-Policy", frameAncestorPolicy(c.env as Bindings));
});

// Security headers. CSP is limited to frame-ancestors above so the Scalar /docs
// page (which loads from jsdelivr) keeps working. Files are served from the R2
// public domain (r2.diuqbank.com), not this Worker, so no CORP relaxation is
// needed.
app.use("*", secureHeaders({ xFrameOptions: "DENY" }));

// CORS locked to an env-configured allowlist (WEB_ORIGINS, comma-separated).
// Requests from any other Origin get no CORS headers and are blocked by the
// browser. The token travels in the Authorization header, so credentials off.
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const env = c.env as Bindings;
      return allowedWebOrigins(env).includes(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  }),
);

// Body size guards. JSON (and other non-multipart) bodies are capped at 256 KB.
// Multipart uploads legitimately reach 20 MB (and self-validate their own size
// per field), but still get a hard ceiling so a spoofed `multipart/form-data`
// content-type can't stream an unbounded body into a JSON route.
const jsonBodyLimit = bodyLimit({
  maxSize: 256 * 1024,
  onError: (c) => c.json({ error: "Payload too large" }, 413),
});
const multipartBodyLimit = bodyLimit({
  maxSize: MAX_PDF_BYTES + 512 * 1024, // largest upload + multipart overhead
  onError: (c) => c.json({ error: "Payload too large" }, 413),
});
app.use("*", (c, next) =>
  (c.req.header("content-type") ?? "").includes("multipart/form-data")
    ? multipartBodyLimit(c, next)
    : jsonBodyLimit(c, next),
);

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
app.route("/contributors", contributors);
app.route("/questions", questions);
app.route("/submissions", submissions);
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

  console.error(`Unhandled error [${c.get("requestId")}]`, err);
  return c.json({ error: "Internal server error" }, 500);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

// The Worker exports the HTTP handler, the queue consumer, and the cron
// consumer. The queue handler drains the throttled PDF_QUEUE (watermarking;
// bounds PDF Processor load). The scheduled handler flushes buffered
// submission views from Analytics Engine into D1 every 15 minutes (see
// src/cron.ts).
export default {
  fetch: app.fetch,
  queue: handleQueue,
  scheduled: handleScheduled,
};
