import type { User } from "../db/schema";

/**
 * The public-safe user shape returned by auth endpoints. Centralised so every
 * endpoint that exposes a user stays in sync.
 */
export const toAuthUser = (
  row: Pick<User, "id" | "name" | "email" | "username" | "role" | "createdAt">,
) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  username: row.username,
  role: row.role,
  createdAt: row.createdAt,
});

export type AuthUser = ReturnType<typeof toAuthUser>;
