// Constants shared by the API (enforcement) and the web app (client-side
// validation and UI copy). Changing a limit here updates both sides.

/** Maximum profile-image upload size (5 MB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Maximum PDF upload size (20 MB). */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

/** Accepted image MIME types (validated by magic bytes on the API). */
export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

/** The only accepted document MIME type. */
export const PDF_MIME_TYPE = "application/pdf";

/**
 * The only exam types the platform accepts, in display order. Enforced by the
 * API (request schemas + the auto-submission publish path) and used by the web
 * app to render exam-type dropdowns.
 */
export const ALLOWED_EXAM_TYPES = [
  "Midterm",
  "Final",
  "Quiz",
  "Lab Midterm",
  "Lab Final",
] as const;

export type AllowedExamType = (typeof ALLOWED_EXAM_TYPES)[number];

/** Case-insensitive match to the canonical exam-type name, or null. */
export const canonicalExamType = (name: string): AllowedExamType | null =>
  ALLOWED_EXAM_TYPES.find(
    (t) => t.toLowerCase() === name.trim().toLowerCase(),
  ) ?? null;

/** Default page size for paginated list endpoints (matches `pageFields`). */
export const DEFAULT_PER_PAGE = 20;

/** Hard cap on page size accepted by paginated list endpoints. */
export const MAX_PER_PAGE = 100;
