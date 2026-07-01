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
  // 25 items → pages [25..16],[15..6],[5..1]. Newest-first: page 1 fills the limit.
  const feed = makeFeed(25, 10);
  const a = await selectUnimported(feed, new Set([1, 2, 3]), 5, 20);
  assert.strictEqual(a.items.length, 5, "respects limit");
  assert.deepStrictEqual(
    a.items.map((i) => i.id),
    [25, 24, 23, 22, 21],
    "newest-first",
  );
  assert.strictEqual(a.remaining, true, "more remain when limit filled");

  // Newest already imported (page 1 = 16..25) → picks continue onto page 2, newest-first.
  const imported = new Set(Array.from({ length: 10 }, (_, i) => 16 + i)); // 16..25
  const b = await selectUnimported(feed, imported, 3, 20);
  assert.deepStrictEqual(
    b.items.map((i) => i.id),
    [15, 14, 13],
    "skips imported newest, then newest-first",
  );

  // pageCap=2 scans pages 1–2 (ids 25..6) without filling limit; last page unreached.
  const cap = await selectUnimported(feed, new Set(), 100, 2);
  assert.strictEqual(cap.items.length, 20, "scans exactly pageCap pages");
  assert.strictEqual(cap.items[0].id, 25, "starts at the newest");
  assert.strictEqual(cap.remaining, true, "remaining true when scan is capped");

  // Nothing new → empty, and we reached the last page so nothing remains.
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
