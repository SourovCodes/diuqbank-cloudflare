import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { DATABASE_KEY, MANIFEST_KEY, META_KEY, runBackups } from "../../lib/backup";
import type { BackupMeta } from "../../shared/types";
import type { AppEnv } from "../../types";

const route = new Hono<AppEnv>();

// Metadata about the most recent backup run (timestamps, byte sizes, per-artifact
// status). 404 until the cron (or POST /run) has produced a snapshot.
route.get("/", async (c) => {
  const obj = await c.env.BACKUP_BUCKET.get(META_KEY);
  if (!obj) {
    throw new HTTPException(404, { message: "No backup has been generated yet" });
  }
  return c.json(await obj.json<BackupMeta>());
});

// Download the referenced-files manifest (JSON: download URL, folder, file name
// for every R2 object the database references).
route.get("/manifest", async (c) => {
  const obj = await c.env.BACKUP_BUCKET.get(MANIFEST_KEY);
  if (!obj) {
    throw new HTTPException(404, { message: "No manifest has been generated yet" });
  }
  c.header("Content-Type", "application/json");
  c.header("Content-Disposition", 'attachment; filename="files-manifest.json"');
  return c.body(obj.body);
});

// Download the latest D1 SQL dump.
route.get("/database", async (c) => {
  const obj = await c.env.BACKUP_BUCKET.get(DATABASE_KEY);
  if (!obj) {
    throw new HTTPException(404, { message: "No database backup has been generated yet" });
  }
  c.header("Content-Type", "application/sql");
  c.header("Content-Disposition", 'attachment; filename="database-backup.sql"');
  return c.body(obj.body);
});

// Generate a fresh snapshot on demand (same routine the 6-hourly cron runs).
route.post("/run", async (c) => {
  const meta = await runBackups(c.env);
  return c.json(meta);
});

export default route;
