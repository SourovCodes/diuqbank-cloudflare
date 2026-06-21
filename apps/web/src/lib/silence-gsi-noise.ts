let installed = false;

/**
 * Silence the benign `[GSI_LOGGER]: FedCM get() rejects with AbortError` line that
 * Google's One Tap library logs whenever the user dismisses the FedCM prompt (e.g.
 * clicks outside it). The dismissal is expected and sign-in still works — Google's
 * GSI script simply logs the aborted FedCM request, which Next.js's dev overlay then
 * surfaces as a Console Error. There is no public GSI API to suppress it, so we filter
 * that one line out of `console.error` while letting every other error through.
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
      first.includes("FedCM") &&
      first.includes("AbortError")
    ) {
      return; // benign: user dismissed the One Tap prompt
    }
    original(...args);
  };
}
