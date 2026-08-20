import { api } from "../api-client";
import type {
  AdminDeposit,
  AdminWalletDetails,
  AdminUser,
  AuditLog,
  KycDocument,
  Plan,
  SiteContentSections,
  Task,
  TaskCompletion,
  Withdrawal,
} from "../types";

export const adminApi = {
  deposits: {
    all: () => api.get<AdminDeposit[]>("/admin/deposits"),
    review: (
      id: string,
      body: {
        action: "approve" | "reject";
        providerReference?: string;
        reason?: string;
      },
    ) => api.patch<AdminDeposit>(`/admin/deposits/${id}/review`, body),
  },
  users: {
    list: () => api.get<AdminUser[]>("/admin/users"),
    get: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),
    suspend: (id: string) => api.patch<AdminUser>(`/admin/users/${id}/suspend`),
    activate: (id: string) =>
      api.patch<AdminUser>(`/admin/users/${id}/activate`),
    block: (id: string) => api.patch<AdminUser>(`/admin/users/${id}/block`),
    wallets: (id: string) =>
      api.get<AdminWalletDetails>(`/admin/users/${id}/wallets`),
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
    review: (id: string, note?: string) =>
      api.patch<Withdrawal>(`/withdrawals/admin/${id}/review`, { note }),
    allViaUserController: () => api.get<Withdrawal[]>("/withdrawals/admin/all"),
  },
  wallets: {
    adjust: (
      userId: string,
      dto: {
        walletType: "account" | "earnings";
        amount: string;
        direction: "credit" | "debit";
        description: string;
      },
    ) => api.post(`/admin/wallets/${userId}/adjust`, dto),
  },
  audit: {
    logs: () => api.get<AuditLog[]>("/admin/audit"),
  },
  plans: {
    all: () => api.get<Plan[]>(`/plans/admin/all`),
    create: (dto: Partial<Plan>) => api.post<Plan>(`/plans`, dto),
    update: (id: string, dto: Partial<Plan>) =>
      api.patch<Plan>(`/plans/${id}`, dto),
    remove: (id: string) => api.delete<void>(`/plans/${id}`),
  },
  tasks: {
    all: () => api.get<Task[]>(`/tasks/admin/all`),
    create: (dto: Partial<Task>) => api.post<Task>(`/tasks`, dto),
    update: (id: string, dto: Partial<Task>) =>
      api.patch<Task>(`/tasks/${id}`, dto),
    pendingCompletions: () =>
      api.get<TaskCompletion[]>(`/tasks/admin/completions/pending`),
    approveCompletion: (id: string, note?: string) =>
      api.patch<TaskCompletion>(`/tasks/admin/completions/${id}/approve`, {
        note,
      }),
    rejectCompletion: (id: string, note?: string) =>
      api.patch<TaskCompletion>(`/tasks/admin/completions/${id}/reject`, {
        note,
      }),
  },
  siteContent: {
    update: (section: string, content: Record<string, unknown>) =>
      api.patch<SiteContentSections>(`/site-content/admin/${section}`, {
        content,
      }),
  },
};
