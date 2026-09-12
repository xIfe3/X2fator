import { api } from "../api-client";
import type {
  Referral,
  ReferralInfo,
  ReferralLeaderboardEntry,
} from "../types";

export const referralsApi = {
  me: () => api.get<ReferralInfo>("/referrals/me"),
  list: () => api.get<Referral[]>("/referrals"),
  earnings: () => api.get<{ total: string }>("/referrals/earnings"),
  leaderboard: () =>
    api.get<ReferralLeaderboardEntry[]>("/referrals/leaderboard"),
};
