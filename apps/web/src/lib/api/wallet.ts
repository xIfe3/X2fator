import { api } from "../api-client";
import type { UserWallets, WalletTransaction } from "../types";

export const walletApi = {
  getWallets: () => api.get<UserWallets>("/wallet"),
  getBalance: () =>
    api.get<{ account: string; task: string; referral: string; total: number }>(
      "/wallet/balance",
    ),
  getTransactions: (type: "account" | "task" | "referral" = "account") =>
    api.get<WalletTransaction[]>(`/wallet/transactions?type=${type}`),
};
