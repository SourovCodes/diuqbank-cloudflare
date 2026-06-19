import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { users } from "../db/schema";
import { GoogleAuthError, verifyGoogleIdToken } from "../lib/google-oauth";
import { signAuthToken } from "../lib/jwt";
import { toAuthUser } from "../lib/user-shape";
import { validate } from "../lib/validator";
import { requireAuth } from "../middleware/auth";
import { googleSignInSchema } from "../schemas/auth";
import type { AppEnv } from "../types";

const authUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  username: users.username,
  role: users.role,
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

auth.post("/google", validate("json", googleSignInSchema), async (c) => {
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

  const email = claims.email.toLowerCase();

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
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt++) {
      try {
        [user] = await db
          .insert(users)
          .values({ name, email, username: generateOpaqueUsername(), role: "user" })
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

  const token = await signAuthToken(
    { id: user.id, username: user.username, role: user.role },
    c.env.JWT_SECRET,
  );

  return c.json({ token, user: toAuthUser(user) }, createdNow ? 201 : 200);
});

// Public configuration the frontend needs to start the Google sign-in flow.
// Exposes only non-secret values (the OAuth client id is public by design).
auth.get("/config", (c) => c.json({ googleClientId: c.env.GOOGLE_CLIENT_ID }));

auth.get("/me", requireAuth, async (c) => {
  const payload = c.get("user");
  const db = getDb(c.env.DB);

  const [me] = await db
    .select(authUserColumns)
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!me) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json({ user: toAuthUser(me) });
});

export default auth;
