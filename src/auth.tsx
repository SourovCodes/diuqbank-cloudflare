import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAuthToken, getMe, setAuthToken } from "./api";
import type { User } from "./types/api";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  // Only "loading" if we have a token to validate; otherwise we're logged out.
  const [isLoading, setIsLoading] = useState(!!getAuthToken());

  useEffect(() => {
    if (!getAuthToken()) return;
    getMe()
      .then(setUser)
      .catch(() => setAuthToken(null)) // token invalid/expired
      .finally(() => setIsLoading(false));
  }, []);

  const value: AuthState = {
    user,
    isLoading,
    login: (token, u) => {
      setAuthToken(token);
      setUser(u);
    },
    logout: () => {
      setAuthToken(null);
      setUser(null);
      queryClient.clear(); // drop any per-user cached data
    },
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
