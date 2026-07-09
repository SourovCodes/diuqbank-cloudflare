const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

// v3 returns a 0.0–1.0 score instead of a hard pass/fail; 0.5 is Google's
// suggested starting threshold. Views scoring below it are dropped.
const MIN_SCORE = 0.5;

/**
 * Verify a Google reCAPTCHA v3 token via siteverify. Returns `true` only when
 * Google confirms the token, it was minted for `expectedAction`, and its score
 * clears MIN_SCORE. The action check stops tokens minted for other flows from
 * being replayed here. Fails closed: any network/parse error (or a non-success
 * response) resolves to `false` so a broken verifier can't silently wave
 * traffic through.
 *
 * No `remoteip` is sent — it's optional, and this API's users largely share one
 * IP, so binding a token to an IP would add nothing. reCAPTCHA tokens are
 * single-use and expire after ~2 minutes; the frontend must call
 * `grecaptcha.execute()` for a fresh token per view.
 */
export const verifyRecaptcha = async (
  secret: string,
  token: string,
  expectedAction: string,
): Promise<boolean> => {
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
    };
    return (
      data.success === true &&
      data.action === expectedAction &&
      (data.score ?? 0) >= MIN_SCORE
    );
  } catch {
    return false;
  }
};
