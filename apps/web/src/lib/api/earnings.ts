import { api } from "../api-client";
import type { Earning, EarningSource, EarningsSummary } from "../types";

export const earningsApi = {
  list: () => api.get<Earning[]>("/earnings"),
  summary: () => api.get<EarningsSummary>("/earnings/summary"),
  bySource: (source: EarningSource) => api.get<Earning[]>(`/earnings/source/${source}`),
};
