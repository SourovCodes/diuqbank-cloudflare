// API constants for upload limits, accepted MIME types, and pagination defaults.

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

/** Default page size for paginated list endpoints (matches `pageFields`). */
export const DEFAULT_PER_PAGE = 20;

/** Hard cap on page size accepted by paginated list endpoints. */
export const MAX_PER_PAGE = 100;
