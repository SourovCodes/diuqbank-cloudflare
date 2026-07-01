#!/usr/bin/env node
// Wipe this Worker's D1 database and R2 bucket, then re-apply migrations so the
// schema is left clean-but-empty (the app still works, there's just no data).
//
//   node scripts/wipe.mjs                 # local .wrangler/state (safe, default)
//   node scripts/wipe.mjs --remote --yes  # PRODUCTION D1 + R2 (irreversible)
//
// Wrangler has no bulk R2 delete, so remote R2 is emptied by deleting every
// object key recorded in D1 (before the tables are dropped). This reuses
// wrangler's own auth — no S3 credentials required.
//
// ponytail: remote R2 clears keys tracked in D1; an untracked orphan object
// (from a crash mid-upload — rare) won't be enumerated. For a guaranteed-empty
// bucket use the S3 API, e.g. `aws s3 rm s3://<bucket> --recursive --endpoint-url ...`.

import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

const DB = "diuqbank-db-prod";
const BUCKET = "diuqbank-files-prod";

const args = new Set(process.argv.slice(2));
const remote = args.has("--remote");
const loc = remote ? "--remote" : "--local";

if (remote && !args.has("--yes")) {
  console.error(
    "Refusing to wipe PRODUCTION without an explicit confirmation.\n" +
      "  node scripts/wipe.mjs --remote --yes",
  );
  process.exit(1);
}

// Run wrangler, streaming its output. `pnpm exec` resolves the pinned wrangler
// whether this file is run via `node` or `pnpm wipe`.
const wrangler = (a, capture = false) =>
  execFileSync("pnpm", ["exec", "wrangler", ...a], {
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
  });

// A read-only SELECT via --json. --yes skips the remote-DB confirmation prompt.
const query = (sql) => {
  const out = wrangler(
    ["d1", "execute", DB, loc, "--yes", "--json", "--command", sql],
    true,
  );
  return JSON.parse(out)[0]?.results ?? [];
};

console.log(`\nWiping ${remote ? "REMOTE (production)" : "local"} D1 + R2 …\n`);

// --- R2 ---------------------------------------------------------------------
if (remote) {
  // Gather every object key referenced in D1 before the tables are dropped.
  const rows = query(
    `SELECT pdf_key AS k FROM submissions
     UNION SELECT watermarked_pdf_key FROM submissions WHERE watermarked_pdf_key IS NOT NULL
     UNION SELECT pdf_key FROM manual_submissions
     UNION SELECT pdf_key FROM auto_submissions
     UNION SELECT image_key FROM users WHERE image_key IS NOT NULL`,
  );
  const keys = rows.map((r) => r.k).filter(Boolean);
  console.log(`Deleting ${keys.length} R2 object(s) …`);
  for (const key of keys) {
    try {
      wrangler(["r2", "object", "delete", `${BUCKET}/${key}`, "--remote"], true);
    } catch {
      // Already gone — keep going.
    }
  }
} else {
  // Local dev state is just files on disk.
  rmSync(".wrangler/state/v3/r2", { recursive: true, force: true });
  rmSync(".wrangler/state/v3/d1", { recursive: true, force: true });
}

// --- D1 ---------------------------------------------------------------------
if (remote) {
  // Drop every user table (incl. d1_migrations) so migrations re-apply cleanly.
  // defer_foreign_keys lets us drop parents/children in any order.
  const tables = query(
    `SELECT name FROM sqlite_master
     WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'`,
  ).map((r) => r.name);
  if (tables.length) {
    const drop =
      "PRAGMA defer_foreign_keys=TRUE;" +
      tables.map((n) => `DROP TABLE IF EXISTS "${n}";`).join("");
    wrangler(["d1", "execute", DB, "--remote", "--yes", "--command", drop]);
  }
}

// Re-apply the schema. (Local: also recreates the DB we just deleted.)
wrangler(["d1", "migrations", "apply", DB, loc]);

console.log(`\nDone. ${remote ? "Production" : "Local"} D1 + R2 cleared.\n`);
