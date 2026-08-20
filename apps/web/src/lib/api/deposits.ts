import { api } from "../api-client";
import type { Deposit, DepositProvider } from "../types";

export const depositsApi = {
  create: (amount: string, provider: DepositProvider) =>
    api.post<{ deposit: Deposit; paymentReference: string }>("/deposits", {
      amount,
      provider,
    }),
  list: () => api.get<Deposit[]>("/deposits"),
  get: (id: string) => api.get<Deposit>(`/deposits/${id}`),
  initializePayment: (depositId: string) =>
    api.post<{ authorizationUrl?: string; reference: string }>(
      `/payments/initialize/${depositId}`,
    ),
};
