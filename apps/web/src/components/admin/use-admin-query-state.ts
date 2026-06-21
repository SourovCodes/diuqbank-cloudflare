"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * URL-backed list state for an admin page: `page`, `search`, and arbitrary named
 * filters all live in the querystring, so the page is shareable/back-button-safe and
 * pairs with the URL-driven `CustomPagination`. Changing `search` or a filter resets
 * `page` to 1.
 */
export function useAdminQueryState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const search = searchParams.get("search") ?? "";

  const setParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, String(value));
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const getFilter = useCallback(
    (key: string) => searchParams.get(key) ?? "",
    [searchParams],
  );

  const setSearch = useCallback(
    (value: string) => setParams({ search: value || null, page: null }),
    [setParams],
  );

  const setFilter = useCallback(
    (key: string, value: string | null) =>
      setParams({ [key]: value || null, page: null }),
    [setParams],
  );

  return { page, search, getFilter, setSearch, setFilter };
}
