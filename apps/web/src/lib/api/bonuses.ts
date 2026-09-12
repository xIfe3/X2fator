import { api } from "../api-client";
import type { DailyBonusStatus } from "../types";

export interface ClaimDailyBonusResult {
  amount: string;
  isMilestone: boolean;
  currentStreak: number;
  longestStreak: number;
  claimDate: string;
  nextClaimAt: string | null;
}

export const bonusesApi = {
  daily: () => api.get<DailyBonusStatus>("/bonuses/daily"),
  claimDaily: () => api.post<ClaimDailyBonusResult>("/bonuses/daily/claim"),
};
