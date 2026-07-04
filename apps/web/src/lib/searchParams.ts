export function parsePositiveIntParam(
  params: URLSearchParams,
  key: string,
  fallback = 1
): number {
  const raw = params.get(key);
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return fallback;

  return Math.min(value, 10_000);
}
