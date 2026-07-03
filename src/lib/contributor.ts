import { eq } from "drizzle-orm";

import type { Db } from "../db/client";
import { users } from "../db/schema";

/**
 * Find a user by email, or create one from legacy uploader info so a bulk import
 * preserves the original contributor. Matches on `email` (unique). `username` is
 * also unique, so on a collision we suffix it and retry; a concurrent insert of
 * the same email is resolved by re-finding.
 *
 * `loadImageKey` is called lazily, only when a new user is actually inserted, so
 * callers can defer the avatar download for contributors that already exist.
 *
 * ponytail: 2 retries, suffix-on-collision — enough for an admin migration tool.
 */
export const findOrCreateContributor = async (
  db: Db,
  info: { name: string; email: string; username: string },
  loadImageKey?: () => Promise<string | null>,
): Promise<number> => {
  const findByEmail = async () => {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, info.email))
      .limit(1);
    return row;
  };

  const existing = await findByEmail();
  if (existing) return existing.id;

  const base = (info.username || info.email.split("@")[0] || "user").slice(0, 40);
  const imageKey = (await loadImageKey?.()) ?? null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const username = attempt === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 6)}`;
    try {
      const [row] = await db
        .insert(users)
        .values({ name: info.name, email: info.email, username, imageKey })
        .returning({ id: users.id });
      return row.id;
    } catch {
      // Either the email raced in, or `username` collided with a different user.
      const raced = await findByEmail();
      if (raced) return raced.id;
      // Email still free → it was a username clash; loop retries with a new one.
    }
  }
  throw new Error(`Could not resolve contributor for ${info.email}`);
};
