let installed = false;

/**
 * Silence the benign `[GSI_LOGGER]: FedCM get() rejects with …` lines that Google's One
 * Tap library logs when the FedCM prompt can't complete — e.g. the user dismisses it
 * (`AbortError`) or token retrieval fails/times out (`NetworkError`). These are expected
 * and sign-in still works (the "Continue with Google" button is unaffected); GSI just logs
 * the rejected FedCM request, which Next.js's dev overlay then surfaces as a Console Error.
 * There is no public GSI API to suppress it, so we filter those lines out of `console.error`
 * while letting every other error through.
 */
export function silenceGsiNoise() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (
      typeof first === "string" &&
      first.includes("[GSI_LOGGER]") &&
      first.includes("FedCM get() rejects with")
    ) {
      return; // benign: One Tap FedCM prompt was dismissed or couldn't retrieve a token
    }
    original(...args);
  };
}
