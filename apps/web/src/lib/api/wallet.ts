import { api } from "../api-client";
import type { UserWallets, WalletTransaction } from "../types";

export const walletApi = {
  getWallets: () => api.get<UserWallets>("/wallet"),
  getBalance: () => api.get<{ account: string; earnings: string; total: number }>("/wallet/balance"),
  getTransactions: (type: "account" | "earnings" = "account") =>
    api.get<WalletTransaction[]>(`/wallet/transactions?type=${type}`),
};
