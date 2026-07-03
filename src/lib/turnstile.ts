const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Cloudflare Turnstile token via siteverify. Returns `true` only when
 * Cloudflare confirms the token. Fails closed: any network/parse error (or a
 * non-success response) resolves to `false` so a broken verifier can't silently
 * wave traffic through.
 *
 * No `remoteip` is sent — it's optional, and this API's users largely share one
 * IP, so binding a token to an IP would add nothing. Turnstile tokens are
 * single-use; the frontend must obtain a fresh token per view.
 */
export const verifyTurnstile = async (
  secret: string,
  token: string,
): Promise<boolean> => {
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
};
