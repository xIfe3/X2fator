import { api } from "../api-client";
import type { Withdrawal, WithdrawalSettings } from "../types";

export interface FlutterwaveBank {
  code: string;
  name: string;
}

export const withdrawalsApi = {
  create: (dto: {
    walletType: "task" | "referral";
    amount: string;
    bankName: string;
    bankCode?: string;
    accountNumber: string;
    accountName: string;
  }) => api.post<Withdrawal>("/withdrawals", dto),
  list: () => api.get<Withdrawal[]>("/withdrawals"),
  get: (id: string) => api.get<Withdrawal>(`/withdrawals/${id}`),
  settings: () => api.get<WithdrawalSettings>("/withdrawals/settings"),
  banks: () => api.get<FlutterwaveBank[]>("/withdrawals/banks"),
  verifyAccount: (dto: { accountNumber: string; bankCode: string }) =>
    api.post<{ accountName: string }>("/withdrawals/verify-account", dto),
};
