import { z } from "zod";

import { normalizeTaxonomyName } from "../utils/normalize-name";

/**
 * Taxonomy-name input field: trim, apply the "&" -> "and" policy, then bound
 * the length (after normalization, since "A & B" grows to "A and B").
 */
export const taxonomyName = (max: number) =>
  z
    .string()
    .trim()
    .transform(normalizeTaxonomyName)
    .pipe(z.string().min(1).max(max));
