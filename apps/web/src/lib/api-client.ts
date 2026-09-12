import type { ApiEnvelope } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const ACCESS_KEY = "2xf_access_token";
const REFRESH_KEY = "2xf_refresh_token";
const USER_KEY = "2xf_user";

export const tokenStore = {
  getAccess: () =>
    typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY),
  getRefresh: () =>
    typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY),
  set(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  // GET /auth/me only returns { id, email, roles } (see AuthMeResponse),
  // so the full profile from /login or /register is cached here and
  // used to rehydrate the session on refresh instead.
  getCachedUser<T>(): T | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setCachedUser(user: unknown) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiRequestError extends Error {
  statusCode: number;
  errors?: unknown;
  constructor(message: string, statusCode: number, errors?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

// Prevents a burst of parallel 401s from firing /auth/refresh multiple times.
let refreshInFlight: Promise<boolean> | null = null;

function accessTokenExpiresSoon(token: string, leewaySeconds = 30) {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return true;
    const payload = JSON.parse(atob(payloadSegment)) as { exp?: number };
    return (
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000) + leewaySeconds
    );
  } catch {
    return true;
  }
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const json = (await res.json()) as ApiEnvelope<{
      accessToken: string;
      refreshToken: string;
    }>;
    if (!res.ok || !json.success) return false;
    tokenStore.set(json.data.accessToken, json.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

function notifySessionExpired() {
  tokenStore.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("session-expired"));
  }
}

interface RequestOptions extends RequestInit {
  auth?: boolean; // defaults to true
  skipRefreshRetry?: boolean;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { auth = true, skipRefreshRetry, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has("Content-Type") && rest.body) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    let token = tokenStore.getAccess();
    if (token && accessTokenExpiresSoon(token)) {
      if (!refreshInFlight)
        refreshInFlight = doRefresh().finally(() => (refreshInFlight = null));
      const refreshed = await refreshInFlight;
      if (!refreshed) {
        notifySessionExpired();
        throw new ApiRequestError("Session expired", 401);
      }
      token = tokenStore.getAccess();
    }
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      signal: rest.signal ?? controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }

  // Access token expired mid-session: refresh once, then retry the call.
  if (res.status === 401 && auth && !skipRefreshRetry) {
    if (!refreshInFlight)
      refreshInFlight = doRefresh().finally(() => (refreshInFlight = null));
    const refreshed = await refreshInFlight;
    if (refreshed) {
      return request<T>(path, { ...options, skipRefreshRetry: true });
    }
    notifySessionExpired();
    throw new ApiRequestError("Session expired", 401);
  }

  let json: ApiEnvelope<T>;
  try {
    json = await res.json();
  } catch {
    console.log("Error!!!!");
    throw new ApiRequestError("Unexpected server response", res.status);
  }

  if (!json.success) {
    console.log("Error", json);
    throw new ApiRequestError(
      json.error.message,
      json.error.statusCode,
      json.error.errors,
    );
  }
  return json.data;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
