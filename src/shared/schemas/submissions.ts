import { z } from "zod";

// Body for the public view-count endpoint. Only the reCAPTCHA token is
// accepted — a public view always counts exactly one (no client-supplied
// amount), so there is no way to inflate a count with a crafted request.
export const submissionViewSchema = z.object({
  token: z
    .string()
    .min(1)
    .describe(
      "A single-use Google reCAPTCHA v3 token. Call `grecaptcha.execute()` with site key " +
        "`6LfNQUMtAAAAALqjSZZS8oIFmJQXA-xAv-z03KvH` and send a fresh token on every view.",
    ),
});

export type SubmissionViewInput = z.infer<typeof submissionViewSchema>;
