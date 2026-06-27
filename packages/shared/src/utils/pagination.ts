import { z } from "zod";

import { DEFAULT_PER_PAGE, MAX_PER_PAGE } from "../constants";

/**
 * Shared pagination query fields. Spread into a route's query schema:
 *   z.object({ ...pageFields, departmentId: ... })
 * `page` is 1-based; `perPage` is clamped to [1, MAX_PER_PAGE] (default 20).
 */
export const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PER_PAGE)
    .default(DEFAULT_PER_PAGE),
};

/** Build the `meta` block returned alongside a paginated `data` array. */
export const buildMeta = (page: number, perPage: number, total: number) => ({
  page,
  perPage,
  total,
  totalPages: Math.max(1, Math.ceil(total / perPage)),
});
