const RECAPTCHA_SITE_KEY = "6LfNQUMtAAAAALqjSZZS8oIFmJQXA-xAv-z03KvH";
const RECAPTCHA_SRC = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;

type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
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
      recaptchaLoader = null; // allow a retry on the next call
      reject(new Error("Failed to load reCAPTCHA"));
    };
    document.head.appendChild(script);
  });
  return recaptchaLoader;
}

/**
 * v3 scores improve the longer the script has been watching the session, so
 * it should run site-wide, not just on pages that need a token. Called once
 * at startup; deferred to idle so it never competes with first paint.
 * Best-effort — a blocked script only surfaces later, when a token is needed.
 */
export function warmRecaptcha(): void {
  const kick = () => void loadRecaptcha().catch(() => {});
  if ("requestIdleCallback" in window) {
    requestIdleCallback(kick, { timeout: 3000 });
  } else {
    setTimeout(kick, 1000);
  }
}

/**
 * Mint a single-use v3 token for `action`. The API verifies the action name
 * server-side, so it must match what the endpoint expects.
 */
export function getRecaptchaToken(action: string): Promise<string> {
  return loadRecaptcha().then(
    (grecaptcha) =>
      new Promise<string>((resolve, reject) => {
        grecaptcha.ready(() => {
          grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve, reject);
        });
      })
  );
}
