"use client";

import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  ApiError,
  getAuthConfig,
  getMe,
  signInWithGoogle,
  updateMe,
  uploadProfileImage,
  type AuthUser,
  type ProfileUpdate,
} from "@/lib/api/client";
import { silenceGsiNoise } from "@/lib/silence-gsi-noise";

// Filter the benign FedCM AbortError that GSI logs when One Tap is dismissed.
silenceGsiNoise();

const TOKEN_KEY = "diuqbank.auth.token";

type GoogleCredentialResponse = { credential?: string };

type PromptMomentNotification = {
  isDismissedMoment(): boolean;
  getDismissedReason(): string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: {
            client_id: string;
            hd?: string;
            context?: "signin" | "signup" | "use";
            itp_support?: boolean;
            use_fedcm_for_prompt?: boolean;
            callback: (response: GoogleCredentialResponse) => void;
          }): void;
          prompt(listener?: (notification: PromptMomentNotification) => void): void;
          cancel(): void;
          disableAutoSelect(): void;
          renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
        };
      };
    };
  }
}

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  googleReady: boolean;
  googleSigningIn: boolean;
  googleError: string | null;
  renderGoogleButton: (parent: HTMLElement) => void;
  authenticateWithGoogle: (idToken: string) => Promise<AuthUser>;
  signOut: () => void;
  updateProfile: (input: ProfileUpdate) => Promise<AuthUser>;
  updateImage: (image: File) => Promise<AuthUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [suppressOneTap, setSuppressOneTap] = useState(false);
  const googleInitializedRef = useRef(false);
  const oneTapPromptedRef = useRef(false);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const signOut = useCallback(() => {
    window.google?.accounts.id.cancel();
    window.google?.accounts.id.disableAutoSelect();
    localStorage.removeItem(TOKEN_KEY);
    oneTapPromptedRef.current = true;
    setSuppressOneTap(true);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    getAuthConfig()
      .then(({ googleClientId: clientId }) => {
        if (active) setGoogleClientId(clientId);
      })
      .catch(() => {
        if (active) setGoogleError("Google sign-in is temporarily unavailable");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      queueMicrotask(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }

    getMe(savedToken)
      .then(({ user: savedUser }) => {
        if (!active) return;
        setToken(savedToken);
        setUser(savedUser);
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const authenticateWithGoogle = useCallback(async (idToken: string) => {
    const result = await signInWithGoogle(idToken);
    localStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) return;

      setGoogleSigningIn(true);
      try {
        await authenticateWithGoogle(response.credential);
        toast.success("Welcome to DIU Question Bank");
        if (pathnameRef.current === "/sign-in") router.replace("/profile");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Sign-in failed");
      } finally {
        setGoogleSigningIn(false);
      }
    },
    [authenticateWithGoogle, router],
  );

  useEffect(() => {
    if (
      !googleScriptReady ||
      !googleClientId ||
      !window.google ||
      googleInitializedRef.current
    ) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      hd: "diu.edu.bd",
      context: "signin",
      itp_support: true,
      use_fedcm_for_prompt: true,
      callback: (response) => void handleGoogleCredential(response),
    });
    googleInitializedRef.current = true;
    setGoogleReady(true);
  }, [googleClientId, googleScriptReady, handleGoogleCredential]);

  useEffect(() => {
    if (
      !googleReady ||
      loading ||
      user ||
      suppressOneTap ||
      oneTapPromptedRef.current ||
      !window.google
    ) {
      return;
    }

    oneTapPromptedRef.current = true;
    // Under FedCM the browser owns the prompt UI; only the dismissed-moment methods
    // remain supported. The oneTapPromptedRef guard already prevents re-prompting.
    window.google.accounts.id.prompt((notification) => {
      if (notification.isDismissedMoment()) {
        setSuppressOneTap(true);
      }
    });
  }, [googleReady, loading, suppressOneTap, user]);

  const renderGoogleButton = useCallback((parent: HTMLElement) => {
    if (!googleInitializedRef.current || !window.google) return;

    window.google.accounts.id.renderButton(parent, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      width: Math.min(Math.floor(parent.getBoundingClientRect().width), 360),
    });
  }, []);

  const updateProfile = useCallback(
    async (input: ProfileUpdate) => {
      if (!token) throw new ApiError("Please sign in first", 401);
      const result = await updateMe(token, input);
      setUser(result.user);
      return result.user;
    },
    [token],
  );

  const updateImage = useCallback(
    async (image: File) => {
      if (!token) throw new ApiError("Please sign in first", 401);
      const result = await uploadProfileImage(token, image);
      setUser(result.user);
      return result.user;
    },
    [token],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      googleReady,
      googleSigningIn,
      googleError,
      renderGoogleButton,
      authenticateWithGoogle,
      signOut,
      updateProfile,
      updateImage,
    }),
    [
      authenticateWithGoogle,
      googleError,
      googleReady,
      googleSigningIn,
      loading,
      renderGoogleButton,
      signOut,
      token,
      updateImage,
      updateProfile,
      user,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleScriptReady(true)}
        onReady={() => setGoogleScriptReady(true)}
        onError={() => setGoogleError("Google sign-in is temporarily unavailable")}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
