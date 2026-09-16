import { api } from "../api-client";
import type { UtilityPurchase } from "../types";

export const utilitiesApi = {
  purchase: (dto: { type: string; provider: string; amount: string; recipient?: string }) =>
    api.post<UtilityPurchase>("/utilities/purchase", dto),
  myPurchases: () => api.get<UtilityPurchase[]>("/utilities"),
};
