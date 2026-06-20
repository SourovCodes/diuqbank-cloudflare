import type { User } from "../db/schema";

type UserRow = Pick<
  User,
  "id" | "name" | "email" | "username" | "role" | "imageKey" | "createdAt"
>;

/** Build the absolute, worker-served URL for a stored image key. */
export const imageUrlFor = (origin: string, imageKey: string | null): string | null =>
  imageKey ? `${origin}/files/${imageKey}` : null;

/**
 * The public-safe user shape returned by auth endpoints. Centralised so every
 * endpoint that exposes a user stays in sync. `origin` is the request origin
 * (e.g. `https://api.example.com`) used to build absolute image URLs.
 */
export const toAuthUser = (row: UserRow, origin: string) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  username: row.username,
  role: row.role,
  image: imageUrlFor(origin, row.imageKey),
  createdAt: row.createdAt,
});

export type AuthUser = ReturnType<typeof toAuthUser>;
