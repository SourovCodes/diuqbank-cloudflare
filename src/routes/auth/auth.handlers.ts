import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";

import { createDb } from "../../db";
import { users } from "../../db/schema";
import type { User } from "../../db/schema";
import { hashPassword, verifyPassword } from "../../lib/password";
import type { AppRouteHandler } from "../../types";
import type { login, me, register } from "./auth.routes";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

async function issueToken(secret: string, user: { id: number; email: string }) {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: user.id, email: user.email, iat: now, exp: now + TOKEN_TTL_SECONDS },
    secret,
    "HS256",
  );
}

/** Shape a DB row into the public user representation (never leaks passwordHash). */
function toUserResponse(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt.toISOString(),
  };
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message);
}

export const registerHandler: AppRouteHandler<typeof register> = async (c) => {
  const body = c.req.valid("json");
  const db = createDb(c.env);

  const existing = await db.query.users.findFirst({ where: eq(users.email, body.email) });
  if (existing) {
    return c.json({ success: false as const, message: "Email already registered" }, 409);
  }

  const passwordHash = await hashPassword(body.password);

  try {
    const [created] = await db
      .insert(users)
      .values({ email: body.email, name: body.name, passwordHash })
      .returning();

    const token = await issueToken(c.env.JWT_SECRET, created);
    return c.json({ user: toUserResponse(created), token }, 201);
  } catch (err) {
    // Guards against a race between the existence check and insert.
    if (isUniqueViolation(err)) {
      return c.json({ success: false as const, message: "Email already registered" }, 409);
    }
    throw err;
  }
};

export const loginHandler: AppRouteHandler<typeof login> = async (c) => {
  const body = c.req.valid("json");
  const db = createDb(c.env);

  const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return c.json({ success: false as const, message: "Invalid email or password" }, 401);
  }

  const token = await issueToken(c.env.JWT_SECRET, user);
  return c.json({ user: toUserResponse(user), token }, 200);
};

export const meHandler: AppRouteHandler<typeof me> = async (c) => {
  const authUser = c.get("user");
  const db = createDb(c.env);

  const user = await db.query.users.findFirst({ where: eq(users.id, authUser.id) });
  if (!user) {
    return c.json({ success: false as const, message: "Unauthorized" }, 401);
  }

  return c.json({ user: toUserResponse(user) }, 200);
};
