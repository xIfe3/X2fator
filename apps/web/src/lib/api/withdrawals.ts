import { api } from "../api-client";
import type { Withdrawal } from "../types";

export const withdrawalsApi = {
  create: (dto: { amount: string; bankName: string; accountNumber: string; accountName: string }) =>
    api.post<Withdrawal>("/withdrawals", dto),
  list: () => api.get<Withdrawal[]>("/withdrawals"),
  get: (id: string) => api.get<Withdrawal>(`/withdrawals/${id}`),
};
