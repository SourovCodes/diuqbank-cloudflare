import { z } from "zod";

export const googleSignInSchema = z.object({
  idToken: z.string().min(1).max(4096),
});

export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;
