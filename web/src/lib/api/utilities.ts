import { api } from "../api-client";
import type { DataBundle, UtilityBeneficiary, UtilityPurchase } from "../types";

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
  listBeneficiaries: () =>
    api.get<UtilityBeneficiary[]>("/utilities/beneficiaries"),
  addBeneficiary: (dto: {
    provider: "mtn" | "airtel" | "glo" | "9mobile";
    phoneNumber: string;
    label?: string;
  }) => api.post<UtilityBeneficiary>("/utilities/beneficiaries", dto),
  deleteBeneficiary: (id: string) =>
    api.delete<{ message: string }>(`/utilities/beneficiaries/${id}`),
};
