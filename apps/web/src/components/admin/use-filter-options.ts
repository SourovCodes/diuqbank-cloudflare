"use client";

import type { FilterOptions } from "@diuqbank/api-client";
import { useEffect, useState } from "react";

import { request } from "@/lib/api/client";

/**
 * The public lookup entities (departments, courses, semesters, exam types) used to
 * populate admin FK pickers and filters. Served by `GET /filter-options` (no auth).
 */
export function useFilterOptions() {
  const [options, setOptions] = useState<FilterOptions | null>(null);

  useEffect(() => {
    let active = true;
    request<FilterOptions>("/filter-options")
      .then((data) => {
        if (active) setOptions(data);
      })
      .catch(() => {
        /* non-fatal: pickers fall back to empty */
      });
    return () => {
      active = false;
    };
  }, []);

  return options;
}
