import { api } from "../api-client";
import type { DataBundle, UtilityPurchase } from "../types";

export const utilitiesApi = {
  purchase: (dto: {
    type: "airtime" | "data";
    provider: "mtn" | "airtel" | "glo" | "9mobile";
    phoneNumber: string;
    amount: string;
    productCode?: string;
  }) => api.post<UtilityPurchase>("/utilities/purchase", dto),
  myPurchases: () => api.get<UtilityPurchase[]>("/utilities"),
  dataBundles: (provider: "mtn" | "airtel" | "glo" | "9mobile") =>
    api.get<DataBundle[]>(`/utilities/data-bundles/${provider}`),
};
