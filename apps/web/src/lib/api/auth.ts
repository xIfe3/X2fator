import { api, tokenStore } from "../api-client";
import type { AuthMeResponse, AuthResponse } from "../types";

export const authApi = {
  register: (dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    referralCode?: string;
  }) => api.post<AuthResponse>("/auth/register", dto, { auth: false }),

  login: (dto: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", dto, { auth: false }),

  // Only returns { id, email, roles } — see AuthMeResponse for why.
  me: () => api.get<AuthMeResponse>("/auth/me"),

  logout: () => tokenStore.clear(),
};
