import { Hono } from "hono";

import type { AppEnv } from "../types";

const files = new Hono<AppEnv>();

// Stream a stored object (e.g. a profile image) from R2. Keys are unique per
// upload, so the response is immutable and aggressively cacheable at the edge.
// Passing the request headers to `get` lets R2 honour `If-None-Match`, so a
// browser holding the (immutable) object gets a bodyless 304 instead of
// re-downloading the whole file.
files.get("/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const object = await c.env.BUCKET.get(key, { onlyIf: c.req.raw.headers });
  if (!object) {
    return c.json({ error: "Not found" }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("etag", object.httpEtag);

  // Precondition matched → R2 returned metadata only (no body); reply 304.
  if (!("body" in object) || object.body === undefined) {
    return new Response(null, { status: 304, headers });
  }

  headers.set("content-length", String(object.size));
  return new Response(object.body, { headers });
});

export default files;
