"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { getAuthConfig } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }): void;
          renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
        };
      };
    };
  }
}

export function SignInPage() {
  const router = useRouter();
  const { user, loading, authenticateWithGoogle } = useAuth();
  const [googleReady, setGoogleReady] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getAuthConfig()
      .then((config) => {
        if (active) setGoogleClientId(config.googleClientId);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadFailed(true);
        toast.error(error instanceof Error ? error.message : "Could not load Google sign-in");
      });
    return () => {
      active = false;
    };
  }, []);

  const finishSignIn = useCallback(
    async (idToken: string) => {
      setSigningIn(true);
      try {
        await authenticateWithGoogle(idToken);
        toast.success("Welcome to DIU Question Bank");
        router.replace("/profile");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Sign-in failed");
      } finally {
        setSigningIn(false);
      }
    },
    [authenticateWithGoogle, router],
  );

  useEffect(() => {
    const parent = googleButtonRef.current;
    if (!googleReady || !googleClientId || !parent || !window.google || user) return;

    parent.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        if (response.credential) void finishSignIn(response.credential);
      },
    });
    window.google.accounts.id.renderButton(parent, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      width: Math.min(Math.floor(parent.getBoundingClientRect().width), 360),
    });
  }, [finishSignIn, googleClientId, googleReady, user]);

  return (
    <div className="container mx-auto flex w-full flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="size-5" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in to DIU QBank</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Continue with Google to access your profile.
          </p>
        </div>

        <div className="mt-7">
          {loading ? (
            <div className="flex h-11 items-center justify-center rounded-md border text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />Checking your account…
            </div>
          ) : user ? (
            <>
              <p className="mb-4 truncate text-center text-sm text-muted-foreground">Signed in as {user.email}</p>
              <Button className="w-full" asChild><Link href="/profile"><CheckCircle2 />Go to profile</Link></Button>
            </>
          ) : (
            <>
              <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setGoogleReady(true)} onReady={() => setGoogleReady(true)} />
              <div className="relative min-h-11 overflow-hidden">
                <div ref={googleButtonRef} className={signingIn ? "pointer-events-none opacity-50" : ""} />
                {(!googleReady || !googleClientId || signingIn) && !loadFailed ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-md border bg-background text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />{signingIn ? "Signing in…" : "Loading Google sign-in…"}</div>
                ) : null}
                {loadFailed ? <div className="flex h-11 items-center justify-center rounded-md border px-3 text-center text-sm text-destructive">Google sign-in is unavailable. Please reload.</div> : null}
              </div>
              <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
                We only use your Google email to identify your account.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
