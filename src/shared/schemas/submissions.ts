import { z } from "zod";

// Body for the public view-count endpoint. Only the Turnstile token is
// accepted — a public view always counts exactly one (no client-supplied
// amount), so there is no way to inflate a count with a crafted request.
export const submissionViewSchema = z.object({
  token: z.string().min(1),
});

export type SubmissionViewInput = z.infer<typeof submissionViewSchema>;
