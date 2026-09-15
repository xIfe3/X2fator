"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { authApi } from "./api/auth";
import { tokenStore } from "./api-client";
import type { RegisterInitResponse, User } from "./types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    referralCode?: string;
    planId: string;
  }) => Promise<RegisterInitResponse>;
  completeRegistration: (paymentReference: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: any }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    // Show the cached profile (from the last login/register response)
    // immediately, then confirm the session and refresh roles against
    // /auth/me in the background — see AuthMeResponse for why that
    // endpoint alone can't rehydrate the full profile.
    const cached = tokenStore.getCachedUser<User>();
    if (cached) {
      setUser(cached);
      setIsLoading(false);
    }

    try {
      const me = await authApi.me();
      setUser((prev) => {
        const base = prev ?? cached;
        if (!base) return prev;
        const merged = { ...base, roles: me.roles };
        tokenStore.setCachedUser(merged);
        return merged;
      });
    } catch {
      if (!cached) setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      router.replace("/login");
    }

    window.addEventListener("session-expired", handleSessionExpired);
    return () =>
      window.removeEventListener("session-expired", handleSessionExpired);
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    tokenStore.set(res.accessToken, res.refreshToken);
    tokenStore.setCachedUser(res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (dto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      referralCode?: string;
      planId: string;
    }) => {
      // No tokens yet — the account stays inactive until the chosen
      // plan's Flutterwave payment succeeds (see completeRegistration).
      return authApi.register(dto);
    },
    [],
  );

  const completeRegistration = useCallback(async (paymentReference: string) => {
    const res = await authApi.confirmRegistrationPayment(paymentReference);
    tokenStore.set(res.accessToken, res.refreshToken);
    tokenStore.setCachedUser(res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    router.push("/login");
  }, [router]);

  const isAdmin = useMemo(() => !!user?.roles?.includes("admin"), [user]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAdmin,
      login,
      register,
      completeRegistration,
      logout,
      refreshUser: loadUser,
    }),
    [
      user,
      isLoading,
      isAdmin,
      login,
      register,
      completeRegistration,
      logout,
      loadUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
