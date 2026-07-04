/** Parse a positive-integer path id, or null if it isn't one (callers → 404).
 * Only plain decimal digits are accepted, so hex/exponent/whitespace forms
 * (`0x10`, `1e3`, ` 5 `) that `Number()` would happily coerce are rejected. */
export const parseId = (raw: string): number | null => {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};
