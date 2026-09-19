import { api } from "../api-client";
import type { Withdrawal, WithdrawalSettings } from "../types";

export interface FlutterwaveBank {
  code: string;
  name: string;
}

export interface SavedBankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

export const withdrawalsApi = {
  create: (dto: {
    walletType: "task" | "referral";
    amount: string;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    pin: string;
  }) => api.post<Withdrawal>("/withdrawals", dto),
  list: () => api.get<Withdrawal[]>("/withdrawals"),
  get: (id: string) => api.get<Withdrawal>(`/withdrawals/${id}`),
  settings: () => api.get<WithdrawalSettings>("/withdrawals/settings"),
  banks: () => api.get<FlutterwaveBank[]>("/withdrawals/banks"),
  verifyAccount: (dto: { accountNumber: string; bankCode: string }) =>
    api.post<{ accountName: string }>("/withdrawals/verify-account", dto),
  pinStatus: () => api.get<{ isSet: boolean }>("/withdrawals/pin/status"),
  setPin: (pin: string) =>
    api.post<{ message: string }>("/withdrawals/pin", { pin }),
  listAccounts: () => api.get<SavedBankAccount[]>("/withdrawals/accounts"),
  addAccount: (dto: {
    accountNumber: string;
    bankCode: string;
    bankName: string;
  }) => api.post<SavedBankAccount>("/withdrawals/accounts", dto),
  deleteAccount: (id: string) =>
    api.delete<{ message: string }>(`/withdrawals/accounts/${id}`),
  setDefaultAccount: (id: string) =>
    api.patch<{ message: string }>(`/withdrawals/accounts/${id}/default`),
};
