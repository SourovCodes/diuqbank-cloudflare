// Minimal typings + loader for Google Identity Services (the sign-in button).
type CredentialResponse = { credential: string };

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: Record<string, unknown>
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const SRC = "https://accounts.google.com/gsi/client";
let loader: Promise<GoogleIdentity> | null = null;

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    if (window.google) return resolve(window.google);
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.defer = true;
    script.onload = () =>
      window.google
        ? resolve(window.google)
        : reject(new Error("Google sign-in failed to initialize"));
    script.onerror = () => {
      loader = null; // allow a retry
      reject(new Error("Could not load Google sign-in"));
    };
    document.head.appendChild(script);
  });
  return loader;
}
