import { api } from "../api-client";
import type { PaginatedTransactions, UserWallets } from "../types";

export const walletApi = {
  getWallets: () => api.get<UserWallets>("/wallet"),
  getBalance: () =>
    api.get<{ account: string; task: string; referral: string; total: number }>(
      "/wallet/balance",
    ),
  getTransactions: (
    type: "account" | "task" | "referral" = "account",
    page = 1,
    pageSize = 30,
  ) =>
    api.get<PaginatedTransactions>(
      `/wallet/transactions?type=${type}&page=${page}&pageSize=${pageSize}`,
    ),
};
