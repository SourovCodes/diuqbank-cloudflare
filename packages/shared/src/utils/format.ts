// Display formatters shared by the web app (and available to any consumer).
// Previously duplicated across half a dozen web pages.

/** Format a byte count as a human-readable size, e.g. `1.5 MB` or `512 KB`. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

/**
 * Format a Unix timestamp (seconds — the API's timestamp unit) as a short date,
 * e.g. `5 Jun 2026`.
 */
export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
