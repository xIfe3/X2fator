import { api } from "../api-client";
import type { Plan, Subscription } from "../types";

export const plansApi = {
  listActive: () => api.get<Plan[]>("/plans", { auth: false }),
  get: (id: string) => api.get<Plan>(`/plans/${id}`, { auth: false }),
};

export const subscriptionsApi = {
  purchase: (planId: string) =>
    api.post<Subscription>("/subscriptions", { planId }),
  active: () => api.get<Subscription | null>("/subscriptions/active"),
  list: () => api.get<Subscription[]>("/subscriptions"),
  cancel: (id: string) => api.delete<void>(`/subscriptions/${id}`),
};
