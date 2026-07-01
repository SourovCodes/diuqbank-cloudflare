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
  // 25 items → pages [25..16],[15..6],[5..1]. Import {1,2,3}; want 5 oldest-first.
  const feed = makeFeed(25, 10);
  const a = await selectUnimported(feed, new Set([1, 2, 3]), 5, 20);
  assert.strictEqual(a.items.length, 5, "respects limit");
  assert.deepStrictEqual(
    a.items.map((i) => i.id),
    [5, 4, 15, 14, 13],
    "oldest-first, skips imported ids",
  );
  assert.strictEqual(a.remaining, true, "more remain when limit filled");

  // pageCap=1 only scans the last page (ids 5..1), skips {1,2,3} → picks 5,4.
  const b = await selectUnimported(feed, new Set([1, 2, 3]), 5, 1);
  assert.deepStrictEqual(b.items.map((i) => i.id), [5, 4], "stops at pageCap");
  assert.strictEqual(b.remaining, true, "remaining true when scan is capped");

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
