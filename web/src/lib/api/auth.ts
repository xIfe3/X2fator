import { api, tokenStore } from "../api-client";
import type {
  AuthMeResponse,
  AuthResponse,
  RegisterResponse,
  User,
} from "../types";

export const authApi = {
  register: (dto: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    referralCode?: string;
    planId?: string;
  }) => api.post<RegisterResponse>("/auth/register", dto, { auth: false }),

  checkUsernameAvailability: (username: string) =>
    api.get<{ available: boolean }>(
      `/auth/username-available/${encodeURIComponent(username)}`,
      { auth: false },
    ),

  confirmRegistrationPayment: (paymentReference: string) =>
    api.get<AuthResponse>(
      `/auth/register/confirm/${encodeURIComponent(paymentReference)}`,
      { auth: false },
    ),

  cancelRegistrationPayment: (paymentReference: string) =>
    api.post<{ message: string }>(
      `/auth/register/cancel/${encodeURIComponent(paymentReference)}`,
      undefined,
      { auth: false },
    ),

  login: (dto: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", dto, { auth: false }),

  // Only returns { id, email, roles, permissions } — see AuthMeResponse
  // for why the full profile isn't rehydrated from here.
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

  updateProfile: (dto: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    gender?: "male" | "female" | "other" | null;
  }) => api.patch<User>("/auth/me", dto),

  telegramPromptStatus: () =>
    api.get<{ shouldShow: boolean; channelUrl: string; groupUrl: string }>(
      "/auth/telegram-prompt-status",
    ),
  markTelegramPromptSeen: () =>
    api.post<{ message: string }>("/auth/telegram-prompt-seen"),
  markTelegramJoined: () =>
    api.post<{ message: string }>("/auth/telegram-joined"),
};
