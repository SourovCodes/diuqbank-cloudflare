// Standalone self-check for the legacy-feed page walk. No framework — run with:
//   npx tsx src/lib/source-api.test.ts
import assert from "node:assert";

import {
  selectUnimported,
  type FetchSourcePage,
  type SourcePage,
  type SourceSubmission,
} from "./source-api";

// Fake newest-first feed: ids `total`..1, paginated `perPage` per page.
const makeFeed = (total: number, perPage: number): FetchSourcePage => {
  const ids = Array.from({ length: total }, (_, i) => total - i); // [total..1]
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  return async (page): Promise<SourcePage> => {
    const start = (page - 1) * perPage;
    const data = ids
      .slice(start, start + perPage)
      .map((id) => ({ id }) as unknown as SourceSubmission);
    return { data, meta: { current_page: page, last_page: lastPage, total } };
  };
};

const run = async () => {
  // 25 items → pages [25..16],[15..6],[5..1]. Oldest-first: page 3 reversed
  // yields 1..5, so with 1–3 already imported the walk continues onto page 2.
  const feed = makeFeed(25, 10);
  const a = await selectUnimported(feed, new Set([1, 2, 3]), 5, 20);
  assert.strictEqual(a.items.length, 5, "respects limit");
  assert.deepStrictEqual(
    a.items.map((i) => i.id),
    [4, 5, 6, 7, 8],
    "skips imported oldest, then oldest-first",
  );
  assert.strictEqual(a.remaining, true, "more remain when limit filled");

  // Oldest already imported (pages 2–3 = 1..15) → picks continue onto page 1.
  const imported = new Set(Array.from({ length: 15 }, (_, i) => i + 1)); // 1..15
  const b = await selectUnimported(feed, imported, 3, 20);
  assert.deepStrictEqual(
    b.items.map((i) => i.id),
    [16, 17, 18],
    "skips imported pages, then oldest-first",
  );

  // pageCap=2 scans pages 3–2 (ids 1..15) without filling limit; page 1 unreached.
  const cap = await selectUnimported(feed, new Set(), 100, 2);
  assert.strictEqual(cap.items.length, 15, "scans exactly pageCap pages");
  assert.strictEqual(cap.items[0].id, 1, "starts at the oldest");
  assert.strictEqual(cap.remaining, true, "remaining true when scan is capped");

  // Nothing new → empty, and we reached page 1 so nothing remains.
  const all = new Set(Array.from({ length: 25 }, (_, i) => i + 1));
  const c = await selectUnimported(feed, all, 5, 20);
  assert.strictEqual(c.items.length, 0, "all imported → none picked");
  assert.strictEqual(c.remaining, false, "remaining false once whole feed scanned");

  console.log("source-api selectUnimported: all checks passed");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
