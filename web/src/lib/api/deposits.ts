import { api } from "../api-client";
import type { Deposit } from "../types";

export const depositsApi = {
  create: (amount: string, provider: "flutterwave") =>
    api.post<{ deposit: Deposit; paymentReference: string }>("/deposits", {
      amount,
      provider,
    }),
  list: () => api.get<Deposit[]>("/deposits"),
  get: (id: string) => api.get<Deposit>(`/deposits/${id}`),
  initializePayment: (depositId: string) =>
    api.post<{
      authorizationUrl?: string;
      reference: string;
      paymentUrl?: string;
    }>(`/payments/initialize/${depositId}`),
  charge: (depositId: string, method: "bank_transfer" | "ussd") =>
    api.post<{
      method: "bank_transfer" | "ussd";
      reference: string;
      amount: string;
      accountNumber?: string;
      bankName?: string;
      accountName?: string;
      expiresAt?: string;
      ussdCode?: string;
    }>(`/payments/charge/${depositId}`, { method }),
  verify: (reference: string) =>
    api.get(`/payments/verify/${encodeURIComponent(reference)}`),
  cancel: (reference: string) =>
    api.patch(`/payments/cancel/${encodeURIComponent(reference)}`),
  expire: (reference: string) =>
    api.patch(`/payments/expire/${encodeURIComponent(reference)}`),
  payments: () => api.get("/payments"),
};
