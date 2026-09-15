import { api, tokenStore } from "../api-client";
import type { AuthMeResponse, AuthResponse, RegisterInitResponse } from "../types";

export const authApi = {
  register: (dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    referralCode?: string;
    planId: string;
  }) =>
    api.post<RegisterInitResponse>("/auth/register", dto, { auth: false }),

  confirmRegistrationPayment: (paymentReference: string) =>
    api.get<AuthResponse>(
      `/auth/register/confirm/${encodeURIComponent(paymentReference)}`,
      { auth: false },
    ),

  login: (dto: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", dto, { auth: false }),

  // Only returns { id, email, roles } — see AuthMeResponse for why.
  me: () => api.get<AuthMeResponse>("/auth/me"),

  logout: () => tokenStore.clear(),

  // Always resolves with a generic message on the backend, whether or
  // not the email exists — never leak account existence to the client.
  forgotPassword: (email: string) =>
    api.post<{ message: string }>(
      "/auth/forgot-password",
      { email },
      { auth: false },
    ),

  resetPassword: (dto: { token: string; password: string }) =>
    api.post<{ message: string }>("/auth/reset-password", dto, { auth: false }),

  changePassword: (dto: { currentPassword: string; newPassword: string }) =>
    api.post<{ message: string }>("/auth/change-password", dto),
};
