"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiRequestError } from "@/lib/api-client";

/**
 * Minimal client-side query hook. This is a learning project, not a
 * product with heavy concurrent cache needs — a full library like
 * react-query would be overkill here. Swap it in later if the app
 * grows enough to need request de-duping, background refetch, etc.
 */
export function useApiQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetcher()
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load data."))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, isLoading, refetch: load, setData };
}
