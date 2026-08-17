"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "./api/auth";
import { tokenStore } from "./api-client";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    referralCode?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
    if (cached) setUser(cached);

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

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    tokenStore.set(res.accessToken, res.refreshToken);
    tokenStore.setCachedUser(res.user);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (dto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      referralCode?: string;
    }) => {
      const res = await authApi.register(dto);
      console.log("Register response", res)
      tokenStore.set(res.accessToken, res.refreshToken);
      tokenStore.setCachedUser(res.user);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    router.push("/login");
  }, [router]);

  const isAdmin = useMemo(() => !!user?.roles?.includes("admin"), [user]);

  const value = useMemo(
    () => ({ user, isLoading, isAdmin, login, register, logout, refreshUser: loadUser }),
    [user, isLoading, isAdmin, login, register, logout, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
