import type { User } from "../db/schema";

type UserRow = Pick<
  User,
  "id" | "name" | "email" | "username" | "role" | "imageKey" | "createdAt"
>;

/** Build the absolute, worker-served URL for a stored object key (served by `GET /files/:key`). */
export const fileUrlFor = (origin: string, key: string | null): string | null =>
  key ? `${origin}/files/${key}` : null;

/** Build the absolute, worker-served URL for a stored image key. */
export const imageUrlFor = (origin: string, imageKey: string | null): string | null =>
  fileUrlFor(origin, imageKey);

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

type ContributorRow = Pick<
  User,
  "id" | "name" | "username" | "imageKey" | "createdAt"
> & { submissionCount: number };

/**
 * Public-safe contributor shape (no email, no role). Used by the public
 * `/contributors` list and detail endpoints. `submissionCount` is computed
 * dynamically by the caller (the denormalized column is not trigger-maintained).
 */
export const toContributor = (row: ContributorRow, origin: string) => ({
  id: row.id,
  name: row.name,
  username: row.username,
  image: imageUrlFor(origin, row.imageKey),
  submissionCount: row.submissionCount,
  createdAt: row.createdAt,
});

export type Contributor = ReturnType<typeof toContributor>;

/** Minimal contributor reference embedded in a submission. */
export const toContributorSummary = (
  row: Pick<User, "id" | "name" | "username" | "imageKey">,
  origin: string,
) => ({
  id: row.id,
  name: row.name,
  username: row.username,
  image: imageUrlFor(origin, row.imageKey),
});

export type ContributorSummary = ReturnType<typeof toContributorSummary>;
