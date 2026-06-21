"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ApiError,
  getMe,
  signInWithGoogle,
  updateMe,
  uploadProfileImage,
  type AuthUser,
  type ProfileUpdate,
} from "@/lib/api/client";

const TOKEN_KEY = "diuqbank.auth.token";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  authenticateWithGoogle: (idToken: string) => Promise<AuthUser>;
  signOut: () => void;
  updateProfile: (input: ProfileUpdate) => Promise<AuthUser>;
  updateImage: (image: File) => Promise<AuthUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
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
      loading,
      authenticateWithGoogle,
      signOut,
      updateProfile,
      updateImage,
    }),
    [authenticateWithGoogle, loading, signOut, updateImage, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
