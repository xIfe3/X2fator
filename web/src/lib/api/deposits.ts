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
  verify: (reference: string) =>
    api.get(`/payments/verify/${encodeURIComponent(reference)}`),
  cancel: (reference: string) =>
    api.patch(`/payments/cancel/${encodeURIComponent(reference)}`),
  payments: () => api.get("/payments"),
};
