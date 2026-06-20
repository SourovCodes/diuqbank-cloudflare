import { z } from "zod";

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(50)
      .regex(
        /^[a-z0-9_.-]+$/,
        "username may contain a-z, 0-9, dot, underscore, hyphen",
      ),
  })
  .partial();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
