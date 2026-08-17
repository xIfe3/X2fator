import { api } from "../api-client";
import type { AdminUser, AuditLog, KycDocument, Withdrawal } from "../types";

export const adminApi = {
  users: {
    list: () => api.get<AdminUser[]>("/admin/users"),
    get: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),
    suspend: (id: string) => api.patch<AdminUser>(`/admin/users/${id}/suspend`),
    activate: (id: string) => api.patch<AdminUser>(`/admin/users/${id}/activate`),
    block: (id: string) => api.patch<AdminUser>(`/admin/users/${id}/block`),
  },
  kyc: {
    pending: () => api.get<KycDocument[]>("/admin/kyc/pending"),
    approve: (id: string, reviewNote?: string) =>
      api.patch<KycDocument>(`/admin/kyc/${id}/approve`, { reviewNote }),
    reject: (id: string, reviewNote?: string) =>
      api.patch<KycDocument>(`/admin/kyc/${id}/reject`, { reviewNote }),
  },
  withdrawals: {
    pending: () => api.get<Withdrawal[]>("/admin/withdrawals/pending"),
    get: (id: string) => api.get<Withdrawal>(`/admin/withdrawals/${id}`),
    reject: (id: string, note?: string) =>
      api.patch<Withdrawal>(`/admin/withdrawals/${id}/reject`, { note }),
    review: (id: string, note?: string) => api.patch<Withdrawal>(`/withdrawals/admin/${id}/review`, { note }),
    allViaUserController: () => api.get<Withdrawal[]>("/withdrawals/admin/all"),
  },
  wallets: {
    adjust: (
      userId: string,
      dto: { walletType: "account" | "earnings"; amount: string; direction: "credit" | "debit"; description: string },
    ) => api.post(`/admin/wallets/${userId}/adjust`, dto),
  },
  audit: {
    logs: () => api.get<AuditLog[]>("/admin/audit"),
  },
  plans: {
    all: () => api.get(`/plans/admin/all`),
    create: (dto: Record<string, unknown>) => api.post(`/plans`, dto),
    update: (id: string, dto: Record<string, unknown>) => api.patch(`/plans/${id}`, dto),
    remove: (id: string) => api.delete(`/plans/${id}`),
  },
};
