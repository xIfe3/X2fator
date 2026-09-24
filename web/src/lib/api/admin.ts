import { api } from "../api-client";
import type {
  Ad,
  AdPricing,
  AdType,
  AdWithRequester,
  AdminDeposit,
  AdminDepositDetail,
  AdminDepositStats,
  AdminSupportTicket,
  AdminSupportTicketDetail,
  AdminWalletDetails,
  AdminUser,
  AdminBonusSettings,
  AdminBonusStats,
  AuditLog,
  Permission,
  Plan,
  RoleWithPermissions,
  SiteContentSections,
  StaffMember,
  SupportMessage,
  Task,
  TaskCompletion,
  Withdrawal,
  WithdrawalSettings,
  WithdrawalStats,
} from "../types";

export interface LedgerEntry {
  id: string;
  type: string;
  direction: "credit" | "debit";
  amount: string;
  balanceBefore?: string;
  balanceAfter?: string;
  reference?: string;
  description?: string | null;
  status?: string;
  createdAt: string;
  walletType: "account" | "task" | "referral";
  userId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
}

export interface LedgerResponse {
  items: LedgerEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminSubscription {
  id: string;
  amountPaid: string;
  dailyTaskLimit: number;
  dailyReward: string;
  referralRewardAmount: string;
  startsAt: string;
  status: "pending" | "active" | "completed" | "cancelled" | "expired";
  createdAt: string;
  planId: string;
  planName: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
}

export interface AdminSubscriptionDetail extends AdminSubscription {
  updatedAt: string;
}

export interface AdminSubscriptionsResponse {
  items: AdminSubscription[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminSubscriptionStats {
  counts: {
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    expired: number;
  };
  totalSubscriptions: number;
  activeCapital: string;
  totalRevenue: string;
}

export interface AdminReferral {
  id: string;
  status: string;
  commissionRate: string;
  totalCommission: string;
  createdAt: string;
  referrerId: string;
  referrerFirstName: string;
  referrerLastName: string;
  referrerEmail: string;
  referredId: string;
  referredFirstName: string;
  referredLastName: string;
  referredEmail: string;
  referredPhone?: string | null;
}

export interface AdminReferralDetail extends AdminReferral {
  updatedAt: string;
  referrerUsername: string;
  referredUsername: string;
  referredJoinedAt: string;
  earnings: {
    id: string;
    amount: string;
    status: string;
    description?: string | null;
    createdAt: string;
  }[];
}

export interface GatewayStatus {
  provider: string;
  baseUrl?: string;
  callbackUrl: string | null;
  secretKeyConfigured: boolean;
  publicKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  fullyConfigured: boolean;
}

export interface AdminPayment {
  id: string;
  provider: "flutterwave" | "manual" | "mock";
  reference: string;
  providerReference: string | null;
  amount: string;
  status:
    | "pending"
    | "processing"
    | "successful"
    | "failed"
    | "cancelled"
    | "refunded";
  createdAt: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
}

export interface AdminPaymentDetail extends AdminPayment {
  rawResponse: string | null;
  metadata: Record<string, unknown> | null;
  updatedAt: string;
}

export interface AdminPaymentsResponse {
  items: AdminPayment[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminPaymentStats {
  counts: {
    pending: number;
    processing: number;
    successful: number;
    failed: number;
    cancelled: number;
    refunded: number;
  };
  total: number;
  successfulVolume: string;
}

export interface FlutterwaveBalance {
  currency: string;
  availableBalance: number;
  ledgerBalance: number;
  fetchedAt: string;
}

export const adminApi = {
  flutterwave: {
    revealBalance: (password: string) =>
      api.post<FlutterwaveBalance>("/admin/flutterwave/balance", { password }),
  },
  deposits: {
    all: () => api.get<AdminDeposit[]>("/admin/deposits"),
    stats: () => api.get<AdminDepositStats>("/admin/deposits/stats"),
    get: (id: string) => api.get<AdminDepositDetail>(`/admin/deposits/${id}`),
    review: (
      id: string,
      body: {
        action: "approve" | "reject";
        providerReference?: string;
        reason?: string;
      },
    ) => api.patch<AdminDeposit>(`/admin/deposits/${id}/review`, body),
  },
  ads: {
    all: () => api.get<Ad[]>("/admin/ads"),
    get: (id: string) => api.get<AdWithRequester>(`/admin/ads/${id}`),
    pricing: () => api.get<AdPricing>("/admin/ads/pricing"),
    updatePricing: (prices: Partial<Record<AdType, string>>) =>
      api.patch<AdPricing>("/admin/ads/pricing", prices),
    review: (
      id: string,
      body: { action: "approve" | "reject"; reward?: string; reason?: string },
    ) => api.patch<Ad>(`/admin/ads/${id}/review`, body),
  },
  users: {
    list: () => api.get<AdminUser[]>("/admin/users"),
    get: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),
    update: (id: string, dto: Partial<AdminUser>) =>
      api.patch<AdminUser>(`/admin/users/${id}`, dto),
    resetPassword: (id: string, password: string) =>
      api.patch<{ message: string }>(`/admin/users/${id}/password`, {
        password,
      }),
    suspend: (id: string) => api.patch<AdminUser>(`/admin/users/${id}/suspend`),
    activate: (id: string) =>
      api.patch<AdminUser>(`/admin/users/${id}/activate`),
    block: (id: string) => api.patch<AdminUser>(`/admin/users/${id}/block`),
    wallets: (id: string) =>
      api.get<AdminWalletDetails>(`/admin/users/${id}/wallets`),
    createAdmin: (dto: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
      currentAdminPassword: string;
    }) => api.post<AdminUser>("/admin/users/admins", dto),
  },
  withdrawals: {
    pending: () => api.get<Withdrawal[]>("/admin/withdrawals/pending"),
    stats: () => api.get<WithdrawalStats>("/admin/withdrawals/stats"),
    get: (id: string) => api.get<Withdrawal>(`/admin/withdrawals/${id}`),
    reject: (id: string, note?: string) =>
      api.patch<Withdrawal>(`/admin/withdrawals/${id}/reject`, { note }),
    review: (id: string, note?: string) =>
      api.patch<Withdrawal>(`/withdrawals/admin/${id}/review`, {
        status: "completed",
        adminNote: note,
      }),
    reconcile: (id: string) =>
      api.patch<Withdrawal>(`/withdrawals/admin/${id}/reconcile`),
    allViaUserController: () => api.get<Withdrawal[]>("/withdrawals/admin/all"),
    all: (status?: string) =>
      api.get<Withdrawal[]>(
        `/admin/withdrawals/all${status ? `?status=${status}` : ""}`,
      ),
    settings: () =>
      api.get<WithdrawalSettings>("/admin/withdrawals/settings"),
    updateSettings: (dto: {
      referralMinimumWithdrawal?: string;
      taskWithdrawalDay?: number;
      autoPayoutEnabled?: boolean;
      withdrawalFeeFlat?: string;
      withdrawalFeePercent?: string;
    }) =>
      api.patch<WithdrawalSettings>("/admin/withdrawals/settings", dto),
  },
  wallets: {
    adjust: (
      userId: string,
      dto: {
        walletType: "account" | "task" | "referral";
        amount: string;
        direction: "credit" | "debit";
        description: string;
      },
    ) => api.post(`/admin/wallets/${userId}/adjust`, dto),
    totals: () =>
      api.get<{
        account: string;
        task: string;
        referral: string;
        total: string;
      }>("/admin/wallets/totals"),
    recentTransactions: (limit?: number) =>
      api.get<LedgerEntry[]>(
        `/admin/wallets/recent-transactions${limit ? `?limit=${limit}` : ""}`,
      ),
    ledger: (filters: {
      walletType?: "account" | "task" | "referral";
      transactionType?: string;
      direction?: "credit" | "debit";
      status?: string;
      userId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "") params.set(key, String(value));
      }
      const qs = params.toString();
      return api.get<LedgerResponse>(
        `/admin/wallets/ledger${qs ? `?${qs}` : ""}`,
      );
    },
  },
  audit: {
    logs: () => api.get<AuditLog[]>("/admin/audit"),
  },
  referrals: {
    stats: () =>
      api.get<{
        totalReferrals: number;
        activeReferrals: number;
        totalCommission: string;
      }>("/admin/referrals/stats"),
    all: () => api.get<AdminReferral[]>("/admin/referrals/all"),
    get: (id: string) =>
      api.get<AdminReferralDetail>(`/admin/referrals/${id}`),
    suspicious: (threshold?: number) =>
      api.get<
        {
          referrerId: string;
          referrerFirstName: string;
          referrerLastName: string;
          referrerEmail: string;
          hourBucket: string;
          signupsInHour: number;
        }[]
      >(`/admin/referrals/suspicious${threshold ? `?threshold=${threshold}` : ""}`),
  },
  notifications: {
    sendToUser: (
      userId: string,
      dto: { title: string; message: string; type?: string },
    ) => api.post(`/admin/notifications/users/${userId}`, dto),
    broadcast: (dto: { title: string; message: string; type?: string }) =>
      api.post<{ sent: number }>("/admin/notifications/broadcast", dto),
  },
  support: {
    tickets: (filters?: { status?: string; priority?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.priority) params.set("priority", filters.priority);
      const qs = params.toString();
      return api.get<AdminSupportTicket[]>(
        `/admin/support/tickets${qs ? `?${qs}` : ""}`,
      );
    },
    ticket: (id: string) =>
      api.get<AdminSupportTicketDetail>(`/admin/support/tickets/${id}`),
    assign: (id: string, staffId: string | null) =>
      api.patch<AdminSupportTicket>(`/admin/support/tickets/${id}/assign`, {
        staffId,
      }),
    setPriority: (id: string, priority: "low" | "medium" | "high" | "urgent") =>
      api.patch<AdminSupportTicket>(`/admin/support/tickets/${id}/priority`, {
        priority,
      }),
    reply: (id: string, message: string) =>
      api.patch<SupportMessage>(`/admin/support/tickets/${id}/reply`, {
        message,
      }),
    resolve: (id: string) =>
      api.patch<AdminSupportTicket>(`/admin/support/tickets/${id}/resolve`),
    close: (id: string) =>
      api.patch<AdminSupportTicket>(`/admin/support/tickets/${id}/close`),
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
    remove: (id: string) => api.delete<{ message: string }>(`/tasks/${id}`),
    bulkRemove: (taskIds: string[]) =>
      api.post<{ deleted: string[]; skipped: { id: string; reason: string }[] }>(
        `/tasks/bulk-delete`,
        { taskIds },
      ),
  },
  siteContent: {
    update: (section: string, content: Record<string, unknown>) =>
      api.patch<SiteContentSections>(`/site-content/admin/${section}`, {
        content,
      }),
  },
  roles: {
    permissions: () => api.get<Permission[]>("/admin/roles/permissions"),
    list: () => api.get<RoleWithPermissions[]>("/admin/roles"),
    create: (dto: {
      name: string;
      description?: string;
      permissionNames: string[];
    }) => api.post<RoleWithPermissions>("/admin/roles", dto),
    setPermissions: (id: string, permissionNames: string[]) =>
      api.patch<{ message: string }>(`/admin/roles/${id}/permissions`, {
        permissionNames,
      }),
    remove: (id: string) =>
      api.delete<{ message: string }>(`/admin/roles/${id}`),
    staff: () => api.get<StaffMember[]>("/admin/roles/staff"),
    assign: (userId: string, roleId: string) =>
      api.post<{ message: string }>(`/admin/roles/staff/${userId}`, {
        roleId,
      }),
    unassign: (userId: string, roleId: string) =>
      api.delete<{ message: string }>(
        `/admin/roles/staff/${userId}/${roleId}`,
      ),
  },
  subscriptions: {
    stats: () => api.get<AdminSubscriptionStats>("/admin/subscriptions/stats"),
    all: (filters: {
      status?: string;
      planId?: string;
      userId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "") params.set(key, String(value));
      }
      const qs = params.toString();
      return api.get<AdminSubscriptionsResponse>(
        `/admin/subscriptions${qs ? `?${qs}` : ""}`,
      );
    },
    get: (id: string) =>
      api.get<AdminSubscriptionDetail>(`/admin/subscriptions/${id}`),
  },
  payments: {
    gatewayStatus: () => api.get<GatewayStatus>("/admin/payments/gateway-status"),
    stats: () => api.get<AdminPaymentStats>("/admin/payments/stats"),
    all: (filters: {
      provider?: string;
      status?: string;
      userId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "") params.set(key, String(value));
      }
      const qs = params.toString();
      return api.get<AdminPaymentsResponse>(
        `/admin/payments${qs ? `?${qs}` : ""}`,
      );
    },
    get: (id: string) => api.get<AdminPaymentDetail>(`/admin/payments/${id}`),
  },
  bonuses: {
    settings: () => api.get<AdminBonusSettings>("/bonuses/admin/daily"),
    updateSettings: (dto: {
      enabled?: boolean;
      amount?: string;
      milestoneAmount?: string;
    }) => api.patch<AdminBonusSettings>("/bonuses/admin/daily", dto),
    stats: () => api.get<AdminBonusStats>("/bonuses/admin/stats"),
  },
};
