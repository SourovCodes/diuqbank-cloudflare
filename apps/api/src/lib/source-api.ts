/**
 * Read-only client for the legacy diuqbank.com public submissions feed, used by
 * the admin bulk-import endpoint. The feed is paginated (Laravel), newest-first,
 * and public (no auth). Each item's `id` is the legacy submission id we dedup on.
 */

const SOURCE_API_URL = "https://diuqbank.com/public/submissions";
const SOURCE_TIMEOUT_MS = 30_000;

export type SourceSubmission = {
  id: number;
  views: number;
  created_at: string;
  /** Signed, expiring URL to the original (un-watermarked) PDF. Download promptly. */
  pdf_original_temporary_url: string;
  user: {
    name: string;
    username: string;
    student_id: string | null;
    email: string;
    avatar_url: string | null;
  };
  department: { short_name: string; name: string };
  course: { name: string };
  semester: { name: string };
  exam_type: { name: string };
};

export type SourcePage = {
  data: SourceSubmission[];
  meta: { current_page: number; last_page: number; total: number };
};

export type FetchSourcePage = (page: number) => Promise<SourcePage>;

/** Fetch one page of the legacy feed. Throws on a non-2xx response. */
export const fetchSourcePage: FetchSourcePage = async (page) => {
  const res = await fetch(`${SOURCE_API_URL}?page=${page}`, {
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Legacy source page ${page} failed (${res.status})`);
  }
  return (await res.json()) as SourcePage;
};

/**
 * Collect up to `limit` legacy submissions not already imported (by `id`),
 * walking the feed **oldest-first** (last page downward, each page reversed —
 * the feed itself is newest-first) so the backlog fills in chronological order.
 * `pageCap` bounds the fetches per call so a deep backfill can never run away.
 * Items shifting pages mid-walk (new legacy uploads) can only defer an item to
 * the next run; the dedup by id makes re-walks safe.
 *
 * `fetchPage` is injected so this is unit-testable without network.
 */
export const selectUnimported = async (
  fetchPage: FetchSourcePage,
  importedIds: Set<number>,
  limit: number,
  pageCap: number,
): Promise<{ items: SourceSubmission[]; remaining: boolean }> => {
  // Page 1 is fetched only to learn where the feed ends.
  const first = await fetchPage(1);
  const lastPage = Math.max(1, first.meta.last_page);

  const picked: SourceSubmission[] = [];
  let scanned = 0;
  let reachedFirstPage = false;

  for (let page = lastPage; page >= 1 && scanned < pageCap; page--) {
    // Reuse page 1 we already fetched instead of requesting it twice.
    const body = page === 1 ? first : await fetchPage(page);
    scanned++;
    if (page === 1) reachedFirstPage = true;

    // Each page lists newest-first; reverse it so picks stay oldest-first.
    for (const item of [...body.data].reverse()) {
      if (importedIds.has(item.id)) continue;
      picked.push(item);
      if (picked.length >= limit) {
        return { items: picked, remaining: true };
      }
    }
  }

  // More may remain only if we stopped before scanning the whole feed.
  return { items: picked, remaining: !reachedFirstPage };
};
