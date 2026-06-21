"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { BookOpen, CheckCircle2, Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

export function SignInPage() {
  const { user, loading, googleReady, googleSigningIn, googleError, renderGoogleButton } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = googleButtonRef.current;
    if (!googleReady || !parent || user) return;

    parent.replaceChildren();
    renderGoogleButton(parent);
  }, [googleReady, renderGoogleButton, user]);

  return (
    <div className="container mx-auto flex w-full flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="size-5" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in to DIU QBank</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Continue with your DIU Google account to access your profile.
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
              <div className="relative min-h-11 overflow-hidden">
                <div ref={googleButtonRef} className={googleSigningIn ? "pointer-events-none opacity-50" : ""} />
                {!googleReady || googleSigningIn ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-md border bg-background text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />{googleSigningIn ? "Signing in…" : googleError ?? "Loading Google sign-in…"}</div>
                ) : null}
              </div>
              <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
                Only <span className="font-medium text-foreground">@diu.edu.bd</span> email addresses can sign in.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
