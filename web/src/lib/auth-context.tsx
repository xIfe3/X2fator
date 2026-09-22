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
import type { RegisterResponse, User } from "./types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (dto: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    referralCode?: string;
    planId?: string;
  }) => Promise<RegisterResponse>;
  completeRegistration: (paymentReference: string) => Promise<User>;
  cancelRegistration: (paymentReference: string) => Promise<{ message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (dto: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    gender?: "male" | "female" | "other" | null;
  }) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Log the user out after this long with no interaction. The platform holds
// user funds (deposits/withdrawals), so an abandoned, still-logged-in tab
// is a real risk — better to force a fresh login than leave a session open
// indefinitely on a shared or unattended device.
const IDLE_LOGOUT_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "visibilitychange",
] as const;

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
        const merged = { ...base, roles: me.roles, permissions: me.permissions };
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
      username: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      referralCode?: string;
      planId?: string;
    }) => {
      const res = await authApi.register(dto);

      // When the platform doesn't require a plan purchase, the API
      // activates the account and returns login tokens immediately
      // (same shape as login/completeRegistration) instead of a
      // Flutterwave checkout URL — sign the user in right away.
      if ("accessToken" in res) {
        tokenStore.set(res.accessToken, res.refreshToken);
        tokenStore.setCachedUser(res.user);
        setUser(res.user);
      }

      return res;
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

  const cancelRegistration = useCallback(
    (paymentReference: string) =>
      authApi.cancelRegistrationPayment(paymentReference),
    [],
  );

  const updateProfile = useCallback(
    async (dto: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      gender?: "male" | "female" | "other" | null;
    }) => {
      const updated = await authApi.updateProfile(dto);
      setUser((prev) => {
        const merged = prev ? { ...prev, ...updated } : updated;
        tokenStore.setCachedUser(merged);
        return merged;
      });
      return updated;
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    router.push("/login");
  }, [router]);

  // Idle auto-logout: only runs while a session is actually active, and
  // resets on any user interaction. visibilitychange is included so time
  // spent away in another tab/app counts too, not just an untouched tab.
  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setTimeout>;

    function reset() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        tokenStore.clear();
        setUser(null);
        router.replace("/login?reason=idle");
      }, IDLE_LOGOUT_MS);
    }

    reset();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, reset, { passive: true }),
    );

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, reset),
      );
    };
  }, [user, router]);

  // Any role beyond the default "user" role grants admin console access
  // — a custom staff role (e.g. "Finance Admin") is gated from there on
  // by its actual permissions, same as the literal "admin" role. This
  // must stay in sync with AdminRolesService.listStaff()'s definition
  // of staff on the backend.
  const isAdmin = useMemo(
    () => !!user?.roles?.some((role) => role !== "user"),
    [user],
  );

  const hasPermission = useCallback(
    (permission: string) => !!user?.permissions?.includes(permission),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAdmin,
      hasPermission,
      login,
      register,
      completeRegistration,
      cancelRegistration,
      logout,
      refreshUser: loadUser,
      updateProfile,
    }),
    [
      user,
      isLoading,
      isAdmin,
      hasPermission,
      login,
      register,
      completeRegistration,
      cancelRegistration,
      logout,
      loadUser,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
