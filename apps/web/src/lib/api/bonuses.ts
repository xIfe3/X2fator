import { api } from "../api-client";
import type { DailyBonusStatus } from "../types";

export const bonusesApi = {
  daily: () => api.get<DailyBonusStatus>("/bonuses/daily"),
  claimDaily: () => api.post<DailyBonusStatus>("/bonuses/daily/claim"),
};
