import { api } from "../api-client";
import type { Ad, AdPricing, CreateAdInput } from "../types";

export const adsApi = {
  mine: () => api.get<Ad[]>("/ads/mine"),
  pricing: () => api.get<AdPricing>("/ads/pricing"),
  create: (body: CreateAdInput) => api.post<Ad>("/ads", body),
};
