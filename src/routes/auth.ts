import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { users } from "../db/schema";
import { setPrivateCacheHeaders } from "../lib/cache";
import { signAuthToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import { toAuthUser } from "../lib/user-shape";
import { validate } from "../lib/validator";
import { requireAuth } from "../middleware/auth";
import { loginSchema, registerSchema } from "../schemas/auth";
import type { AppEnv } from "../types";

// Columns safe to read for the public user shape (excludes passwordHash).
const authUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
};

const auth = new Hono<AppEnv>();

auth.post("/register", validate("json", registerSchema), async (c) => {
  const { name, email, password } = c.req.valid("json");
  const db = getDb(c.env.DB);

  const passwordHash = await hashPassword(password);

  // A duplicate email surfaces as a UNIQUE constraint error and is mapped to
  // 409 by the global onError handler in src/index.ts.
  const [user] = await db
    .insert(users)
    .values({ name, email: email.toLowerCase(), passwordHash })
    .returning(authUserColumns);

  const token = await signAuthToken({ id: user.id, role: user.role }, c.env.JWT_SECRET);
  return c.json({ token, user: toAuthUser(user) }, 201);
});

auth.post("/login", validate("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = getDb(c.env.DB);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  const token = await signAuthToken({ id: user.id, role: user.role }, c.env.JWT_SECRET);
  return c.json({ token, user: toAuthUser(user) });
});

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

  // Per-user, short TTL: deflect rapid /auth/me hits a frontend makes on
  // navigation while still letting profile changes propagate quickly.
  setPrivateCacheHeaders(c, 60);
  return c.json({ user: toAuthUser(me) });
});

export default auth;
