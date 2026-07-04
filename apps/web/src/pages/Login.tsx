import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAuthConfig, googleSignIn } from "../api";
import { loadGoogleIdentity } from "../lib/google";
import { useAuth } from "../auth";

type LocationState = { from?: { pathname: string } };

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from?.pathname ?? "/profile";
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: config, isError: configError } = useQuery({
    queryKey: ["auth-config"],
    queryFn: getAuthConfig,
    staleTime: Infinity,
  });

  useEffect(() => {
    document.title = "Sign in | DIUQBank";
  }, []);

  useEffect(() => {
    if (!config?.googleClientId || !buttonRef.current || user) return;
    let cancelled = false;

    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !buttonRef.current) return;
        google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: async ({ credential }) => {
            setBusy(true);
            setError(null);
            try {
              const res = await googleSignIn(credential);
              login(res.token, res.user);
              navigate(from, { replace: true });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Sign-in failed");
              setBusy(false);
            }
          },
        });
        google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "signin_with",
        });
      })
      .catch((e: Error) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
    };
  }, [config?.googleClientId, user, from, login, navigate]);

  if (user) return <Navigate to={from} replace />;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
      <section className="animate-fade-up w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Welcome back
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Sign in to DIUQBank
        </h1>
        <p className="mx-auto mt-3 max-w-[36ch] text-sm leading-6 text-gray-500 dark:text-gray-400">
          Use your <span className="font-semibold">@diu.edu.bd</span> Google
          account to contribute question papers.
        </p>

        <div className="mt-8 flex min-h-[44px] justify-center">
          {configError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Could not load sign-in configuration. Please try again later.
            </p>
          ) : (
            <div ref={buttonRef} className={busy ? "pointer-events-none opacity-60" : ""} />
          )}
        </div>

        {busy && (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Signing you in…
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
