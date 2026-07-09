import { useEffect } from "react";
import { recordSubmissionView } from "../../api";
import { getRecaptchaToken } from "../../lib/recaptcha";

// Submissions already counted this session — a re-visit shouldn't re-count.
const countedIds = new Set<number>();

/**
 * Counts one view for the submission being read. reCAPTCHA v3 mints the
 * single-use token the API requires; the action name is verified server-side.
 */
export function SubmissionViewTracker({
  submissionId,
}: {
  submissionId: number;
}) {
  useEffect(() => {
    if (countedIds.has(submissionId)) return;

    let cancelled = false;

    getRecaptchaToken("submission_view")
      .then((token) => {
        if (cancelled || countedIds.has(submissionId)) return;
        countedIds.add(submissionId);
        return recordSubmissionView(submissionId, token);
      })
      .catch(() => {
        /* best-effort */
      });

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  return null;
}
