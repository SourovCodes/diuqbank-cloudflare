/**
 * The system never stores "&" in taxonomy names — always the word "and".
 * Handles both "A & B" and "A&B" -> "A and B" (insert spaces, then collapse).
 */
export const normalizeTaxonomyName = (value: string): string =>
  value.replace(/&/g, " and ").replace(/\s+/g, " ").trim();
