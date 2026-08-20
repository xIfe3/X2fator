import { api } from "../api-client";
import type { SiteContentSections } from "../types";

export const siteContentApi = {
  get: () => api.get<SiteContentSections>("/site-content"),
};
