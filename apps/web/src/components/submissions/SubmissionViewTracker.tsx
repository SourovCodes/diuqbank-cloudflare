import { useEffect } from "react";
import { recordSubmissionView } from "../../api";

const RECAPTCHA_SITE_KEY = "6LfNQUMtAAAAALqjSZZS8oIFmJQXA-xAv-z03KvH";
const RECAPTCHA_SRC = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;

type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts?: { action?: string }) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

let recaptchaLoader: Promise<Grecaptcha> | null = null;

function loadRecaptcha(): Promise<Grecaptcha> {
  if (window.grecaptcha) return Promise.resolve(window.grecaptcha);
  recaptchaLoader ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RECAPTCHA_SRC;
    script.async = true;
    script.onload = () => {
      if (window.grecaptcha) resolve(window.grecaptcha);
      else reject(new Error("reCAPTCHA failed to initialise"));
    };
    script.onerror = () => {
      recaptchaLoader = null; // allow a retry on the next view
      reject(new Error("Failed to load reCAPTCHA"));
    };
    document.head.appendChild(script);
  });
  return recaptchaLoader;
}

// Submissions already counted this session — a re-visit shouldn't re-count.
const countedIds = new Set<number>();

/**
 * Counts one view for the submission being read. reCAPTCHA v3 mints the
 * single-use token the API requires; it is score-based and fully invisible,
 * so nothing is rendered beyond Google's standard badge.
 */
export function SubmissionViewTracker({
  submissionId,
}: {
  submissionId: number;
}) {
  useEffect(() => {
    if (countedIds.has(submissionId)) return;

    let cancelled = false;

    loadRecaptcha()
      .then(
        (grecaptcha) =>
          new Promise<string>((resolve, reject) => {
            grecaptcha.ready(() => {
              grecaptcha.execute(RECAPTCHA_SITE_KEY).then(resolve, reject);
            });
          })
      )
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
