import { getDb } from "../db/client";
import { autoSubmissions, submissions, users } from "../db/schema";
import type { BackupArtifact, BackupMeta } from "../shared/types";
import type { Bindings } from "../types";
import { R2_PUBLIC_BASE, fileUrlFor } from "./user-shape";

// Fixed R2 keys of the backup artifacts in BACKUP_BUCKET. Fixed names → each run
// overwrites the previous copy (a single rolling snapshot, not a history).
export const MANIFEST_KEY = "files-manifest.json";
export const DATABASE_KEY = "database-backup.sql";
export const META_KEY = "backup-meta.json";

/** Where a referenced key was found — one entry per DB column/row using it. */
type ManifestSource = { table: string; column: string; id: number };

/** One referenced file in the manifest: how to download it and where it lives. */
export type ManifestFile = {
  key: string;
  fileName: string;
  folder: string;
  downloadUrl: string;
  size: number | null;
  sources: ManifestSource[];
};

/** The full manifest of every R2 object referenced by the database. */
export type FileManifest = {
  generatedAt: string;
  baseUrl: string;
  count: number;
  files: ManifestFile[];
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Build the manifest of every R2 object referenced by the DB. This is
 * DB-driven (the four file-key columns) rather than a raw `BUCKET.list()`, so
 * orphaned/legacy objects are intentionally excluded — the point is "files the
 * app actually references". Keys are deduped (one key can be referenced from
 * multiple rows/columns, e.g. an auto-submission's `pdf_key` becomes a
 * submission's `pdf_key` on publish) with their sources merged.
 */
export const buildFileManifest = async (env: Bindings): Promise<FileManifest> => {
  const db = getDb(env.DB);

  const [userRows, submissionRows, autoRows] = await Promise.all([
    db.select({ id: users.id, key: users.imageKey }).from(users),
    db
      .select({
        id: submissions.id,
        pdfKey: submissions.pdfKey,
        watermarkedPdfKey: submissions.watermarkedPdfKey,
        fileSize: submissions.fileSize,
      })
      .from(submissions),
    db
      .select({
        id: autoSubmissions.id,
        key: autoSubmissions.pdfKey,
        fileSize: autoSubmissions.fileSize,
      })
      .from(autoSubmissions),
  ]);

  const byKey = new Map<string, ManifestFile>();
  const add = (key: string | null, size: number | null, source: ManifestSource) => {
    if (!key) return;
    const existing = byKey.get(key);
    if (existing) {
      existing.sources.push(source);
      if (existing.size === null && size !== null) existing.size = size;
      return;
    }
    const slash = key.lastIndexOf("/");
    byKey.set(key, {
      key,
      folder: slash >= 0 ? key.slice(0, slash) : "",
      fileName: slash >= 0 ? key.slice(slash + 1) : key,
      // Non-null by construction: `key` is truthy here.
      downloadUrl: fileUrlFor(key)!,
      size,
      sources: [source],
    });
  };

  for (const r of userRows) {
    add(r.key, null, { table: "users", column: "image_key", id: r.id });
  }
  for (const r of submissionRows) {
    add(r.pdfKey, r.fileSize, { table: "submissions", column: "pdf_key", id: r.id });
    add(r.watermarkedPdfKey, null, {
      table: "submissions",
      column: "watermarked_pdf_key",
      id: r.id,
    });
  }
  for (const r of autoRows) {
    add(r.key, r.fileSize, { table: "auto_submissions", column: "pdf_key", id: r.id });
  }

  const files = [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  return {
    generatedAt: new Date().toISOString(),
    baseUrl: R2_PUBLIC_BASE,
    count: files.length,
    files,
  };
};

// The polling response shape of the D1 export REST API. The `signed_url` to the
// finished dump can arrive either nested under `result.result` (documented
// shape) or flat under `result` depending on the API version — tolerate both.
type D1ExportPoll = {
  success?: boolean;
  errors?: { message?: string }[];
  result?: {
    at_bookmark?: string;
    status?: string;
    error?: string;
    signed_url?: string;
    result?: { signed_url?: string; filename?: string };
  };
};

/**
 * Export the D1 database to a `.sql` dump (schema + data) via Cloudflare's D1
 * export REST API and return the bytes. The API is asynchronous: the first POST
 * starts the dump, then we poll with the returned bookmark until a `signed_url`
 * to the finished file appears, which we then fetch. Read-only against the
 * remote prod DB. Throws on any failure so the caller can record it in the meta.
 */
export const exportDatabase = async (env: Bindings): Promise<ArrayBuffer> => {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/d1/database/${env.CF_D1_DATABASE_ID}/export`;
  const headers = {
    Authorization: `Bearer ${env.CF_D1_API_TOKEN}`,
    "Content-Type": "application/json",
  };

  // The first request (no bookmark) kicks off the export with the dump options;
  // subsequent ones quote the latest bookmark to poll for completion. An
  // in-progress export must be polled continually or Cloudflare auto-cancels it.
  const MAX_POLLS = 30;
  let currentBookmark: string | undefined;
  let signedUrl: string | undefined;
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    const body = JSON.stringify({
      output_format: "polling",
      ...(currentBookmark
        ? { current_bookmark: currentBookmark }
        : { dump_options: { no_schema: false, no_data: false } }),
    });
    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) {
      throw new Error(`D1 export HTTP ${res.status}: ${await res.text().catch(() => "")}`);
    }
    const payload = (await res.json()) as D1ExportPoll;
    if (payload.success === false) {
      const detail = payload.errors?.map((e) => e.message).filter(Boolean).join("; ");
      throw new Error(`D1 export request failed: ${detail || "unknown error"}`);
    }
    const result = payload.result;
    if (result?.error || result?.status === "error") {
      throw new Error(`D1 export errored: ${result?.error || "unknown"}`);
    }
    signedUrl = result?.result?.signed_url ?? result?.signed_url;
    if (signedUrl) break;

    currentBookmark = result?.at_bookmark ?? currentBookmark;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!signedUrl) throw new Error("D1 export did not complete in time");

  const dump = await fetch(signedUrl);
  if (!dump.ok) throw new Error(`Fetching D1 export failed: HTTP ${dump.status}`);
  return dump.arrayBuffer();
};

/**
 * Produce a full backup snapshot and write it to BACKUP_BUCKET: the referenced-
 * files manifest, the D1 SQL dump, and a small meta object describing the run.
 * Each artifact is isolated in its own try/catch so one failure doesn't abort
 * the other; failures are surfaced in the returned/stored meta. Shared by the
 * 6-hourly cron (src/cron.ts) and the on-demand `POST /admin/backups/run`.
 */
export const runBackups = async (env: Bindings): Promise<BackupMeta> => {
  const generatedAt = new Date().toISOString();
  let fileCount = 0;

  const manifest: BackupArtifact = { key: MANIFEST_KEY, size: null, status: "ok", error: null };
  try {
    const m = await buildFileManifest(env);
    fileCount = m.count;
    const bytes = new TextEncoder().encode(JSON.stringify(m, null, 2));
    await env.BACKUP_BUCKET.put(MANIFEST_KEY, bytes, {
      httpMetadata: { contentType: "application/json" },
    });
    manifest.size = bytes.byteLength;
  } catch (err) {
    manifest.status = "failed";
    manifest.error = errMsg(err);
    console.error("Backup: file manifest failed", err);
  }

  const database: BackupArtifact = { key: DATABASE_KEY, size: null, status: "ok", error: null };
  try {
    const sql = await exportDatabase(env);
    await env.BACKUP_BUCKET.put(DATABASE_KEY, sql, {
      httpMetadata: { contentType: "application/sql" },
    });
    database.size = sql.byteLength;
  } catch (err) {
    database.status = "failed";
    database.error = errMsg(err);
    console.error("Backup: database export failed", err);
  }

  const meta: BackupMeta = { generatedAt, fileCount, manifest, database };
  await env.BACKUP_BUCKET.put(META_KEY, new TextEncoder().encode(JSON.stringify(meta, null, 2)), {
    httpMetadata: { contentType: "application/json" },
  });
  return meta;
};
