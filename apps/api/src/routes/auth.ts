import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { users } from "../db/schema";
import { withCache, invalidateUser } from "../lib/cache";
import { GoogleAuthError, verifyGoogleIdToken } from "../lib/google-oauth";
import { fetchImageToR2, parseImageUpload } from "../lib/image-upload";
import { signAuthToken } from "../lib/jwt";
import { clientIp, enforceRateLimit } from "../lib/rate-limit";
import { toAuthUser } from "../lib/user-shape";
import { validate } from "../lib/validator";
import { requireAuth } from "../middleware/auth";
import { googleSignInSchema } from "../shared/schemas/auth";
import { profileUpdateSchema } from "../shared/schemas/profile";
import type { AppEnv } from "../types";

const authUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  username: users.username,
  role: users.role,
  imageKey: users.imageKey,
  createdAt: users.createdAt,
};

const auth = new Hono<AppEnv>();

// 24-bit hex; ~16.7M space, collision odds vanishingly small. We still retry
// on the unique constraint below to be defensive.
const generateOpaqueUsername = (): string => {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return `user_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
};

const MAX_USERNAME_ATTEMPTS = 5;
const ALLOWED_EMAIL_DOMAIN = "diu.edu.bd";

auth.get("/config", (c) => c.json({ googleClientId: c.env.GOOGLE_CLIENT_ID }));

auth.post(
  "/google",
  validate("json", googleSignInSchema),
  async (c) => {
  // Throttle per IP so an attacker can't spin the Google tokeninfo round-trip
  // and user-creation path with a flood of tokens.
  await enforceRateLimit(c.env.AUTH_RATE_LIMITER, `ip:${clientIp(c)}`);
  const { idToken } = c.req.valid("json");
  const db = getDb(c.env.DB);

  let claims;
  try {
    claims = await verifyGoogleIdToken(idToken, c.env.GOOGLE_CLIENT_ID);
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      throw new HTTPException(401, { message: err.message });
    }
    throw err;
  }

  const email = claims.email.trim().toLowerCase();
  const isAdmin = email === c.env.ADMIN_EMAIL.trim().toLowerCase();
  if (!isAdmin && !email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
    throw new HTTPException(403, {
      message: `Only @${ALLOWED_EMAIL_DOMAIN} email addresses can sign in`,
    });
  }

  const findByEmail = async () => {
    const [row] = await db
      .select(authUserColumns)
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row;
  };

  let user = await findByEmail();
  let createdNow = false;

  if (!user) {
    const name = claims.name?.trim() || email.split("@")[0];
    const role = isAdmin ? "admin" : "user";
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt++) {
      try {
        [user] = await db
          .insert(users)
          .values({ name, email, username: generateOpaqueUsername(), role })
          .returning(authUserColumns);
        createdNow = true;
        break;
      } catch (err) {
        lastErr = err;
        // Race: another request for the same email beat us to the insert.
        // Use that row instead of retrying.
        const existing = await findByEmail();
        if (existing) {
          user = existing;
          break;
        }
        // Otherwise assume the username collided — retry with a new one.
      }
    }
    if (!user) {
      console.error("Google sign-in: insert failed after retries", lastErr);
      throw new HTTPException(500, {
        message: "Could not create user from Google sign-in",
      });
    }
  }

  // First sign-in: copy the Google profile photo into R2 as the initial avatar.
  // Best-effort — fetchImageToR2 returns null instead of throwing, so an
  // unreachable/oversized/odd image never blocks the sign-in itself.
  if (createdNow && claims.picture) {
    const imageKey = await fetchImageToR2(c.env.BUCKET, claims.picture);
    if (imageKey) {
      const [withImage] = await db
        .update(users)
        .set({ imageKey })
        .where(eq(users.id, user.id))
        .returning(authUserColumns);
      if (withImage) user = withImage;
    }
  }

  const token = await signAuthToken(
    { id: user.id, username: user.username, role: user.role },
    c.env.JWT_SECRET,
  );

  return c.json({ token, user: toAuthUser(user) }, createdNow ? 201 : 200);
});

auth.get("/me", requireAuth, (c) => {
  const payload = c.get("user");

  // Per-user cache: the key MUST include the user id so one user never reads
  // another's profile. Invalidated by the profile mutations below and by admin
  // edits/deletes of the user (`user:<id>` token).
  return withCache(
    c,
    { versions: [`user:${payload.sub}`], key: `auth:me:${payload.sub}` },
    async () => {
      const db = getDb(c.env.DB);

      const [me] = await db
        .select(authUserColumns)
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!me) {
        throw new HTTPException(404, { message: "User not found" });
      }

      return { user: toAuthUser(me) };
    },
  );
});

auth.patch("/me", requireAuth, validate("json", profileUpdateSchema), async (c) => {
  const input = c.req.valid("json");
  if (Object.keys(input).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }

  const payload = c.get("user");
  const db = getDb(c.env.DB);

  // A duplicate username surfaces as a UNIQUE constraint error → 409 via onError.
  const [updated] = await db
    .update(users)
    .set(input)
    .where(eq(users.id, payload.sub))
    .returning(authUserColumns);

  if (!updated) {
    throw new HTTPException(404, { message: "User not found" });
  }

  c.executionCtx.waitUntil(invalidateUser(c.env, payload.sub, updated.username));

  return c.json({ user: toAuthUser(updated) });
});

auth.put(
  "/me/image",
  requireAuth,
  async (c) => {
  const { buffer, contentType, ext } = await parseImageUpload(c);
  const payload = c.get("user");
  const db = getDb(c.env.DB);

  const [prev] = await db
    .select({ imageKey: users.imageKey })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);
  if (!prev) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const key = `users/${crypto.randomUUID()}.${ext}`;
  await c.env.BUCKET.put(key, buffer, { httpMetadata: { contentType } });

  let updated;
  try {
    [updated] = await db
      .update(users)
      .set({ imageKey: key })
      .where(eq(users.id, payload.sub))
      .returning(authUserColumns);
  } catch (err) {
    // DB update failed — don't leave an orphan object in R2.
    try {
      await c.env.BUCKET.delete(key);
    } catch (cleanupErr) {
      console.error("R2 cleanup failed for orphan image key", key, cleanupErr);
    }
    throw err;
  }

  // Best-effort delete of the previous image after a successful swap.
  if (prev.imageKey && prev.imageKey !== key) {
    try {
      await c.env.BUCKET.delete(prev.imageKey);
    } catch (err) {
      console.error("R2 delete failed for old image", prev.imageKey, err);
    }
  }

  c.executionCtx.waitUntil(invalidateUser(c.env, payload.sub, updated.username));

  return c.json({ user: toAuthUser(updated) });
});

export default auth;
