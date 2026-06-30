import { z } from "zod";

import { pageFields } from "../../utils/pagination";

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(50)
  .regex(
    /^[a-z0-9_.-]+$/,
    "username may contain a-z, 0-9, dot, underscore, hyphen",
  );

export const userUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    username,
    role: z.enum(["admin", "user"]),
  })
  .partial();

export const usersListQuery = z.object({
  ...pageFields,
  search: z.string().trim().min(1).max(100).optional(),
  role: z.enum(["admin", "user"]).optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UsersListQuery = z.infer<typeof usersListQuery>;
