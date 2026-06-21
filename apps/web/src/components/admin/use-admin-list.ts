"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import type {
  ListParams,
  ListResult,
  ResourceClient,
} from "@/lib/api/admin-client";

/**
 * Fetch a paginated admin resource list with the current auth token. Refetches
 * whenever the query params change or `refetch()` is called. setState only ever runs
 * inside async callbacks (or a microtask) to satisfy the React Compiler lint rules.
 */
export function useAdminList<Item, Create, Update>(
  client: ResourceClient<Item, Create, Update>,
  params: ListParams,
) {
  const { token } = useAuth();
  const [data, setData] = useState<ListResult<Item> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  // Stable primitive dep so an inline `params` object doesn't re-trigger every render.
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (!token) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setLoading(true);
    });

    client
      .list(token, JSON.parse(paramsKey) as ListParams)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, token, paramsKey, reloadKey]);

  return {
    items: data?.data ?? [],
    meta: data?.meta ?? null,
    loading,
    error,
    refetch,
  };
}
